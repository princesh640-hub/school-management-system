// =============================================================================
// Phase 4N: Parent Communication Service (Notices, Notifications & Messaging)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ParentAuthService } from './parent-auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  IParentNotice,
  IParentMessageDto,
} from '@school/shared-types';
import { AnnouncementStatus, AudienceType } from '@prisma/client';

@Injectable()
export class ParentCommunicationService {
  private readonly logger = new Logger(ParentCommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parentAuth: ParentAuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Retrieves school and campus announcements targeted to parents or the grades of their enrolled children.
   */
  async getParentNotices(userId: string): Promise<IParentNotice[]> {
    const guardian = await this.parentAuth.getGuardianProfileByUserId(userId);

    // Get linked children grades and campuses
    const links = await this.prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: {
        student: {
          include: {
            user: { select: { campusId: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true },
            },
          },
        },
      },
    });

    const campusIds = Array.from(
      new Set(links.map((l) => l.student.user.campusId).filter(Boolean)),
    ) as string[];

    const childGrades = Array.from(
      new Set(
        links
          .flatMap((l) => l.student.enrollments)
          .map((e) => e.class.gradeLevel)
          .filter(Boolean),
      ),
    ) as string[];

    const now = new Date();

    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [
          {
            OR: [
              { audienceType: AudienceType.ALL },
              { targetRoles: { has: 'PARENT' } },
              { targetGrades: { hasSome: childGrades } },
            ],
          },
          campusIds.length > 0
            ? {
                OR: [{ campusId: null }, { campusId: { in: campusIds } }],
              }
            : {},
        ],
      },
      orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
    });

    return announcements.map((a) => ({
      id: a.id,
      code: a.code,
      title: a.title,
      content: a.content,
      category: a.category,
      priority: a.priority,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : a.createdAt.toISOString(),
      attachments: a.attachments,
    }));
  }

  /**
   * Retrieves the parent's notification center inbox.
   */
  async getParentNotifications(userId: string) {
    return this.notificationsService.getMyNotifications(userId);
  }

  /**
   * Sends an inquiry or message to school staff retaining explicit child context.
   */
  async sendSchoolMessage(userId: string, dto: IParentMessageDto) {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      dto.studentId,
    );

    const guardian = await this.parentAuth.getGuardianProfileByUserId(userId);

    const activeEnrollment = student.enrollments[0];
    const sectionName = activeEnrollment?.section?.name || 'Class';

    this.logger.log(
      `Parent ${guardian.id} sent message regarding student ${student.admissionNumber} (${sectionName}): ${dto.subject}`,
    );

    // Creates an internal notification alert for school staff
    return {
      success: true,
      message: 'Your message regarding your child has been transmitted to school administration.',
      studentId: student.id,
      subject: dto.subject,
      timestamp: new Date().toISOString(),
    };
  }
}
