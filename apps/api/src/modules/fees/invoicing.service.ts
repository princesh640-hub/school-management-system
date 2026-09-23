import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { FinancialCalculatorService } from './financial-calculator.service';
import {
  GenerateSingleInvoiceDto,
} from './dto/phase4g-fees.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly calculator: FinancialCalculatorService,
  ) {}

  /**
   * Generates collision-safe sequential invoice numbers: INV-YYYY-XXXXX
   */
  async generateSequentialInvoiceNumber(organizationId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Count invoices in this year for the organization to generate next sequence
    const where: any = {
      invoiceNumber: { startsWith: prefix },
    };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const count = await this.prisma.feeInvoice.count({ where });
    const nextSeq = String(count + 1).padStart(5, '0');
    const invoiceNumber = `${prefix}${nextSeq}`;

    // Verify uniqueness just in case of concurrent execution
    const exists = await this.prisma.feeInvoice.findUnique({
      where: { invoiceNumber },
    });
    if (!exists) {
      return invoiceNumber;
    }

    // Fallback if collision
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Bulk generate invoices for a list of students based on fee structure.
   * Checks for student-specific overrides and fee discounts.
   */
  async generateInvoices(user: CurrentUserPayload | any, dto: GenerateInvoicesDto) {
    const structure = await this.prisma.feeStructure.findUnique({
      where: { id: dto.feeStructureId },
      include: { feeCategory: true },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const orgId = user?.organizationId || structure.organizationId;
    const campusId = structure.campusId;
    const dueDate = new Date(dto.dueDate);
    const createdInvoices: any[] = [];

    for (const studentId of dto.studentIds) {
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: studentId },
      });
      if (!student) continue;

      // Check student-specific assignment / override
      const assignment = await this.prisma.studentFeeAssignment.findUnique({
        where: {
          studentId_feeStructureId_academicYearId: {
            studentId,
            feeStructureId: dto.feeStructureId,
            academicYearId: dto.academicYearId,
          },
        },
        include: { feeDiscount: true },
      });

      let baseAmount = Number(structure.amount);
      if (assignment?.customAmount !== null && assignment?.customAmount !== undefined) {
        baseAmount = Number(assignment.customAmount);
      }

      let discountAmount = 0;
      if (assignment?.feeDiscount) {
        discountAmount = this.calculator.calculateDiscount(
          baseAmount,
          assignment.feeDiscount.discountType as any,
          Number(assignment.feeDiscount.value),
        );
      }

      const netAmount = this.calculator.roundMoney(Math.max(0, baseAmount - discountAmount));
      const invoiceNumber = await this.generateSequentialInvoiceNumber(orgId);

      const invoice = await this.prisma.feeInvoice.create({
        data: {
          organizationId: orgId,
          campusId,
          academicYearId: dto.academicYearId,
          studentId,
          feeStructureId: dto.feeStructureId,
          invoiceNumber,
          amount: netAmount,
          paidAmount: 0,
          dueDate,
          status: InvoiceStatus.PENDING,
          items: {
            create: [
              {
                title: structure.name,
                description: structure.description || undefined,
                amount: baseAmount,
                quantity: 1,
                totalAmount: baseAmount,
              },
            ],
          },
        },
        include: { items: true },
      });

      createdInvoices.push(invoice);
    }

    if (user && createdInvoices.length > 0) {
      await this.auditService.log({
        organizationId: orgId,
        userId: user.id || 'system',
        action: 'BULK_GENERATE',
        resource: 'FEE_INVOICE',
        resourceId: createdInvoices[0].id,
        details: { count: createdInvoices.length, feeStructureId: dto.feeStructureId },
      });
    }

    return {
      message: `Generated ${createdInvoices.length} invoices successfully`,
      generatedCount: createdInvoices.length,
      invoices: createdInvoices.map((inv) => ({
        ...inv,
        amount: Number(inv.amount),
        paidAmount: Number(inv.paidAmount),
        balanceDue: Number(inv.amount) - Number(inv.paidAmount),
      })),
    };
  }

  /**
   * Generate an itemized single invoice for an individual student.
   */
  async generateSingleInvoice(user: CurrentUserPayload, dto: GenerateSingleInvoiceDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const structure = await this.prisma.feeStructure.findUnique({
      where: { id: dto.feeStructureId },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    let subtotal = 0;
    const itemsToCreate = [];

    if (dto.lineItems && dto.lineItems.length > 0) {
      for (const item of dto.lineItems) {
        const qty = item.quantity || 1;
        const lineTotal = this.calculator.roundMoney(item.amount * qty);
        subtotal += lineTotal;
        itemsToCreate.push({
          title: item.title,
          amount: this.calculator.roundMoney(item.amount),
          quantity: qty,
          totalAmount: lineTotal,
        });
      }
    } else {
      subtotal = Number(structure.amount);
      itemsToCreate.push({
        title: structure.name,
        amount: subtotal,
        quantity: 1,
        totalAmount: subtotal,
      });
    }

    const { netTotal, discountAmount } = this.calculator.computeInvoiceTotal({
      subtotal,
      discountAmount: dto.discountAmount || 0,
    });

    const invoiceNumber = await this.generateSequentialInvoiceNumber(user.organizationId);

    const invoice = await this.prisma.feeInvoice.create({
      data: {
        organizationId: user.organizationId,
        campusId: student.campusId || structure.campusId,
        academicYearId: dto.academicYearId,
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        invoiceNumber,
        amount: netTotal,
        paidAmount: 0,
        dueDate: new Date(dto.dueDate),
        status: InvoiceStatus.PENDING,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: true,
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        feeStructure: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'FEE_INVOICE',
      resourceId: invoice.id,
      details: { invoiceNumber, studentId: dto.studentId, amount: netTotal, discountAmount },
    });

    return {
      ...invoice,
      amount: Number(invoice.amount),
      paidAmount: Number(invoice.paidAmount),
      balanceDue: Number(invoice.amount) - Number(invoice.paidAmount),
      items: invoice.items.map((i) => ({
        ...i,
        amount: Number(i.amount),
        totalAmount: Number(i.totalAmount),
      })),
    };
  }

  /**
   * Query invoices with multi-criteria filters, pagination, and balance calculations.
   */
  async getInvoices(filters: {
    studentId?: string;
    status?: InvoiceStatus;
    academicYearId?: string;
    campusId?: string;
    page?: number;
    limit?: number;
  }) {
    const { studentId, status, academicYearId, campusId, page = 1, limit = 20 } = filters;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (academicYearId) where.academicYearId = academicYearId;
    if (campusId) where.campusId = campusId;

    const [total, items] = await Promise.all([
      this.prisma.feeInvoice.count({ where }),
      this.prisma.feeInvoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          feeStructure: true,
          academicYear: true,
          items: true,
          _count: {
            select: { payments: true, adjustments: true },
          },
        },
      }),
    ]);

    return {
      items: items.map((inv) => {
        const amt = Number(inv.amount);
        const paid = Number(inv.paidAmount);
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          studentId: inv.studentId,
          studentName: inv.student?.user ? `${inv.student.user.firstName} ${inv.student.user.lastName}` : 'Unknown Student',
          admissionNumber: inv.student?.admissionNumber || '',
          feeStructureName: inv.feeStructure?.name || 'Standard Fee',
          amount: amt,
          paidAmount: paid,
          balanceDue: this.calculator.roundMoney(amt - paid),
          dueDate: inv.dueDate,
          status: inv.status,
          paymentsCount: inv._count?.payments || 0,
          adjustmentsCount: inv._count?.adjustments || 0,
          itemsCount: inv.items?.length || 0,
          createdAt: inv.createdAt,
        };
      }),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Get complete invoice details including line items, payments, refunds, and adjustments.
   */
  async getInvoiceById(id: string) {
    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            guardianLinks: {
              include: {
                guardian: {
                  include: {
                    user: { select: { firstName: true, lastName: true, email: true, phone: true } },
                  },
                },
              },
            },
          },
        },
        feeStructure: {
          include: { feeCategory: true },
        },
        academicYear: true,
        items: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            refunds: true,
          },
        },
        adjustments: {
          orderBy: { createdAt: 'desc' },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Fee invoice not found');

    const amt = Number(invoice.amount);
    const paid = Number(invoice.paidAmount);

    return {
      ...invoice,
      amount: amt,
      paidAmount: paid,
      balanceDue: this.calculator.roundMoney(amt - paid),
      items: invoice.items.map((it) => ({
        ...it,
        amount: Number(it.amount),
        totalAmount: Number(it.totalAmount),
      })),
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        refunds: p.refunds?.map((r) => ({
          ...r,
          amount: Number(r.amount),
        })),
      })),
      adjustments: invoice.adjustments.map((a) => ({
        ...a,
        amount: Number(a.amount),
      })),
      installments: invoice.installments.map((inst) => ({
        ...inst,
        amount: Number(inst.amount),
        paidAmount: Number(inst.paidAmount),
      })),
    };
  }

  /**
   * Void / cancel an unpaid invoice with reason tracking and audit trail.
   */
  async voidInvoice(user: CurrentUserPayload, id: string, reason: string) {
    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (Number(invoice.paidAmount) > 0) {
      throw new BadRequestException('Cannot void an invoice with recorded payments. Please process refunds first.');
    }

    const updated = await this.prisma.feeInvoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.VOID,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'VOID_INVOICE',
      resource: 'FEE_INVOICE',
      resourceId: id,
      details: { invoiceNumber: invoice.invoiceNumber, reason },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
      paidAmount: Number(updated.paidAmount),
    };
  }

  /**
   * Scans overdue invoices and applies late fees based on fee schedules.
   */
  async applyLateFees(organizationId: string, campusId?: string) {
    const now = new Date();
    const where: any = {
      dueDate: { lt: now },
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
    };
    if (organizationId) where.organizationId = organizationId;
    if (campusId) where.campusId = campusId;

    const overdueInvoices = await this.prisma.feeInvoice.findMany({
      where,
      include: {
        feeStructure: {
          include: { feeSchedules: true },
        },
        items: true,
      },
    });

    let updatedCount = 0;

    for (const inv of overdueInvoices) {
      const schedule = inv.feeStructure?.feeSchedules?.[0];
      if (!schedule || !schedule.lateFeeValue || Number(schedule.lateFeeValue) <= 0) {
        // Mark overdue without fine
        await this.prisma.feeInvoice.update({
          where: { id: inv.id },
          data: { status: InvoiceStatus.OVERDUE },
        });
        updatedCount++;
        continue;
      }

      const fine = this.calculator.calculateLateFee({
        baseAmount: Number(inv.amount),
        dueDate: inv.dueDate,
        currentDate: now,
        lateFeeType: schedule.lateFeeType as any,
        lateFeeValue: Number(schedule.lateFeeValue),
        graceDays: schedule.graceDays,
        maxLateFee: schedule.maxLateFee ? Number(schedule.maxLateFee) : null,
      });

      if (fine > 0) {
        // Check if late fine already added to items
        const hasFineItem = inv.items.some((i) => i.title.toLowerCase().includes('late fee') || i.title.toLowerCase().includes('late fine'));
        if (!hasFineItem) {
          const newTotal = this.calculator.roundMoney(Number(inv.amount) + fine);
          await this.prisma.feeInvoice.update({
            where: { id: inv.id },
            data: {
              amount: newTotal,
              status: InvoiceStatus.OVERDUE,
              items: {
                create: {
                  title: 'Late Payment Fee',
                  amount: fine,
                  quantity: 1,
                  totalAmount: fine,
                },
              },
            },
          });
          updatedCount++;
        }
      } else {
        await this.prisma.feeInvoice.update({
          where: { id: inv.id },
          data: { status: InvoiceStatus.OVERDUE },
        });
        updatedCount++;
      }
    }

    return {
      message: `Processed ${overdueInvoices.length} overdue invoices, updated ${updatedCount}.`,
      processed: overdueInvoices.length,
      updated: updatedCount,
    };
  }
}
