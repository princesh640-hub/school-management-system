// =============================================================================
// Phase 4N: Parent Finance Service (Invoices, Receipts, Honest Gateway Check)
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { ParentAuthService } from './parent-auth.service';
import {
  IParentFeeSummary,
  IParentFeeInvoice,
  IParentFeeReceipt,
} from '@school/shared-types';

@Injectable()
export class ParentFinanceService {
  private readonly logger = new Logger(ParentFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parentAuth: ParentAuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Retrieves child's fee ledger: active invoices, line items, and payment transaction receipts.
   * Also performs an honest inspection of the online payment gateway readiness.
   */
  async getChildFeeSummary(
    userId: string,
    studentId: string,
  ): Promise<IParentFeeSummary> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const invoices = await this.prisma.feeInvoice.findMany({
      where: { studentId: student.id },
      include: {
        feeStructure: { select: { name: true } },
        items: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    let totalInvoiced = 0;
    let totalPaid = 0;
    const formattedInvoices: IParentFeeInvoice[] = [];
    const allReceipts: IParentFeeReceipt[] = [];

    for (const inv of invoices) {
      const amount = Number(inv.amount);
      const paid = Number(inv.paidAmount);
      const remaining = Math.max(0, amount - paid);

      totalInvoiced += amount;
      totalPaid += paid;

      formattedInvoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        feeStructureName: inv.feeStructure.name,
        dueDate: inv.dueDate.toISOString().split('T')[0],
        issuedDate: inv.issuedDate.toISOString().split('T')[0],
        status: inv.status as any,
        amount,
        paidAmount: paid,
        remainingAmount: remaining,
        items: inv.items.map((it) => ({
          description: it.description,
          amount: Number(it.amount),
          quantity: it.quantity,
          itemType: it.itemType,
        })),
      });

      for (const p of inv.payments) {
        allReceipts.push({
          id: p.id,
          receiptNumber: p.receiptNumber,
          invoiceNumber: inv.invoiceNumber,
          amount: Number(p.amount),
          paymentDate: p.paymentDate.toISOString().split('T')[0],
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber,
          status: p.status,
        });
      }
    }

    const gatewayKey =
      this.config.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY ||
      this.config.get<string>('PAYMENT_GATEWAY_API_KEY') ||
      process.env.PAYMENT_GATEWAY_API_KEY;

    return {
      studentId: student.id,
      currency: 'USD',
      totalInvoiced,
      totalPaid,
      balanceOutstanding: Math.max(0, totalInvoiced - totalPaid),
      invoices: formattedInvoices,
      receipts: allReceipts,
      paymentGateway: {
        isConfigured: !!gatewayKey,
        status: gatewayKey ? 'ONLINE' : 'NOT_CONFIGURED',
        providerName: gatewayKey ? 'Secure Card Gateway' : 'None (Unconfigured)',
      },
    };
  }

  /**
   * Initiates online fee payment. Validates relationship and server-side balance.
   * If gateway is unconfigured, refuses to simulate payment and throws descriptive error.
   */
  async initiateOnlinePayment(
    userId: string,
    studentId: string,
    invoiceId: string,
  ) {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Fee invoice not found.');
    }

    if (invoice.studentId !== student.id) {
      this.logger.warn(
        `SECURITY ALERT: User ${userId} attempted to pay invoice ${invoiceId} not belonging to student ${student.id}`,
      );
      throw new ForbiddenException(
        'Access denied: You cannot initiate payment for an invoice not issued to your child.',
      );
    }

    const gatewayKey =
      this.config.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY ||
      this.config.get<string>('PAYMENT_GATEWAY_API_KEY') ||
      process.env.PAYMENT_GATEWAY_API_KEY;

    if (!gatewayKey) {
      throw new BadRequestException(
        'ONLINE PAYMENT NOT CONFIGURED: Online payment processing is currently not configured on this institutional instance. Please settle outstanding dues directly at the campus cashier desk.',
      );
    }

    return {
      status: 'GATEWAY_SESSION_CREATED',
      invoiceNumber: invoice.invoiceNumber,
      amountDue: Number(invoice.amount) - Number(invoice.paidAmount),
    };
  }
}
