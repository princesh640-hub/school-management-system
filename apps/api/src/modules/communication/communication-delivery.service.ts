// =============================================================================
// Phase 4M: Communication Delivery Ledger & Webhooks Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CommunicationChannel,
  CommunicationStatus,
} from '@prisma/client';
import { CommunicationProvidersService } from './communication-providers.service';

export interface CreateDeliveryParams {
  campaignId?: string;
  userId?: string;
  recipient: string;
  recipientName?: string;
  channel: CommunicationChannel;
  provider?: string;
  status?: CommunicationStatus;
  subject?: string;
  contentSnippet?: string;
  idempotencyKey: string;
  failureReason?: string;
  providerRef?: string;
}

@Injectable()
export class CommunicationDeliveryService {
  private readonly logger = new Logger(CommunicationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: CommunicationProvidersService,
  ) {}

  /**
   * Records an individual delivery attempt in the ledger.
   * Leverages unique idempotencyKey to prevent duplicate sends.
   */
  async recordDelivery(params: CreateDeliveryParams) {
    const existing = await this.prisma.communicationDelivery.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate delivery detected for idempotencyKey: ${params.idempotencyKey}`,
      );
      return existing;
    }

    return this.prisma.communicationDelivery.create({
      data: {
        campaignId: params.campaignId,
        userId: params.userId,
        recipient: params.recipient,
        recipientName: params.recipientName,
        channel: params.channel,
        provider: params.provider || 'internal',
        status: params.status || CommunicationStatus.QUEUED,
        subject: params.subject,
        contentSnippet: params.contentSnippet
          ? params.contentSnippet.substring(0, 500)
          : null,
        attempts: 1,
        maxAttempts: 3,
        lastAttemptAt: new Date(),
        deliveredAt:
          params.status === CommunicationStatus.DELIVERED ? new Date() : null,
        failureReason: params.failureReason,
        providerRef: params.providerRef,
        idempotencyKey: params.idempotencyKey,
      },
    });
  }

  /**
   * Queries delivery ledger with pagination, channel filtering, and status filtering.
   */
  async listDeliveries(
    organizationId: string,
    filters?: {
      campaignId?: string;
      channel?: CommunicationChannel;
      status?: CommunicationStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(Number(filters?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters?.limit) || 25, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.campaignId) {
      where.campaignId = filters.campaignId;
    } else {
      // If no specific campaign, scope to organization's users or campaigns
      where.OR = [
        { campaign: { organizationId } },
        { user: { organizationId } },
      ];
    }

    if (filters?.channel) {
      where.channel = filters.channel;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.AND = [
        {
          OR: [
            { recipient: { contains: filters.search, mode: 'insensitive' } },
            { recipientName: { contains: filters.search, mode: 'insensitive' } },
            { subject: { contains: filters.search, mode: 'insensitive' } },
            { idempotencyKey: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.communicationDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          campaign: {
            select: { id: true, title: true, code: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.communicationDelivery.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves a single delivery attempt by ID.
   */
  async getDeliveryById(id: string) {
    const delivery = await this.prisma.communicationDelivery.findUnique({
      where: { id },
      include: {
        campaign: true,
        user: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery record '${id}' not found.`);
    }

    return delivery;
  }

  /**
   * Retries a failed or skipped delivery record.
   */
  async retryDelivery(id: string) {
    const delivery = await this.getDeliveryById(id);

    if (delivery.attempts >= delivery.maxAttempts) {
      throw new BadRequestException(
        `Max retry attempts (${delivery.maxAttempts}) reached for delivery '${id}'.`,
      );
    }

    // Attempt channel re-dispatch
    let result = {
      status: CommunicationStatus.FAILED,
      provider: delivery.provider,
      providerRef: delivery.providerRef || undefined,
      failureReason: undefined as string | undefined,
    };

    switch (delivery.channel) {
      case CommunicationChannel.EMAIL:
        result = await this.providersService.sendEmail({
          to: delivery.recipient,
          subject: delivery.subject || 'School Notification',
          html: delivery.contentSnippet || '',
        });
        break;
      case CommunicationChannel.SMS:
        result = await this.providersService.sendSms({
          to: delivery.recipient,
          message: delivery.contentSnippet || '',
        });
        break;
      case CommunicationChannel.PUSH:
        result = await this.providersService.sendPush({
          deviceToken: delivery.recipient,
          title: delivery.subject || 'School Notification',
          body: delivery.contentSnippet || '',
        });
        break;
      default:
        result = {
          status: CommunicationStatus.SENT,
          provider: 'internal',
          providerRef: `RETRY-${Date.now()}`,
          failureReason: undefined,
        };
        break;
    }

    const updated = await this.prisma.communicationDelivery.update({
      where: { id },
      data: {
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
        status: result.status,
        provider: result.provider,
        providerRef: result.providerRef,
        failureReason: result.failureReason || null,
        deliveredAt:
          result.status === CommunicationStatus.DELIVERED ? new Date() : null,
      },
    });

    // Update parent campaign metrics if linked
    if (delivery.campaignId && result.status === CommunicationStatus.SENT) {
      await this.prisma.communicationCampaign.update({
        where: { id: delivery.campaignId },
        data: {
          sentCount: { increment: 1 },
          failedCount: { decrement: 1 },
        },
      });
    }

    return updated;
  }

  /**
   * Processes inbound webhook delivery status events from external providers.
   */
  async handleWebhookEvent(
    provider: string,
    eventType: string,
    payload: any,
    providerEventId?: string,
  ) {
    const eventId =
      providerEventId ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const existing = await this.prisma.communicationWebhookEvent.findFirst({
      where: { provider, providerEventId: eventId },
    });

    if (existing) {
      return { status: 'IGNORED_DUPLICATE', id: existing.id };
    }

    const webhookRecord = await this.prisma.communicationWebhookEvent.create({
      data: {
        provider,
        providerEventId: eventId,
        eventType,
        payload: payload || {},
        isProcessed: false,
      },
    });

    try {
      // Find matching delivery by providerRef
      const providerRef = payload.providerRef || payload.messageId || payload.id;
      if (providerRef) {
        const delivery = await this.prisma.communicationDelivery.findFirst({
          where: { providerRef },
        });

        if (delivery) {
          let newStatus = delivery.status;
          if (eventType.toUpperCase().includes('DELIVERED')) {
            newStatus = CommunicationStatus.DELIVERED;
          } else if (
            eventType.toUpperCase().includes('FAIL') ||
            eventType.toUpperCase().includes('BOUNCE')
          ) {
            newStatus = CommunicationStatus.FAILED;
          }

          await this.prisma.communicationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: newStatus,
              deliveredAt:
                newStatus === CommunicationStatus.DELIVERED
                  ? new Date()
                  : delivery.deliveredAt,
              failureReason: payload.reason || delivery.failureReason,
            },
          });

          if (delivery.campaignId) {
            if (newStatus === CommunicationStatus.DELIVERED) {
              await this.prisma.communicationCampaign.update({
                where: { id: delivery.campaignId },
                data: { deliveredCount: { increment: 1 } },
              });
            } else if (newStatus === CommunicationStatus.FAILED) {
              await this.prisma.communicationCampaign.update({
                where: { id: delivery.campaignId },
                data: { failedCount: { increment: 1 } },
              });
            }
          }
        }
      }

      await this.prisma.communicationWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
        },
      });

      return { status: 'PROCESSED', id: webhookRecord.id };
    } catch (err: any) {
      await this.prisma.communicationWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          isProcessed: false,
          errorMessage: err.message,
        },
      });
      throw err;
    }
  }
}
