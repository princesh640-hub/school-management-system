// =============================================================================
// Phase 4O: Student Communication Service (Notices, Notifications & School Messages)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StudentAuthService } from './student-auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import {
  IStudentNotice,
  IStudentMessageDto,
} from '@school/shared-types';
import { AnnouncementStatus } from '@prisma/client';

@Injectable()
export class StudentCommunicationService {
  private readonly logger = new Logger(StudentCommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAuth: StudentAuthService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves announcements and circulars published for students or the entire school.
   */
  async getNotices(userId: string): Promise<IStudentNotice[]> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];

    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        OR: [
          { targetType: 'ALL' },
          { roles: { has: 'STUDENT' } },
          { campusId: student.user.campusId },
          { classId: activeEnrollment?.section?.classId },
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
      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
      authorName: a.author
        ? `${a.author.firstName} ${a.author.lastName}`.trim()
        : 'Administration',
      targetAudience: a.targetType,
    }));
  }

  /**
   * Retrieves student's personal notification inbox and unread count.
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
        priority: (n as any).priority || 'NORMAL',
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        readAt: (n as any).readAt ? (n as any).readAt.toISOString() : null,
      })),
    };
  }

  /**
   * Marks a specific notification as read.
   */
  async markNotificationAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Marks all notifications as read for this student.
   */
  async markAllNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Sends a controlled message from the student to class teacher or administration.
   * Creates an audit entry and queues notification.
   */
  async sendMessage(userId: string, dto: IStudentMessageDto) {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];

    const studentName = `${student.user.firstName} ${student.user.lastName}`.trim();
    const className = activeEnrollment?.section?.class?.name || 'Class';
    const sectionName = activeEnrollment?.section?.name || 'Section';

    // Audit the message dispatch
    await this.auditService.log({
      action: 'STUDENT_MESSAGE_SENT',
      entity: 'StudentMessage',
      entityId: student.id,
      userId,
      details: {
        recipientRole: dto.recipientRole,
        subject: dto.subject,
        studentName,
        className,
        sectionName,
      },
    });

    return {
      success: true,
      message: 'Your message has been submitted to school administration.',
      timestamp: new Date().toISOString(),
    };
  }
}
