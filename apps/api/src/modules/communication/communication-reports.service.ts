// =============================================================================
// Phase 4M: Communication Reports & Analytics Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CommunicationChannel,
  CommunicationStatus,
  AnnouncementStatus,
} from '@prisma/client';
import {
  ICommunicationDashboardKpis,
} from '@school/shared-types';
import { CommunicationProvidersService } from './communication-providers.service';

@Injectable()
export class CommunicationReportsService {
  private readonly logger = new Logger(CommunicationReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: CommunicationProvidersService,
  ) {}

  /**
   * Aggregates organization-wide communication metrics, delivery success rates,
   * and channel distribution for the administrative Command Center.
   */
  async getDashboardKpis(
    organizationId: string,
    campusId?: string,
  ): Promise<ICommunicationDashboardKpis> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const deliveryBaseWhere: any = {
      OR: [
        { campaign: { organizationId } },
        { user: { organizationId } },
      ],
    };

    if (campusId) {
      deliveryBaseWhere.campaign = { organizationId, campusId };
    }

    const [
      messagesTodayCount,
      queuedCount,
      sentCount,
      deliveredCount,
      failedCount,
      scheduledCount,
      activeAnnouncementsCount,
      unreadInAppCount,
      channelDeliveries,
    ] = await Promise.all([
      // Messages today
      this.prisma.communicationDelivery.count({
        where: {
          ...deliveryBaseWhere,
          createdAt: { gte: startOfToday },
        },
      }),

      // Queued
      this.prisma.communicationDelivery.count({
        where: {
          ...deliveryBaseWhere,
          status: { in: [CommunicationStatus.QUEUED, CommunicationStatus.PROCESSING] },
        },
      }),

      // Sent
      this.prisma.communicationDelivery.count({
        where: {
          ...deliveryBaseWhere,
          status: CommunicationStatus.SENT,
        },
      }),

      // Delivered
      this.prisma.communicationDelivery.count({
        where: {
          ...deliveryBaseWhere,
          status: CommunicationStatus.DELIVERED,
        },
      }),

      // Failed
      this.prisma.communicationDelivery.count({
        where: {
          ...deliveryBaseWhere,
          status: CommunicationStatus.FAILED,
        },
      }),

      // Scheduled campaigns
      this.prisma.communicationCampaign.count({
        where: {
          organizationId,
          ...(campusId ? { campusId } : {}),
          status: CommunicationStatus.QUEUED,
          scheduledAt: { gt: new Date() },
        },
      }),

      // Active announcements
      this.prisma.announcement.count({
        where: {
          organizationId,
          ...(campusId ? { campusId } : {}),
          status: AnnouncementStatus.PUBLISHED,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),

      // Unread in-app notifications
      this.prisma.notification.count({
        where: {
          organizationId,
          isRead: false,
        },
      }),

      // Breakdown by channel
      this.prisma.communicationDelivery.groupBy({
        by: ['channel', 'status'],
        where: deliveryBaseWhere,
        _count: { id: true },
      }),
    ]);

    const channels: CommunicationChannel[] = [
      CommunicationChannel.IN_APP,
      CommunicationChannel.EMAIL,
      CommunicationChannel.SMS,
      CommunicationChannel.PUSH,
      CommunicationChannel.WHATSAPP,
    ];

    const channelsSummary = channels.map((channel) => {
      const channelItems = channelDeliveries.filter((d) => d.channel === channel);
      const count = channelItems.reduce((acc, curr) => acc + curr._count.id, 0);
      const delivered = channelItems
        .filter((d) => d.status === CommunicationStatus.DELIVERED)
        .reduce((acc, curr) => acc + curr._count.id, 0);
      const failed = channelItems
        .filter((d) => d.status === CommunicationStatus.FAILED)
        .reduce((acc, curr) => acc + curr._count.id, 0);

      return {
        channel,
        count,
        delivered,
        failed,
      };
    });

    return {
      messagesTodayCount,
      queuedCount,
      sentCount,
      deliveredCount,
      failedCount,
      scheduledCount,
      activeAnnouncementsCount,
      unreadInAppCount,
      channelsSummary,
    };
  }

  /**
   * Retrieves provider status summary and configuration readiness.
   */
  getProviderStatusSummary() {
    return this.providersService.getProviderStatusSummary();
  }
}
