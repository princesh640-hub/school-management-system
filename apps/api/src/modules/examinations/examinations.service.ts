import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { EnterResultsDto } from './dto/enter-results.dto';
import { GradingEngineService } from './grading-engine.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateExamScheduleExtendedDto,
  AssignInvigilatorDto,
} from '@school/shared-types';

@Injectable()
export class ExaminationsService {
  private readonly logger = new Logger(ExaminationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gradingEngine: GradingEngineService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Phase 2 Legacy Schedule Methods (Preserved 100%)
  // ---------------------------------------------------------------------------

  async createSchedule(dto: CreateExamScheduleDto) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    if (dto.passingMarks > dto.maxMarks) {
      throw new BadRequestException('Passing marks cannot exceed maximum marks');
    }

    return this.prisma.examSchedule.create({
      data: {
        academicYearId: dto.academicYearId,
        subjectId: dto.subjectId,
        name: dto.name,
        examDate: new Date(dto.examDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        maxMarks: dto.maxMarks,
        passingMarks: dto.passingMarks,
      },
      include: {
        subject: {
          include: {
            class: true,
          },
        },
        academicYear: true,
      },
    });
  }

  // Extended schedule creation supporting session, class, section, room
  async createScheduleExtended(user: CurrentUserPayload, dto: CreateExamScheduleExtendedDto) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    if (dto.passingMarks > dto.maxMarks) {
      throw new BadRequestException('Passing marks cannot exceed maximum marks');
    }

    const schedule = await this.prisma.examSchedule.create({
      data: {
        academicYearId: dto.academicYearId,
        examSessionId: dto.examSessionId || null,
        examTypeId: dto.examTypeId || null,
        classId: dto.classId || null,
        sectionId: dto.sectionId || null,
        subjectId: dto.subjectId,
        roomId: dto.roomId || null,
        name: dto.name,
        examDate: new Date(dto.examDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        maxMarks: dto.maxMarks,
        passingMarks: dto.passingMarks,
        instructions: dto.instructions,
      },
      include: {
        subject: { include: { class: true } },
        academicYear: true,
        examSession: true,
        room: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'EXAM_SCHEDULE',
      resourceId: schedule.id,
      details: { name: schedule.name, examDate: schedule.examDate },
    });

    return schedule;
  }

  async getSchedules(academicYearId?: string, subjectId?: string, examSessionId?: string) {
    const where: any = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (subjectId) where.subjectId = subjectId;
    if (examSessionId) where.examSessionId = examSessionId;

    return this.prisma.examSchedule.findMany({
      where,
      orderBy: { examDate: 'asc' },
      include: {
        subject: true,
        class: true,
        section: true,
        academicYear: true,
        examSession: true,
        room: true,
        _count: {
          select: { examResults: true, invigilators: true, components: true },
        },
      },
    });
  }

  async getScheduleById(id: string) {
    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id },
      include: {
        subject: true,
        class: {
          include: {
            sections: true,
          },
        },
        section: true,
        academicYear: true,
        examSession: true,
        room: true,
        components: { orderBy: { sequence: 'asc' } },
        invigilators: {
          include: {
            teacher: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
            room: true,
          },
        },
      },
    });

