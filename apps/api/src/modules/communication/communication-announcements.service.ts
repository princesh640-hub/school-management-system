// =============================================================================
// Phase 4M: Institutional Announcements Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  AnnouncementStatus,
  CommunicationPriority,
  AudienceType,
} from '@prisma/client';
import {
  ICreateAnnouncementDto,
  IUpdateAnnouncementDto,
} from '@school/shared-types';
import { NotificationsService } from '../notifications/notifications.service';
import { CommunicationAudienceService } from './communication-audience.service';

@Injectable()
export class CommunicationAnnouncementsService {
  private readonly logger = new Logger(CommunicationAnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly audienceService: CommunicationAudienceService,
  ) {}

  /**
   * Generates sequential announcement code in the format ANN-YYYY-XXXXX.
   */
  private async generateAnnouncementCode(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.announcement.count({
      where: {
        organizationId,
        code: { startsWith: `ANN-${year}-` },
      },
    });
    return `ANN-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Creates a new institutional announcement.
   */
  async createAnnouncement(
    organizationId: string,
    authorId: string,
    dto: ICreateAnnouncementDto,
  ) {
    const code = await this.generateAnnouncementCode(organizationId);

    const priority =
      (dto.priority as CommunicationPriority) || CommunicationPriority.NORMAL;
    const audienceType =
      (dto.audienceType as AudienceType) || AudienceType.ALL;

    let status =
      (dto.status as AnnouncementStatus) || AnnouncementStatus.DRAFT;

    if (dto.scheduledFor && new Date(dto.scheduledFor) > new Date()) {
      status = AnnouncementStatus.SCHEDULED;
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        organizationId,
        campusId: dto.campusId,
        code,
        title: dto.title,
        content: dto.content,
        category: dto.category || 'GENERAL',
        priority,
        status,
        audienceType,
        targetRoles: dto.targetRoles || [],
        targetGrades: dto.targetGrades || [],
        authorId,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        attachments: dto.attachments || [],
        publishedAt: status === AnnouncementStatus.PUBLISHED ? new Date() : null,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // If immediately published, fan-out in-app notifications
    if (status === AnnouncementStatus.PUBLISHED) {
      await this.fanOutAnnouncementNotifications(announcement);
    }

    return announcement;
  }

  /**
   * Lists announcements with filtering for management portal or student/parent feed.
   */
  async listAnnouncements(
    organizationId: string,
    filters?: {
      campusId?: string;
      status?: AnnouncementStatus;
      category?: string;
      search?: string;
      publishedOnly?: boolean;
      userRole?: string;
      userGrade?: string;
    },
  ) {
    const where: any = { organizationId };

    if (filters?.campusId) {
      where.campusId = filters.campusId;
    }

    if (filters?.publishedOnly) {
      where.status = AnnouncementStatus.PUBLISHED;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    } else if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { content: { contains: filters.search, mode: 'insensitive' } },
            { code: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        campus: {
          select: { id: true, name: true },
        },
      },
    });

    // Apply client-role / grade filtering if requested
    if (filters?.userRole) {
      return announcements.filter((a) => {
        if (a.audienceType === AudienceType.ALL) return true;
        if (a.targetRoles.length === 0) return true;
        return a.targetRoles.includes(filters.userRole!);
      });
    }

    return announcements;
  }

  /**
   * Retrieves an announcement by ID and increments view count.
   */
  async getAnnouncementById(organizationId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, organizationId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        campus: {
          select: { id: true, name: true },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID '${id}' not found.`);
    }

    // Increment views in background
    await this.prisma.announcement.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return announcement;
  }

  /**
   * Updates an announcement.
   */
  async updateAnnouncement(
    organizationId: string,
    id: string,
    dto: IUpdateAnnouncementDto,
  ) {
    const announcement = await this.getAnnouncementById(organizationId, id);

    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new BadRequestException('Archived announcements cannot be modified.');
    }

    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        priority: dto.priority as CommunicationPriority,
        status: dto.status as AnnouncementStatus,
        audienceType: dto.audienceType as AudienceType,
        targetRoles: dto.targetRoles,
        targetGrades: dto.targetGrades,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        attachments: dto.attachments,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Publishes a draft or scheduled announcement immediately and sends notifications.
   */
  async publishAnnouncement(
    organizationId: string,
    id: string,
    userId?: string,
  ) {
    const announcement = await this.getAnnouncementById(organizationId, id);

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await this.fanOutAnnouncementNotifications(updated);

    return updated;
  }

  /**
   * Archives an announcement.
   */
  async archiveAnnouncement(organizationId: string, id: string) {
    await this.getAnnouncementById(organizationId, id);

    return this.prisma.announcement.update({
      where: { id },
      data: { status: AnnouncementStatus.ARCHIVED },
    });
  }

  /**
   * Deletes an announcement.
   */
  async deleteAnnouncement(organizationId: string, id: string) {
    await this.getAnnouncementById(organizationId, id);
    return this.prisma.announcement.delete({
      where: { id },
    });
  }

  /**
   * Fans out in-app notifications for a published announcement to its target audience.
   */
  private async fanOutAnnouncementNotifications(announcement: any) {
    try {
      const recipients = await this.audienceService.resolveRecipients(
        announcement.organizationId,
        announcement.audienceType,
        {
          campusId: announcement.campusId,
          roles: announcement.targetRoles,
          grades: announcement.targetGrades,
        },
      );

      if (recipients.length === 0) return;

      const notificationsData = recipients.map((r) => ({
        organizationId: announcement.organizationId,
        userId: r.userId,
        title: `📢 ${announcement.title}`,
        message: announcement.content.length > 200
          ? `${announcement.content.substring(0, 197)}...`
          : announcement.content,
        type: 'ANNOUNCEMENT',
        priority: announcement.priority,
        category: announcement.category,
        linkUrl: `/portal/communication?announcementId=${announcement.id}`,
        isRead: false,
      }));

      await this.prisma.notification.createMany({
        data: notificationsData,
      });

      this.logger.log(
        `Fanned out announcement '${announcement.code}' to ${notificationsData.length} users.`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to fan out announcement notifications: ${err.message}`,
      );
    }
  }
}
