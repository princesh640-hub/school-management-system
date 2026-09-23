import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { FinancialCalculatorService } from './financial-calculator.service';
import {
  StudentLedgerResponse,
  StudentLedgerEntry,
} from '@school/shared-types';

@Injectable()
export class StudentLedgerService {
  private readonly logger = new Logger(StudentLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: FinancialCalculatorService,
  ) {}

  /**
   * Builds a chronological, auditable student financial ledger with running balances
   */
  async getStudentLedger(
    studentId: string,
    academicYearId?: string,
  ): Promise<StudentLedgerResponse> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        campus: { select: { id: true, name: true, code: true } },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            class: true,
            section: true,
            academicYear: true,
          },
        },
      },
    });

    if (!student) throw new NotFoundException('Student profile not found');

    const invoiceWhere: any = { studentId };
    if (academicYearId) invoiceWhere.academicYearId = academicYearId;

    const invoices = await this.prisma.feeInvoice.findMany({
      where: invoiceWhere,
      orderBy: { createdAt: 'asc' },
      include: {
        feeStructure: true,
        items: true,
        payments: {
          include: {
            refunds: {
              where: { status: { in: ['APPROVED', 'PROCESSED'] } },
            },
          },
        },
        adjustments: true,
      },
    });

    const rawEntries: Array<{
      date: Date;
      type: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
      reference: string;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalAdjusted = 0;
    let totalRefunded = 0;

    for (const inv of invoices) {
      // Base invoice amount (Debit)
      const invAmount = Number(inv.amount);
      totalInvoiced += invAmount;
      rawEntries.push({
        date: new Date(inv.createdAt),
        type: 'INVOICE',
        reference: inv.invoiceNumber,
        description: `Invoice: ${inv.feeStructure?.name || 'Fee'}`,
        debit: invAmount,
        credit: 0,
      });

      // Payments against this invoice (Credit)
      for (const p of inv.payments) {
        const pAmount = Number(p.amount);
        totalPaid += pAmount;
        rawEntries.push({
          date: new Date(p.paymentDate),
          type: 'PAYMENT',
          reference: p.receiptNumber,
          description: `Payment received (${p.paymentMethod})`,
          debit: 0,
          credit: pAmount,
        });

        // Approved refunds against this payment (Debit - reversal of credit)
        for (const ref of p.refunds) {
          const rAmount = Number(ref.amount);
          totalRefunded += rAmount;
          rawEntries.push({
            date: new Date(ref.approvedAt || ref.requestedAt),
            type: 'REFUND',
            reference: ref.refundNumber,
            description: `Refund processed: ${ref.reason}`,
            debit: rAmount,
            credit: 0,
          });
        }
      }

      // Adjustments on this invoice
      for (const adj of inv.adjustments) {
        const adjAmount = Number(adj.amount);
        if (adj.type === 'CREDIT' || adj.type === 'WAIVER' || adj.type === 'CORRECTION') {
          totalAdjusted += adjAmount;
          rawEntries.push({
            date: new Date(adj.createdAt),
            type: 'ADJUSTMENT',
            reference: adj.adjustmentNumber,
            description: `Adjustment [${adj.type}]: ${adj.reason}`,
            debit: 0,
            credit: adjAmount,
          });
        } else if (adj.type === 'DEBIT') {
          totalInvoiced += adjAmount;
          rawEntries.push({
            date: new Date(adj.createdAt),
            type: 'ADJUSTMENT',
            reference: adj.adjustmentNumber,
            description: `Adjustment [DEBIT]: ${adj.reason}`,
            debit: adjAmount,
            credit: 0,
          });
        }
      }
    }

    // Sort chronologically ascending
    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute running balance
    let runningBalance = 0;
    const computedEntries: StudentLedgerEntry[] = rawEntries.map((e, idx) => {
      runningBalance = this.calculator.roundMoney(runningBalance + e.debit - e.credit);
      return {
        id: `ledger-entry-${idx + 1}`,
        date: e.date.toISOString(),
        type: e.type,
        reference: e.reference,
        description: e.description,
        debit: this.calculator.roundMoney(e.debit),
        credit: this.calculator.roundMoney(e.credit),
        balance: runningBalance,
      };
    });

    const activeEnrollment = student.enrollments?.[0];

    return {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        campusName: student.campus?.name,
        className: activeEnrollment?.class?.name,
        sectionName: activeEnrollment?.section?.name,
      },
      summary: {
        totalInvoiced: this.calculator.roundMoney(totalInvoiced),
        totalPaid: this.calculator.roundMoney(totalPaid),
        totalAdjusted: this.calculator.roundMoney(totalAdjusted),
        totalRefunded: this.calculator.roundMoney(totalRefunded),
        netOutstandingBalance: runningBalance,
      },
      entries: computedEntries,
    };
  }
}
