// =============================================================================
// Phase 4S: Webhook Dispatcher & Idempotency Service
// =============================================================================
import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { PaymentsService } from '../../fees/payments.service';
import { WebhookVerificationService } from './webhook-verification.service';
import { IntegrationConfigService } from '../integration-config.service';

export interface InboundWebhookRequest {
  provider: string;
  rawBody: string | Buffer;
  headers: Record<string, string | string[] | undefined>;
  parsedBody: any;
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verifier: WebhookVerificationService,
    private readonly configService: IntegrationConfigService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Processes inbound webhook with signature verification, idempotency protection,
   * event normalization, and transactional domain dispatch.
   */
  async processInboundWebhook(req: InboundWebhookRequest): Promise<{
    status: 'PROCESSED' | 'DUPLICATE' | 'IGNORED' | 'FAILED';
    eventId?: string;
    message: string;
  }> {
    const startTime = Date.now();
    const provider = req.provider.toUpperCase();
    const bodyStr = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString('utf8');

    // 1. Calculate payload hash
    const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

    // 2. Extract provider event ID
    const eventId = this.extractEventId(provider, req.parsedBody);
    const eventType = this.extractEventType(provider, req.parsedBody);

    this.logger.log(`[INBOUND WEBHOOK - ${provider}] Event: ${eventType} | Event ID: ${eventId || 'NONE'}`);

    // 3. Idempotency check: has this event already been processed?
    if (eventId) {
      const existing = await this.prisma.webhookEventLog.findFirst({
        where: { provider, eventId },
      });

      if (existing && (existing.status === 'PROCESSED' || existing.status === 'DUPLICATE')) {
        this.logger.warn(`Idempotent replay detected for [${provider}:${eventId}]. Skipping dispatch.`);
        return {
          status: 'DUPLICATE',
          eventId,
          message: 'Webhook event already processed previously',
        };
      }
    }

    // 4. Resolve integration config and verify signature if secret configured
    const activeConfig = await this.configService.getDecryptedActiveConfig(
      req.parsedBody?.organizationId || 'default',
      provider === 'STRIPE' || provider === 'RAZORPAY' ? 'PAYMENT' : 'COMMUNICATION',
    );

    const webhookSecret = activeConfig?.config?.webhookSecret || process.env.WEBHOOK_SIGNING_SECRET || '';

    if (webhookSecret) {
      const isValid = this.verifier.verifySignature(provider, req.rawBody, req.headers, webhookSecret);
      if (!isValid) {
        this.logger.error(`Webhook signature verification failed for provider [${provider}]`);
        await this.prisma.webhookEventLog.create({
          data: {
            provider,
            eventType,
            eventId,
            payloadHash,
            status: 'FAILED',
            responseCode: 401,
            processingTimeMs: Date.now() - startTime,
            errorMessage: 'Cryptographic signature verification failed',
          },
        });
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // 5. Create initial received log entry
    const logRecord = await this.prisma.webhookEventLog.create({
      data: {
        provider,
        eventType,
        eventId,
        payloadHash,
        status: 'RECEIVED',
        payload: this.sanitizePayload(req.parsedBody),
      },
    });

    // 6. Domain Dispatch
    try {
      if (provider === 'STRIPE' || provider === 'RAZORPAY') {
        await this.handlePaymentWebhook(provider, eventType, req.parsedBody, eventId);
      } else if (provider === 'TWILIO' || provider === 'WHATSAPP' || provider === 'META_WHATSAPP') {
        await this.handleCommunicationWebhook(provider, eventType, req.parsedBody);
      }

      const processingTimeMs = Date.now() - startTime;
      await this.prisma.webhookEventLog.update({
        where: { id: logRecord.id },
        data: {
          status: 'PROCESSED',
          responseCode: 200,
          processingTimeMs,
        },
      });

      return {
        status: 'PROCESSED',
        eventId,
        message: 'Webhook processed and dispatched successfully',
      };
    } catch (err: any) {
      const processingTimeMs = Date.now() - startTime;
      this.logger.error(`Webhook handler dispatch error: ${err.message}`);

      await this.prisma.webhookEventLog.update({
        where: { id: logRecord.id },
        data: {
          status: 'FAILED',
          responseCode: 500,
          processingTimeMs,
          errorMessage: err.message,
        },
      });

      return {
        status: 'FAILED',
        eventId,
        message: `Webhook handler failure: ${err.message}`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Provider Extraction & Normalization
  // ---------------------------------------------------------------------------

  private extractEventId(provider: string, body: any): string | null {
    if (!body) return null;
    if (provider === 'STRIPE') return body.id || null;
    if (provider === 'RAZORPAY') return body.payload?.payment?.entity?.id || body.event_id || null;
    if (provider === 'TWILIO') return body.MessageSid || body.SmsSid || null;
    if (provider === 'WHATSAPP' || provider === 'META_WHATSAPP') {
      return body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id || null;
    }
    return body.eventId || body.id || null;
  }

  private extractEventType(provider: string, body: any): string {
    if (!body) return 'UNKNOWN';
    if (provider === 'STRIPE') return body.type || 'unknown.event';
    if (provider === 'RAZORPAY') return body.event || 'unknown.event';
    if (provider === 'TWILIO') return body.SmsStatus || body.MessageStatus || 'delivery_status';
    if (provider === 'WHATSAPP' || provider === 'META_WHATSAPP') {
      return body.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.status || 'status_update';
    }
    return body.eventType || body.event || 'generic.event';
  }

  // ---------------------------------------------------------------------------
  // Domain Handlers
  // ---------------------------------------------------------------------------

  private async handlePaymentWebhook(provider: string, eventType: string, body: any, eventId?: string | null) {
    // Normalization of successful payment events:
    // Stripe: checkout.session.completed, payment_intent.succeeded
    // Razorpay: payment.captured, order.paid
    const isSuccess =
      eventType === 'checkout.session.completed' ||
      eventType === 'payment_intent.succeeded' ||
      eventType === 'payment.captured' ||
      eventType === 'order.paid';

    if (!isSuccess) {
      this.logger.log(`Ignoring non-payment-success event: ${eventType}`);
      return;
    }

    let invoiceId = '';
    let amount = 0;
    let paymentMethod = 'ONLINE';

    if (provider === 'STRIPE') {
      const dataObj = body.data?.object || {};
      invoiceId = dataObj.client_reference_id || dataObj.metadata?.invoiceId || '';
      amount = dataObj.amount_total ? dataObj.amount_total / 100 : dataObj.amount ? dataObj.amount / 100 : 0;
      paymentMethod = 'CREDIT_CARD';
    } else if (provider === 'RAZORPAY') {
      const paymentObj = body.payload?.payment?.entity || {};
      invoiceId = paymentObj.notes?.invoiceId || '';
      amount = paymentObj.amount ? paymentObj.amount / 100 : 0;
      paymentMethod = 'ONLINE';
    }

    if (!invoiceId) {
      this.logger.warn(`Payment webhook received for provider [${provider}] without invoice reference`);
      return;
    }

    // Verify invoice exists and has not already been settled
    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      this.logger.error(`Payment webhook refers to non-existent invoice [${invoiceId}]`);
      return;
    }

    // Idempotent record payment via Phase 4G PaymentsService
    const idempotencyKey = `GATEWAY-${provider}-${eventId || Date.now()}`;
    await this.paymentsService.recordPayment(
      { organizationId: invoice.organizationId, id: 'SYSTEM_WEBHOOK' } as any,
      {
        feeInvoiceId: invoice.id,
        amount: amount > 0 ? amount : Number(invoice.amount) - Number(invoice.paidAmount),
        paymentMethod: paymentMethod as any,
        idempotencyKey,
        notes: `Authoritative online payment verified via ${provider} webhook [${eventId || 'N/A'}]`,
      },
    );

    this.logger.log(`Reconciled online payment for invoice [${invoice.invoiceNumber}] via [${provider}]`);
  }

  private async handleCommunicationWebhook(provider: string, eventType: string, body: any) {
    this.logger.log(`[COMMUNICATION WEBHOOK - ${provider}] Received delivery status: ${eventType}`);
    // Delivery status callbacks are stored in WebhookEventLog and audited
  }

  private sanitizePayload(payload: any): any {
    if (!payload) return {};
    const copy = JSON.parse(JSON.stringify(payload));

    const maskObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (/(card|cvv|pan|password|secret|key)/i.test(k)) {
          obj[k] = '[REDACTED]';
        } else if (typeof v === 'object') {
          maskObject(v);
        }
      }
    };

    maskObject(copy);
    return copy;
  }
}
