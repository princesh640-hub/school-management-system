import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { FinancialCalculatorService } from './financial-calculator.service';
import {
  RequestRefundDto,
  ReviewRefundDto,
  CreateFeeAdjustmentDto,
} from './dto/phase4g-fees.dto';

@Injectable()
export class RefundsAdjustmentsService {
  private readonly logger = new Logger(RefundsAdjustmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly calculator: FinancialCalculatorService,
  ) {}

  /**
   * Generates sequential refund number: REF-YYYY-XXXXX
   */
  async generateSequentialRefundNumber(organizationId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REF-${year}-`;

    const where: any = { refundNumber: { startsWith: prefix } };
    if (organizationId) where.organizationId = organizationId;

    const count = await this.prisma.paymentRefund.count({ where });
    const nextSeq = String(count + 1).padStart(5, '0');
    const refundNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.paymentRefund.findUnique({ where: { refundNumber } });
    if (!exists) return refundNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Generates sequential adjustment number: ADJ-YYYY-XXXXX
   */
  async generateSequentialAdjustmentNumber(organizationId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ADJ-${year}-`;

    const where: any = { adjustmentNumber: { startsWith: prefix } };
    if (organizationId) where.organizationId = organizationId;

    const count = await this.prisma.feeAdjustment.count({ where });
    const nextSeq = String(count + 1).padStart(5, '0');
    const adjustmentNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.feeAdjustment.findUnique({ where: { adjustmentNumber } });
    if (!exists) return adjustmentNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  // ---------------------------------------------------------------------------
  // 1. Reversals & Refunds
  // ---------------------------------------------------------------------------

  async requestRefund(user: CurrentUserPayload, dto: RequestRefundDto) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: dto.paymentTransactionId },
      include: {
        refunds: true,
        feeInvoice: true,
      },
    });

    if (!payment) throw new NotFoundException('Payment transaction not found');

    const totalPriorRefunds = payment.refunds
      .filter((r) => r.status === 'APPROVED' || r.status === 'PROCESSED' || r.status === 'PENDING')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const eligibleAmount = this.calculator.calculateEligibleRefund(
      Number(payment.amount),
      totalPriorRefunds,
    );

    const requestedAmount = this.calculator.roundMoney(dto.amount);
    if (requestedAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    if (requestedAmount > eligibleAmount) {
      throw new BadRequestException(
        `Requested refund of ${requestedAmount} exceeds eligible amount of ${eligibleAmount}`,
      );
    }

    const refundNumber = await this.generateSequentialRefundNumber(payment.organizationId || user.organizationId);

    const refund = await this.prisma.paymentRefund.create({
      data: {
        organizationId: payment.organizationId || user.organizationId,
        paymentTransactionId: dto.paymentTransactionId,
        refundNumber,
        amount: requestedAmount,
        reason: dto.reason.trim(),
        status: 'PENDING',
        requestedBy: user.id,
      },
      include: {
        paymentTransaction: {
          include: { feeInvoice: true },
        },
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REQUEST_REFUND',
      resource: 'PAYMENT_REFUND',
      resourceId: refund.id,
      details: { refundNumber, amount: requestedAmount, paymentId: dto.paymentTransactionId },
    });

    return {
      ...refund,
      amount: Number(refund.amount),
    };
  }

  async reviewRefund(user: CurrentUserPayload, refundId: string, dto: ReviewRefundDto) {
    const refund = await this.prisma.paymentRefund.findUnique({
      where: { id: refundId },
      include: {
        paymentTransaction: {
          include: { feeInvoice: true },
        },
      },
    });

    if (!refund) throw new NotFoundException('Refund request not found');
    if (refund.status !== 'PENDING') {
      throw new BadRequestException(`Cannot review refund in status "${refund.status}"`);
    }

    const targetStatus = dto.approved ? 'APPROVED' : 'REJECTED';
    const refundAmount = Number(refund.amount);
    const invoice = refund.paymentTransaction.feeInvoice;

    return this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.paymentRefund.update({
        where: { id: refundId },
        data: {
          status: targetStatus as any,
          approvedBy: user.id,
          approvedAt: new Date(),
          remarks: dto.reviewNotes || null,
        },
      });

      if (dto.approved && invoice) {
        // Adjust invoice paid amount downwards by the refunded sum
        const currentPaid = Number(invoice.paidAmount);
        const newPaid = this.calculator.roundMoney(Math.max(0, currentPaid - refundAmount));
        const totalAmount = Number(invoice.amount);

        let newStatus = invoice.status;
        if (newPaid === 0) {
          newStatus = InvoiceStatus.PENDING;
        } else if (newPaid < totalAmount) {
          newStatus = InvoiceStatus.PARTIAL;
        }

        await tx.feeInvoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaid,
            status: newStatus,
          },
        });
      }

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: dto.approved ? 'APPROVE_REFUND' : 'REJECT_REFUND',
        resource: 'PAYMENT_REFUND',
        resourceId: refundId,
        details: { status: targetStatus, amount: refundAmount, reviewNotes: dto.reviewNotes },
      });

      return {
        ...updatedRefund,
        amount: Number(updatedRefund.amount),
      };
    });
  }

  async getRefunds(user: CurrentUserPayload, status?: string) {
    const where: any = { organizationId: user.organizationId };
    if (status) where.status = status;

    const list = await this.prisma.paymentRefund.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        paymentTransaction: {
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
          },
        },
      },
    });

    return list.map((r) => ({
      ...r,
      amount: Number(r.amount),
      paymentTransaction: {
        ...r.paymentTransaction,
        amount: Number(r.paymentTransaction.amount),
      },
    }));
  }

  // ---------------------------------------------------------------------------
  // 2. Fee Adjustments (Credit, Debit, Waiver, Correction)
  // ---------------------------------------------------------------------------

  async createAdjustment(user: CurrentUserPayload, dto: CreateFeeAdjustmentDto) {
    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id: dto.feeInvoiceId },
    });
    if (!invoice) throw new NotFoundException('Fee invoice not found');

    const amount = this.calculator.roundMoney(dto.amount);
    if (amount <= 0) {
      throw new BadRequestException('Adjustment amount must be greater than zero');
    }

    const currentTotal = Number(invoice.amount);
    const currentPaid = Number(invoice.paidAmount);

    let newTotal = currentTotal;
    if (dto.type === 'CREDIT' || dto.type === 'WAIVER') {
      newTotal = this.calculator.roundMoney(Math.max(0, currentTotal - amount));
    } else if (dto.type === 'DEBIT') {
      newTotal = this.calculator.roundMoney(currentTotal + amount);
    } else if (dto.type === 'CORRECTION') {
      // Direct adjustment of the receivable
      newTotal = this.calculator.roundMoney(Math.max(0, currentTotal - amount));
    }

    let newStatus = invoice.status;
    if (currentPaid >= newTotal && newTotal > 0) {
      newStatus = InvoiceStatus.PAID;
    } else if (currentPaid > 0) {
      newStatus = InvoiceStatus.PARTIAL;
    } else {
      newStatus = InvoiceStatus.PENDING;
    }

    const adjustmentNumber = await this.generateSequentialAdjustmentNumber(user.organizationId);

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.feeAdjustment.create({
        data: {
          organizationId: user.organizationId,
          feeInvoiceId: dto.feeInvoiceId,
          adjustmentNumber,
          type: dto.type as any,
          amount,
          reason: dto.reason.trim(),
          approvedBy: user.id,
        },
      });

      const updatedInvoice = await tx.feeInvoice.update({
        where: { id: dto.feeInvoiceId },
        data: {
          amount: newTotal,
          status: newStatus,
        },
      });

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'CREATE_FEE_ADJUSTMENT',
        resource: 'FEE_ADJUSTMENT',
        resourceId: adjustment.id,
        details: {
          adjustmentNumber,
          type: dto.type,
          amount,
          previousAmount: currentTotal,
          newAmount: newTotal,
        },
      });

      return {
        adjustment: {
          ...adjustment,
          amount: Number(adjustment.amount),
        },
        invoice: {
          id: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          amount: Number(updatedInvoice.amount),
          paidAmount: Number(updatedInvoice.paidAmount),
          balanceDue: this.calculator.roundMoney(Number(updatedInvoice.amount) - Number(updatedInvoice.paidAmount)),
          status: updatedInvoice.status,
        },
      };
    });
  }

  async getAdjustments(user: CurrentUserPayload, feeInvoiceId?: string, type?: string) {
    const where: any = { organizationId: user.organizationId };
    if (feeInvoiceId) where.feeInvoiceId = feeInvoiceId;
    if (type) where.type = type;

    const list = await this.prisma.feeAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        feeInvoice: true,
      },
    });

    return list.map((a) => ({
      ...a,
      amount: Number(a.amount),
      feeInvoice: {
        ...a.feeInvoice,
        amount: Number(a.feeInvoice.amount),
        paidAmount: Number(a.feeInvoice.paidAmount),
      },
    }));
  }
}