    if (!schedule) throw new NotFoundException('Exam schedule not found');
    return schedule;
  }

  // Preserved Phase 2 computeGrade method
  computeGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  // Preserved Phase 2 enterResults method
  async enterResults(user: CurrentUserPayload, dto: EnterResultsDto) {
    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id: dto.examScheduleId },
    });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    const max = Number(schedule.maxMarks);

    const savedResults = [];
    for (const item of dto.results) {
      if (item.marksObtained > max) {
        throw new BadRequestException(
          `Marks obtained (${item.marksObtained}) cannot exceed max marks (${max})`,
        );
      }

      const percentage = (item.marksObtained / max) * 100;
      const grade = this.computeGrade(percentage);

      const res = await this.prisma.examResult.upsert({
        where: {
          examScheduleId_studentId: {
            examScheduleId: dto.examScheduleId,
            studentId: item.studentId,
          },
        },
        update: {
          marksObtained: item.marksObtained,
          grade,
          remarks: item.remarks,
          updatedBy: user.id,
        },
        create: {
          examScheduleId: dto.examScheduleId,
          studentId: item.studentId,
          marksObtained: item.marksObtained,
          grade,
          remarks: item.remarks,
          createdBy: user.id,
        },
      });
      savedResults.push(res);
    }

    return {
      message: `Successfully processed results for ${savedResults.length} students`,
      examScheduleId: dto.examScheduleId,
      processedCount: savedResults.length,
    };
  }

  // Preserved Phase 2 getScheduleResults method
  async getScheduleResults(scheduleId: string) {
    const schedule = await this.getScheduleById(scheduleId);
    const maxMarks = Number(schedule.maxMarks);
    const passingMarks = Number(schedule.passingMarks);

    const results = await this.prisma.examResult.findMany({
      where: { examScheduleId: scheduleId },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { section: true },
            },
          },
        },
      },
      orderBy: { marksObtained: 'desc' },
    });

    return {
      schedule: {
        id: schedule.id,
        name: schedule.name,
        subject: schedule.subject.name,
        class: schedule.subject.class.name,
        examDate: schedule.examDate,
        maxMarks,
        passingMarks,
      },
      summary: {
        totalSubmissions: results.length,
        passedCount: results.filter((r) => Number(r.marksObtained) >= passingMarks).length,
        failedCount: results.filter((r) => Number(r.marksObtained) < passingMarks).length,
        averageMarks:
          results.length > 0
            ? Math.round(
                (results.reduce((acc, r) => acc + Number(r.marksObtained), 0) / results.length) *
                  10,
              ) / 10
            : 0,
      },
      results: results.map((r) => {
        const marks = Number(r.marksObtained);
        const percentage = Math.round((marks / maxMarks) * 1000) / 10;
        return {
          id: r.id,
          studentId: r.studentId,
          studentName: `${r.student.user.firstName} ${r.student.user.lastName}`,
          admissionNumber: r.student.admissionNumber,
          section: r.student.enrollments[0]?.section?.name || 'N/A',
          marksObtained: marks,
          maxMarks,
          percentage,
          grade: r.grade,
          isPassed: marks >= passingMarks,
          remarks: r.remarks,
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Invigilator Assignments
  // ---------------------------------------------------------------------------

  async assignInvigilator(user: CurrentUserPayload, dto: AssignInvigilatorDto) {
    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id: dto.examScheduleId },
    });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found');

    // Collision check: Is this teacher already assigned to another exam at the same date and overlapping time?
    const conflicting = await this.prisma.examInvigilator.findFirst({
      where: {
        teacherId: dto.teacherId,
        examSchedule: {
          examDate: schedule.examDate,
          id: { not: dto.examScheduleId },
          AND: [
            { startTime: { lt: schedule.endTime } },
            { endTime: { gt: schedule.startTime } },
          ],
        },
      },
      include: { examSchedule: true },
    });

    if (conflicting) {
      throw new BadRequestException(
        `Teacher is already assigned as invigilator for '${conflicting.examSchedule.name}' during this time window`,
      );
    }

    const assignment = await this.prisma.examInvigilator.upsert({
      where: {
        examScheduleId_teacherId: {
          examScheduleId: dto.examScheduleId,
          teacherId: dto.teacherId,
        },
      },
      update: {
        roomId: dto.roomId || null,
        role: dto.role || 'PRIMARY',
      },
      create: {
        examScheduleId: dto.examScheduleId,
        teacherId: dto.teacherId,
        roomId: dto.roomId || null,
        role: dto.role || 'PRIMARY',
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ASSIGN_INVIGILATOR',
      resource: 'EXAM_INVIGILATOR',
      resourceId: assignment.id,
      details: { scheduleId: dto.examScheduleId, teacherId: dto.teacherId },
    });

    return assignment;
  }
}
