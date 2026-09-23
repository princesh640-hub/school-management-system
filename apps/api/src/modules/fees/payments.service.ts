import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { FinancialCalculatorService } from './financial-calculator.service';
import {
  ProcessPaymentDto,
  OpenCashierShiftDto,
  CloseCashierShiftDto,
} from './dto/phase4g-fees.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly calculator: FinancialCalculatorService,
  ) {}

  /**
   * Generates sequential receipt numbers: RCP-YYYY-XXXXX
   */
  async generateSequentialReceiptNumber(organizationId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;

    const where: any = {
      receiptNumber: { startsWith: prefix },
    };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const count = await this.prisma.paymentTransaction.count({ where });
    const nextSeq = String(count + 1).padStart(5, '0');
    const receiptNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.paymentTransaction.findUnique({
      where: { receiptNumber },
    });
    if (!exists) {
      return receiptNumber;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Record payment with idempotency protection, concurrency safety,
   * invoice balance update, and cashier shift link.
   */
  async recordPayment(
    user: CurrentUserPayload | any,
    dto: RecordPaymentDto | ProcessPaymentDto,
  ) {
    const paymentAmount = this.calculator.roundMoney(dto.amount);
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const extendedDto = dto as ProcessPaymentDto;

    // Idempotency check
    if (extendedDto.idempotencyKey) {
      const existing = await this.prisma.paymentTransaction.findUnique({
        where: { idempotencyKey: extendedDto.idempotencyKey },
        include: { feeInvoice: true },
      });

      if (existing) {
        this.logger.warn(`Idempotent payment re-delivery for key: ${extendedDto.idempotencyKey}`);
        const inv = existing.feeInvoice;
        return {
          payment: {
            ...existing,
            amount: Number(existing.amount),
          },
          invoice: {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            paidAmount: Number(inv.paidAmount),
            balanceDue: this.calculator.roundMoney(Number(inv.amount) - Number(inv.paidAmount)),
          },
        };
      }
    }

    // Determine cashier shift if user has one open
    let cashierShiftId = extendedDto.cashierShiftId || null;
    if (!cashierShiftId && user?.id) {
      const openShift = await this.prisma.cashierShift.findFirst({
        where: {
          cashierId: user.id,
          status: 'OPEN',
        },
      });
      if (openShift) {
        cashierShiftId = openShift.id;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findUnique({
        where: { id: dto.feeInvoiceId },
      });

      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Invoice is already fully paid');
      }
      if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Cannot pay against a cancelled or void invoice');
      }

      const currentPaid = Number(invoice.paidAmount);
      const totalAmount = Number(invoice.amount);
      const newPaidAmount = this.calculator.roundMoney(currentPaid + paymentAmount);

      let nextStatus = invoice.status;
      if (newPaidAmount >= totalAmount) {
        nextStatus = InvoiceStatus.PAID;
      } else if (newPaidAmount > 0) {
        nextStatus = InvoiceStatus.PARTIAL;
      }

      const receiptNumber = await this.generateSequentialReceiptNumber(invoice.organizationId || user?.organizationId);

      const payment = await tx.paymentTransaction.create({
        data: {
          organizationId: invoice.organizationId || user?.organizationId,
          campusId: invoice.campusId,
          feeInvoiceId: dto.feeInvoiceId,
          amount: paymentAmount,
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber || null,
          receiptNumber,
          remarks: dto.remarks || null,
          idempotencyKey: extendedDto.idempotencyKey || null,
          cashierShiftId,
          createdBy: user?.id || 'system',
        },
      });

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: dto.feeInvoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: nextStatus,
        },
      });

      if (user && invoice.organizationId) {
        await this.auditService.log({
          organizationId: invoice.organizationId,
          userId: user.id || 'system',
          action: 'PAYMENT_COLLECTED',
          resource: 'PAYMENT_TRANSACTION',
          resourceId: payment.id,
          details: {
            receiptNumber,
            invoiceNumber: invoice.invoiceNumber,
            amount: paymentAmount,
            paymentMethod: dto.paymentMethod,
            newPaidAmount,
          },
        });
      }

      return {
        payment: {
          ...payment,
          amount: Number(payment.amount),
        },
        invoice: {
          id: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          status: updatedInvoice.status,
          paidAmount: Number(updatedInvoice.paidAmount),
          balanceDue: this.calculator.roundMoney(Number(updatedInvoice.amount) - Number(updatedInvoice.paidAmount)),
        },
      };
    });
  }

  /**
   * List payments with filtering and pagination
   */
  async getPayments(filters: {
    feeInvoiceId?: string;
    campusId?: string;
    cashierShiftId?: string;
    paymentMethod?: PaymentMethod;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      feeInvoiceId,
      campusId,
      cashierShiftId,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (feeInvoiceId) where.feeInvoiceId = feeInvoiceId;
    if (campusId) where.campusId = campusId;
    if (cashierShiftId) where.cashierShiftId = cashierShiftId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          feeInvoice: {
            include: {
              student: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
          refunds: true,
        },
      }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        amount: Number(p.amount),
        feeInvoice: p.feeInvoice
          ? {
              ...p.feeInvoice,
              amount: Number(p.feeInvoice.amount),
              paidAmount: Number(p.feeInvoice.paidAmount),
            }
          : null,
        refunds: p.refunds?.map((r) => ({
          ...r,
          amount: Number(r.amount),
        })),
      })),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Generate structured printable receipt with complete billing details
   */
  async generateReceipt(paymentId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
      include: {
        feeInvoice: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true, phone: true } },
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: {
                    class: true,
                    section: true,
                  },
                },
              },
            },
            feeStructure: true,
            items: true,
          },
        },
        organization: true,
        cashierShift: true,
      },
    });

    if (!payment) throw new NotFoundException('Payment transaction not found');

    const invoice = payment.feeInvoice;
    const student = invoice?.student;
    const activeEnrollment = student?.enrollments?.[0];

    const receipt = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
      remarks: payment.remarks,
      student: {
        id: student?.id,
        name: student?.user ? `${student.user.firstName} ${student.user.lastName}` : 'Unknown',
        admissionNumber: student?.admissionNumber || 'N/A',
        className: activeEnrollment?.class?.name || 'N/A',
        sectionName: activeEnrollment?.section?.name || 'N/A',
      },
      invoice: {
        id: invoice?.id,
        invoiceNumber: invoice?.invoiceNumber,
        structureName: invoice?.feeStructure?.name || 'School Fee',
        totalAmount: Number(invoice?.amount || 0),
        paidAmount: Number(invoice?.paidAmount || 0),
        balanceRemaining: this.calculator.roundMoney(Number(invoice?.amount || 0) - Number(invoice?.paidAmount || 0)),
        items: invoice?.items?.map((item) => ({
          title: item.title,
          amount: Number(item.amount),
          quantity: item.quantity,
          totalAmount: Number(item.totalAmount),
        })),
      },
      cashier: {
        userId: payment.createdBy,
        shiftId: payment.cashierShiftId,
      },
      organization: {
        id: payment.organization?.id,
        name: payment.organization?.name || 'School Campus',
      },
      issuedAt: new Date().toISOString(),
    };

    return receipt;
  }

  // ---------------------------------------------------------------------------
  // Cashier Shifts
  // ---------------------------------------------------------------------------

  async openShift(user: CurrentUserPayload, dto: OpenCashierShiftDto) {
    // Check if cashier already has an active open shift
    const existing = await this.prisma.cashierShift.findFirst({
      where: {
        cashierId: user.id,
        status: 'OPEN',
      },
    });

    if (existing) {
      return {
        message: 'Active shift already open',
        shift: {
          ...existing,
          openingBalance: Number(existing.openingBalance),
        },
      };
    }

    const shift = await this.prisma.cashierShift.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        cashierId: user.id,
        openedAt: new Date(),
        openingBalance: this.calculator.roundMoney(dto.openingBalance || 0),
        status: 'OPEN',
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'OPEN_SHIFT',
      resource: 'CASHIER_SHIFT',
      resourceId: shift.id,
      details: { openingBalance: shift.openingBalance },
    });

    return {
      message: 'Shift opened successfully',
      shift: {
        ...shift,
        openingBalance: Number(shift.openingBalance),
      },
    };
  }

  async closeShift(user: CurrentUserPayload, shiftId: string, dto: CloseCashierShiftDto) {
    const shift = await this.prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: { payments: true },
    });

    if (!shift) throw new NotFoundException('Cashier shift not found');
    if (shift.status === 'CLOSED') {
      throw new BadRequestException('Shift is already closed');
    }

    const opening = Number(shift.openingBalance);
    // Sum only CASH payments collected in this shift for drawer balance
    const cashPaymentsTotal = shift.payments
      .filter((p) => p.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const allPaymentsTotal = shift.payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const expectedCash = this.calculator.roundMoney(opening + cashPaymentsTotal);
    const actualCash = this.calculator.roundMoney(dto.closingBalance);
    const discrepancy = this.calculator.roundMoney(actualCash - expectedCash);

    const updated = await this.prisma.cashierShift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingBalance: actualCash,
        expectedBalance: expectedCash,
        discrepancy,
        notes: dto.notes || null,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CLOSE_SHIFT',
      resource: 'CASHIER_SHIFT',
      resourceId: shift.id,
      details: {
        openingBalance: opening,
        collectedCash: cashPaymentsTotal,
        totalCollectedAllMethods: allPaymentsTotal,
        expectedCash,
        actualCash,
        discrepancy,
      },
    });

    return {
      message: 'Shift closed successfully',
      shift: {
        ...updated,
        openingBalance: Number(updated.openingBalance),
        closingBalance: Number(updated.closingBalance),
        expectedBalance: Number(updated.expectedBalance),
        discrepancy: Number(updated.discrepancy),
        totalCollectedCash: cashPaymentsTotal,
        totalCollectedAllMethods: allPaymentsTotal,
        paymentsCount: shift.payments.length,
      },
    };
  }

  async getCurrentShift(user: CurrentUserPayload) {
    const shift = await this.prisma.cashierShift.findFirst({
      where: {
        cashierId: user.id,
        status: 'OPEN',
      },
      include: {
        payments: true,
      },
    });

    if (!shift) return null;

    const totalCollected = shift.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const cashCollected = shift.payments
      .filter((p) => p.paymentMethod === PaymentMethod.CASH)
      .reduce((acc, p) => acc + Number(p.amount), 0);

    return {
      ...shift,
      openingBalance: Number(shift.openingBalance),
      totalCollected,
      cashCollected,
      paymentsCount: shift.payments.length,
    };
  }

  async getShifts(user: CurrentUserPayload, campusId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;

    const shifts = await this.prisma.cashierShift.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        cashier: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { payments: true },
        },
      },
    });

    return shifts.map((s) => ({
      ...s,
      openingBalance: Number(s.openingBalance),
      closingBalance: s.closingBalance ? Number(s.closingBalance) : null,
      expectedBalance: s.expectedBalance ? Number(s.expectedBalance) : null,
      discrepancy: s.discrepancy ? Number(s.discrepancy) : null,
      paymentsCount: s._count.payments,
    }));
  }
}
