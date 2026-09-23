import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  ExamSessionStatus,
  CreateExamTypeDto,
  CreateExamSessionDto,
} from '@school/shared-types';

const VALID_TRANSITIONS: Record<ExamSessionStatus, ExamSessionStatus[]> = {
  DRAFT: ['SCHEDULED', 'ARCHIVED'],
  SCHEDULED: ['IN_PROGRESS', 'DRAFT', 'ARCHIVED'],
  IN_PROGRESS: ['COMPLETED', 'SCHEDULED'],
  COMPLETED: ['REVIEW', 'IN_PROGRESS'],
  REVIEW: ['APPROVED', 'COMPLETED'],
  APPROVED: ['LOCKED', 'REVIEW'],
  LOCKED: ['PUBLISHED', 'APPROVED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
};

@Injectable()
export class ExamSessionsService {
  private readonly logger = new Logger(ExamSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Exam Types
  // ---------------------------------------------------------------------------

  async createExamType(user: CurrentUserPayload, dto: CreateExamTypeDto) {
    const existing = await this.prisma.examType.findFirst({
      where: {
        organizationId: user.organizationId,
        code: dto.code.toUpperCase().trim(),
        campusId: dto.campusId || null,
      },
    });

    if (existing) {
      throw new BadRequestException(`Exam type with code ${dto.code} already exists`);
    }

    const examType = await this.prisma.examType.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        name: dto.name,
        code: dto.code.toUpperCase().trim(),
        description: dto.description,
        weight: dto.weight !== undefined ? Number(dto.weight) : null,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'EXAM_TYPE',
      resourceId: examType.id,
      details: { name: examType.name, code: examType.code },
    });

    return examType;
  }

  async getExamTypes(user: CurrentUserPayload, campusId?: string) {
    return this.prisma.examType.findMany({
      where: {
        organizationId: user.organizationId,
        ...(campusId ? { OR: [{ campusId }, { campusId: null }] } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Exam Sessions
  // ---------------------------------------------------------------------------

  async createExamSession(user: CurrentUserPayload, dto: CreateExamSessionDto) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) throw new NotFoundException('Academic year not found');

    const examType = await this.prisma.examType.findUnique({
      where: { id: dto.examTypeId },
    });
    if (!examType) throw new NotFoundException('Exam type not found');

    const session = await this.prisma.examSession.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        academicYearId: dto.academicYearId,
        termId: dto.termId || null,
        examTypeId: dto.examTypeId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'DRAFT',
      },
      include: {
        examType: true,
        academicYear: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'EXAM_SESSION',
      resourceId: session.id,
      details: { name: session.name, status: session.status },
    });

    return session;
  }

  async getExamSessions(
    user: CurrentUserPayload,
    academicYearId?: string,
    status?: ExamSessionStatus,
  ) {
    const where: any = { organizationId: user.organizationId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (status) where.status = status;

    return this.prisma.examSession.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        examType: true,
        academicYear: true,
        _count: {
          select: {
            schedules: true,
            overallResults: true,
            reportCards: true,
          },
        },
      },
    });
  }

  async getExamSessionById(id: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id },
      include: {
        examType: true,
        academicYear: true,
        schedules: {
          include: {
            subject: true,
            class: true,
            section: true,
            room: true,
            components: true,
            invigilators: {
              include: {
                teacher: {
                  include: {
                    user: { select: { firstName: true, lastName: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Exam session not found');
    return session;
  }

  async updateSessionStatus(
    id: string,
    targetStatus: ExamSessionStatus,
    user: CurrentUserPayload,
  ) {
    const session = await this.prisma.examSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Exam session not found');

    const currentStatus = session.status as ExamSessionStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus) && targetStatus !== currentStatus) {
      throw new BadRequestException(
        `Illegal session status transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`,
      );
    }

    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === 'PUBLISHED') {
      updateData.publishedAt = new Date();
      updateData.publishedBy = user.id;
    }

    const updated = await this.prisma.examSession.update({
      where: { id },
      data: updateData,
      include: {
        examType: true,
        academicYear: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE_STATUS',
      resource: 'EXAM_SESSION',
      resourceId: id,
      details: { previousStatus: currentStatus, newStatus: targetStatus },
    });

    if (targetStatus === 'PUBLISHED') {
      await this.notificationsService.create({
        organizationId: user.organizationId,
        title: 'Examination Results Published',
        message: `Official examination results for session "${session.name}" have been published.`,
        type: 'SYSTEM',
        recipientRole: 'STUDENT',
      });
    }

    return updated;
  }
}
