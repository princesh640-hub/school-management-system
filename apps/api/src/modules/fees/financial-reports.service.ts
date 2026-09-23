import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { FinancialCalculatorService } from './financial-calculator.service';
import {
  CollectionSummaryReport,
  DefaultersAgingReport,
  DefaulterRecord,
} from '@school/shared-types';

@Injectable()
export class FinancialReportsService {
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: FinancialCalculatorService,
  ) {}

  /**
   * Generates collection summaries by period, payment method, or cashier
   */
  async getCollectionSummary(options: {
    organizationId: string;
    campusId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CollectionSummaryReport> {
    const { organizationId, campusId, startDate, endDate } = options;

    const where: any = { organizationId };
    if (campusId) where.campusId = campusId;

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [payments, refunds] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: { cashierShift: true },
      }),
      this.prisma.paymentRefund.findMany({
        where: {
          organizationId,
          status: { in: ['APPROVED', 'PROCESSED'] },
          ...(startDate || endDate
            ? {
                approvedAt: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
      }),
    ]);

    let totalCollected = 0;
    const byMethod: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      BANK_TRANSFER: { count: 0, total: 0 },
      CHEQUE: { count: 0, total: 0 },
      CARD: { count: 0, total: 0 },
      ONLINE_GATEWAY: { count: 0, total: 0 },
    };

    for (const p of payments) {
      const amt = Number(p.amount);
      totalCollected += amt;

      const m = p.paymentMethod || 'CASH';
      if (!byMethod[m]) {
        byMethod[m] = { count: 0, total: 0 };
      }
      byMethod[m].count++;
      byMethod[m].total = this.calculator.roundMoney(byMethod[m].total + amt);
    }

    const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const netCollected = this.calculator.roundMoney(totalCollected - totalRefunded);

    return {
      period: {
        startDate: startDate || 'All Time',
        endDate: endDate || 'Present',
      },
      totalCollected: this.calculator.roundMoney(totalCollected),
      totalRefunded: this.calculator.roundMoney(totalRefunded),
      netCollected,
      transactionCount: payments.length,
      byPaymentMethod: Object.entries(byMethod).map(([method, data]) => ({
        method: method as any,
        count: data.count,
        totalAmount: data.total,
      })),
    };
  }

  /**
   * Generates aging report of overdue fee accounts categorized into 30-day buckets
   */
  async getDefaultersAgingReport(options: {
    organizationId: string;
    campusId?: string;
    academicYearId?: string;
  }): Promise<DefaultersAgingReport> {
    const { organizationId, campusId, academicYearId } = options;
    const now = new Date();

    const where: any = {
      organizationId,
      dueDate: { lt: now },
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
    };
    if (campusId) where.campusId = campusId;
    if (academicYearId) where.academicYearId = academicYearId;

    const overdueInvoices = await this.prisma.feeInvoice.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {
                class: true,
                section: true,
              },
            },
            guardianLinks: {
              include: {
                guardian: {
                  include: {
                    user: { select: { firstName: true, lastName: true, phone: true } },
                  },
                },
              },
            },
          },
        },
        feeStructure: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const buckets = {
      '1-30': { count: 0, total: 0 },
      '31-60': { count: 0, total: 0 },
      '61-90': { count: 0, total: 0 },
      '90+': { count: 0, total: 0 },
    };

    const defaulters: DefaulterRecord[] = [];
    let grandTotalOverdue = 0;

    for (const inv of overdueInvoices) {
      const balanceDue = this.calculator.roundMoney(Number(inv.amount) - Number(inv.paidAmount));
      if (balanceDue <= 0) continue;

      const diffMs = now.getTime() - new Date(inv.dueDate).getTime();
      const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let bucketKey: '1-30' | '31-60' | '61-90' | '90+' = '1-30';
      if (daysOverdue > 90) bucketKey = '90+';
      else if (daysOverdue > 60) bucketKey = '61-90';
      else if (daysOverdue > 30) bucketKey = '31-60';

      buckets[bucketKey].count++;
      buckets[bucketKey].total = this.calculator.roundMoney(buckets[bucketKey].total + balanceDue);
      grandTotalOverdue = this.calculator.roundMoney(grandTotalOverdue + balanceDue);

      const student = inv.student;
      const activeEnrollment = student?.enrollments?.[0];
      const primaryGuardian = student?.guardianLinks?.[0]?.guardian;

      defaulters.push({
        studentId: inv.studentId,
        studentName: student?.user ? `${student.user.firstName} ${student.user.lastName}` : 'Unknown Student',
        admissionNumber: student?.admissionNumber || '',
        className: activeEnrollment?.class?.name || 'N/A',
        sectionName: activeEnrollment?.section?.name || 'N/A',
        guardianName: primaryGuardian?.user ? `${primaryGuardian.user.firstName} ${primaryGuardian.user.lastName}` : undefined,
        guardianPhone: primaryGuardian?.user?.phone || student?.user?.phone || undefined,
        invoiceNumber: inv.invoiceNumber,
        feeStructureName: inv.feeStructure?.name || 'School Fee',
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        daysOverdue,
        overdueAmount: balanceDue,
        agingBucket: bucketKey,
      });
    }

    return {
      generatedAt: now.toISOString(),
      grandTotalOverdue,
      totalDefaultersCount: defaulters.length,
      buckets: [
        { bucket: '1-30 days', count: buckets['1-30'].count, totalAmount: buckets['1-30'].total },
        { bucket: '31-60 days', count: buckets['31-60'].count, totalAmount: buckets['31-60'].total },
        { bucket: '61-90 days', count: buckets['61-90'].count, totalAmount: buckets['61-90'].total },
        { bucket: '90+ days', count: buckets['90+'].count, totalAmount: buckets['90+'].total },
      ],
      defaulters,
    };
  }
}
