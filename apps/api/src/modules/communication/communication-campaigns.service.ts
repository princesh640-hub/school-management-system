// =============================================================================
// Phase 4M: Communication Campaigns Service
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
  CommunicationPriority,
  AudienceType,
} from '@prisma/client';
import {
  ICreateCampaignDto,
} from '@school/shared-types';
import { CommunicationAudienceService } from './communication-audience.service';
import { CommunicationTemplatesService } from './communication-templates.service';
import { CommunicationPreferencesService } from './communication-preferences.service';
import { CommunicationProvidersService } from './communication-providers.service';
import { CommunicationDeliveryService } from './communication-delivery.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommunicationCampaignsService {
  private readonly logger = new Logger(CommunicationCampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audienceService: CommunicationAudienceService,
    private readonly templatesService: CommunicationTemplatesService,
    private readonly preferencesService: CommunicationPreferencesService,
    private readonly providersService: CommunicationProvidersService,
    private readonly deliveryService: CommunicationDeliveryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generates sequential campaign code in the format CMP-YYYY-XXXXX.
   */
  private async generateCampaignCode(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.communicationCampaign.count({
      where: {
        organizationId,
        code: { startsWith: `CMP-${year}-` },
      },
    });
    return `CMP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Creates a new communication campaign.
   */
  async createCampaign(
    organizationId: string,
    dto: ICreateCampaignDto,
    userId?: string,
  ) {
    const code = await this.generateCampaignCode(organizationId);

    const audienceType =
      (dto.audienceType as AudienceType) || AudienceType.ROLES;
    const priority =
      (dto.priority as CommunicationPriority) || CommunicationPriority.NORMAL;

    // Validate channels
    const channels = (dto.channels || [CommunicationChannel.IN_APP]) as CommunicationChannel[];

    // Calculate initial recipient count
    const recipients = await this.audienceService.resolveRecipients(
      organizationId,
      audienceType,
      {
        ...(dto.audienceFilter || {}),
        campusId: dto.campusId,
      },
    );

    const campaign = await this.prisma.communicationCampaign.create({
      data: {
        organizationId,
        campusId: dto.campusId,
        code,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType || 'GENERAL_BROADCAST',
        channels,
        templateId: dto.templateId,
        audienceType,
        audienceFilter: (dto.audienceFilter as any) || {
          customSubject: dto.customSubject,
          customBody: dto.customBody,
        },
        priority,
        status: dto.scheduledAt
          ? CommunicationStatus.QUEUED
          : CommunicationStatus.QUEUED,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        totalRecipients: recipients.length,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        skippedCount: 0,
        createdBy: userId,
      },
      include: {
        template: true,
      },
    });

    return campaign;
  }

  /**
   * Lists campaigns with optional campus, status, and search filters.
   */
  async listCampaigns(
    organizationId: string,
    filters?: {
      campusId?: string;
      status?: CommunicationStatus;
      search?: string;
    },
  ) {
    const where: any = { organizationId };

    if (filters?.campusId) {
      where.campusId = filters.campusId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.communicationCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: { id: true, name: true, code: true, channel: true },
        },
      },
    });
  }

  /**
   * Retrieves a single campaign with template and delivery summary stats.
   */
  async getCampaignById(organizationId: string, id: string) {
    const campaign = await this.prisma.communicationCampaign.findFirst({
      where: { id, organizationId },
      include: {
        template: true,
        campus: { select: { id: true, name: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID '${id}' not found.`);
    }

    return campaign;
  }

  /**
   * Cancels a queued or scheduled campaign.
   */
  async cancelCampaign(organizationId: string, id: string) {
    const campaign = await this.getCampaignById(organizationId, id);

    if (
      campaign.status === CommunicationStatus.SENT ||
      campaign.status === CommunicationStatus.PROCESSING
    ) {
      throw new BadRequestException(
        `Cannot cancel campaign in status '${campaign.status}'.`,
      );
    }

    return this.prisma.communicationCampaign.update({
      where: { id },
      data: { status: CommunicationStatus.CANCELLED },
    });
  }

  /**
   * Executes a campaign: resolves recipients, renders templates, respects quiet hours,
   * performs multi-channel delivery, records ledger items, and tracks real metrics.
   */
  async executeCampaign(
    organizationId: string,
    campaignId: string,
    executorUserId?: string,
  ) {
    const campaign = await this.getCampaignById(organizationId, campaignId);

    if (
      campaign.status === CommunicationStatus.PROCESSING ||
      campaign.status === CommunicationStatus.SENT
    ) {
      throw new BadRequestException(
        `Campaign '${campaign.code}' is already in status '${campaign.status}'.`,
      );
    }

    // Set status to PROCESSING
    await this.prisma.communicationCampaign.update({
      where: { id: campaignId },
      data: { status: CommunicationStatus.PROCESSING },
    });

    // Resolve audience recipients
    const filterCriteria = (campaign.audienceFilter as any) || {};
    const recipients = await this.audienceService.resolveRecipients(
      organizationId,
      campaign.audienceType,
      {
        ...filterCriteria,
        campusId: campaign.campusId || undefined,
      },
    );

    // Resolve template if attached
    let templateSubject = filterCriteria.customSubject || campaign.title;
    let templateBody = filterCriteria.customBody || campaign.description || campaign.title;

    if (campaign.templateId) {
      const tpl = await this.templatesService.getTemplateById(
        organizationId,
        campaign.templateId,
      );
      if (tpl) {
        templateSubject = tpl.subject || templateSubject;
        templateBody = tpl.body;
      }
    }

    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      const vars = {
        name: recipient.name,
        recipient_name: recipient.name,
        email: recipient.email,
        phone: recipient.phone || '',
        date: new Date().toLocaleDateString(),
        title: campaign.title,
      };

      const subject = this.templatesService.renderContent(templateSubject, vars);
      const body = this.templatesService.renderContent(templateBody, vars);

      // Check quiet hours
      const isQuiet = await this.preferencesService.isQuietHourActive(recipient.userId);

      for (const channel of campaign.channels) {
        const idempotencyKey = `${campaign.id}-${recipient.userId}-${channel}`;

        // Check channel opt-in
        const isAllowed = await this.preferencesService.isChannelAllowedForUser(
          recipient.userId,
          channel,
        );

        if (!isAllowed) {
          skipped++;
          await this.deliveryService.recordDelivery({
            campaignId: campaign.id,
            userId: recipient.userId,
            recipient: recipient.email || recipient.userId,
            recipientName: recipient.name,
            channel,
            status: CommunicationStatus.SKIPPED,
            failureReason: 'User opted out of channel',
            subject,
            contentSnippet: body,
            idempotencyKey,
          });
          continue;
        }

        if (isQuiet && channel !== CommunicationChannel.IN_APP) {
          skipped++;
          await this.deliveryService.recordDelivery({
            campaignId: campaign.id,
            userId: recipient.userId,
            recipient: recipient.email || recipient.userId,
            recipientName: recipient.name,
            channel,
            status: CommunicationStatus.SKIPPED,
            failureReason: 'Silenced due to active quiet hours',
            subject,
            contentSnippet: body,
            idempotencyKey,
          });
          continue;
        }

        // Deliver based on channel
        switch (channel) {
          case CommunicationChannel.IN_APP: {
            await this.notificationsService.create({
              organizationId,
              userId: recipient.userId,
              title: subject,
              message: body,
              type: 'COMMUNICATION',
              priority: campaign.priority,
              campaignId: campaign.id,
            });

            await this.deliveryService.recordDelivery({
              campaignId: campaign.id,
              userId: recipient.userId,
              recipient: recipient.userId,
              recipientName: recipient.name,
              channel,
              provider: 'internal',
              status: CommunicationStatus.DELIVERED,
              subject,
              contentSnippet: body,
              idempotencyKey,
            });

            delivered++;
            sent++;
            break;
          }

          case CommunicationChannel.EMAIL: {
            if (!recipient.email) {
              skipped++;
              break;
            }
            const res = await this.providersService.sendEmail({
              to: recipient.email,
              subject,
              html: body,
            });

            await this.deliveryService.recordDelivery({
              campaignId: campaign.id,
              userId: recipient.userId,
              recipient: recipient.email,
              recipientName: recipient.name,
              channel,
              provider: res.provider,
              status: res.status,
              providerRef: res.providerRef,
              failureReason: res.failureReason,
              subject,
              contentSnippet: body,
              idempotencyKey,
            });

            if (res.status === CommunicationStatus.SENT) sent++;
            else if (res.status === CommunicationStatus.FAILED) failed++;
            else if (res.status === CommunicationStatus.NOT_CONFIGURED) skipped++;
            break;
          }

          case CommunicationChannel.SMS: {
            if (!recipient.phone) {
              skipped++;
              break;
            }
            const res = await this.providersService.sendSms({
              to: recipient.phone,
              message: body,
            });

            await this.deliveryService.recordDelivery({
              campaignId: campaign.id,
              userId: recipient.userId,
              recipient: recipient.phone,
              recipientName: recipient.name,
              channel,
              provider: res.provider,
              status: res.status,
              providerRef: res.providerRef,
              failureReason: res.failureReason,
              subject,
              contentSnippet: body,
              idempotencyKey,
            });

            if (res.status === CommunicationStatus.SENT) sent++;
            else if (res.status === CommunicationStatus.FAILED) failed++;
            else if (res.status === CommunicationStatus.NOT_CONFIGURED) skipped++;
            break;
          }

          case CommunicationChannel.PUSH: {
            if (recipient.deviceTokens.length === 0) {
              skipped++;
              break;
            }
            for (const token of recipient.deviceTokens) {
              const res = await this.providersService.sendPush({
                deviceToken: token,
                title: subject,
                body,
              });

              await this.deliveryService.recordDelivery({
                campaignId: campaign.id,
                userId: recipient.userId,
                recipient: token,
                recipientName: recipient.name,
                channel,
                provider: res.provider,
                status: res.status,
                providerRef: res.providerRef,
                failureReason: res.failureReason,
                subject,
                contentSnippet: body,
                idempotencyKey: `${idempotencyKey}-${token.slice(-6)}`,
              });

              if (res.status === CommunicationStatus.SENT) sent++;
              else if (res.status === CommunicationStatus.FAILED) failed++;
              else if (res.status === CommunicationStatus.NOT_CONFIGURED) skipped++;
            }
            break;
          }

          case CommunicationChannel.WHATSAPP: {
            if (!recipient.phone) {
              skipped++;
              break;
            }
            const res = await this.providersService.sendWhatsApp({
              to: recipient.phone,
              templateCode: campaign.template?.code || 'general_announcement',
              language: 'en',
              variables: { '1': recipient.name, '2': campaign.title },
            });

            await this.deliveryService.recordDelivery({
              campaignId: campaign.id,
              userId: recipient.userId,
              recipient: recipient.phone,
              recipientName: recipient.name,
              channel,
              provider: res.provider,
              status: res.status,
              providerRef: res.providerRef,
              failureReason: res.failureReason,
              subject,
              contentSnippet: body,
              idempotencyKey,
            });

            if (res.status === CommunicationStatus.SENT) sent++;
            else if (res.status === CommunicationStatus.FAILED) failed++;
            else if (res.status === CommunicationStatus.NOT_CONFIGURED) skipped++;
            break;
          }
        }
      }
    }

    const finalStatus =
      failed > 0 && sent === 0 && delivered === 0
        ? CommunicationStatus.FAILED
        : CommunicationStatus.SENT;

    return this.prisma.communicationCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentAt: new Date(),
        totalRecipients: recipients.length,
        sentCount: sent,
        deliveredCount: delivered,
        failedCount: failed,
        skippedCount: skipped,
      },
    });
  }
}
