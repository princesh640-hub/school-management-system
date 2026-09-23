// =============================================================================
// Phase 4P: Teacher Communication & Section Notices Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TeacherAuthService } from './teacher-auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import {
  ITeacherNotice,
  ITeacherClassMessageDto,
} from '@school/shared-types';
import { AnnouncementStatus, AnnouncementPriority } from '@prisma/client';

@Injectable()
export class TeacherCommunicationService {
  private readonly logger = new Logger(TeacherCommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherAuth: TeacherAuthService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves announcements and circulars relevant to faculty.
   */
  async getNotices(userId: string): Promise<ITeacherNotice[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { campusId: true },
    });

    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        OR: [
          { targetType: 'ALL' },
          { roles: { has: 'TEACHER' } },
          { campusId: user?.campusId },
        ],
      },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority as any,
      publishedAt: a.publishedAt.toISOString(),
      authorName: a.author
        ? `${a.author.firstName} ${a.author.lastName}`.trim()
        : 'Administration',
      targetAudience: a.targetType,
    }));
  }

  /**
   * Retrieves teacher's personal notification inbox.
   */
  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  async markNotificationAsRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async markAllNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  /**
   * Sends an announcement to an assigned section.
   * Enforces strict assignment check so teachers cannot message arbitrary school-wide audiences.
   */
  async sendClassAnnouncement(userId: string, dto: ITeacherClassMessageDto) {
    const { teacher } = await this.teacherAuth.validateSectionAccess(userId, dto.sectionId);

    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
      include: { class: true },
    });

    const code = `ANN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const announcement = await this.prisma.announcement.create({
      data: {
        code,
        title: dto.title,
        content: dto.content,
        priority: (dto.priority as any) || AnnouncementPriority.NORMAL,
        targetType: 'CLASS_SECTION',
        classId: section?.classId,
        sectionId: dto.sectionId,
        authorId: userId,
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
        organizationId: teacher.user.organizationId,
        campusId: teacher.user.campusId,
      },
    });

    // Audit announcement
    await this.auditService.log({
      action: 'TEACHER_SECTION_ANNOUNCEMENT_CREATED',
      entity: 'Announcement',
      entityId: announcement.id,
      userId,
      details: {
        sectionId: dto.sectionId,
        title: dto.title,
      },
    });

    return {
      success: true,
      message: `Announcement posted to ${section?.class.name} - ${section?.name}.`,
      announcementId: announcement.id,
    };
  }

  /**
   * Alias for sendClassAnnouncement.
   */
  async sendSectionMessage(userId: string, dto: ITeacherClassMessageDto) {
    return this.sendClassAnnouncement(userId, dto);
  }
}
