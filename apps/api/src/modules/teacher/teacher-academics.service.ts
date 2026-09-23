// =============================================================================
// Phase 4P: Teacher Academics, Timetable, Fast Attendance & Marks Entry Service
// =============================================================================
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TeacherAuthService } from './teacher-auth.service';
import { AuditService } from '../audit/audit.service';
import {
  ITeacherTimetable,
  ITeacherTimetableSlot,
  ITeacherAttendanceRoster,
  ITeacherMarkAttendanceDto,
  ITeacherAttendanceCorrectionDto,
  ITeacherExamTask,
  ITeacherMarksRoster,
  ITeacherSubmitMarksDto,
  ITeacherMarksCorrectionDto,
  ITeacherResultSummary,
} from '@school/shared-types';
import {
  TimetableStatus,
  RecordStatus,
  MarksEntryStatus,
  ExamSessionStatus,
  AttendanceStatus,
} from '@prisma/client';

@Injectable()
export class TeacherAcademicsService {
  private readonly logger = new Logger(TeacherAcademicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherAuth: TeacherAuthService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Published Timetable
  // ---------------------------------------------------------------------------

  async getTimetable(userId: string): Promise<ITeacherTimetable> {
    const teacher = await this.teacherAuth.getTeacherProfileByUserId(userId);

    const entries = await this.prisma.timetableEntry.findMany({
      where: {
        teacherId: teacher.id,
        timetableVersion: { status: TimetableStatus.PUBLISHED },
      },
      include: {
        period: true,
        subject: true,
        section: {
          include: { class: true },
        },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
    });

    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = daysOfWeek[new Date().getDay()];

    const weeklyEntries: Record<string, ITeacherTimetableSlot[]> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
    };

    entries.forEach((e) => {
      const slot: ITeacherTimetableSlot = {
        periodId: e.periodId,
        periodName: e.period.name,
        periodNumber: e.period.periodNumber,
        startTime: e.period.startTime,
        endTime: e.period.endTime,
        dayOfWeek: e.dayOfWeek,
        isBreak: e.period.isBreak,
        subjectName: e.subject.name,
        subjectCode: e.subject.code,
        className: e.section.class.name,
        sectionName: e.section.name,
        roomNumber: e.room?.roomNumber || null,
      };

      if (!weeklyEntries[e.dayOfWeek]) {
        weeklyEntries[e.dayOfWeek] = [];
      }
      weeklyEntries[e.dayOfWeek].push(slot);
    });

    return {
      todayEntries: weeklyEntries[currentDay] || [],
      weeklyEntries,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Fast Attendance Marking & Correction
  // ---------------------------------------------------------------------------

  async getAttendanceRoster(
    userId: string,
    sectionId: string,
    date: string,
  ): Promise<ITeacherAttendanceRoster> {
    await this.teacherAuth.validateSectionAccess(userId, sectionId);

    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { class: true },
    });

    if (!section) throw new NotFoundException('Section not found.');

    const targetDate = new Date(date);

    // Get enrolled students
    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId, status: RecordStatus.ACTIVE },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    // Get existing attendance records for this date
    const existingRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        sectionId,
        date: targetDate,
      },
    });

    const isMarked = existingRecords.length > 0;
    const isLocked = existingRecords.some((r) => r.isLocked);

    const recordsMap = new Map<string, any>();
    existingRecords.forEach((r) => recordsMap.set(r.studentId, r));

    return {
      sectionId,
      className: section.class.name,
      sectionName: section.name,
      date,
      isMarked,
      isLocked,
      students: enrollments.map((en) => {
        const existing = recordsMap.get(en.student.id);
        return {
          studentId: en.student.id,
          admissionNumber: en.student.admissionNumber,
          rollNumber: en.rollNumber,
          fullName: `${en.student.user.firstName} ${en.student.user.lastName}`.trim(),
          avatarUrl: en.student.user.avatarUrl,
          status: existing ? (existing.status as any) : 'PRESENT',
          remarks: existing?.remarks || null,
        };
      }),
    };
  }

  async markAttendance(userId: string, dto: ITeacherMarkAttendanceDto) {
    await this.teacherAuth.validateSectionAccess(userId, dto.sectionId);

    const targetDate = new Date(dto.date);

    // Check if locked
    const lockedRecords = await this.prisma.attendanceRecord.findFirst({
      where: {
        sectionId: dto.sectionId,
        date: targetDate,
        isLocked: true,
      },
    });

    if (lockedRecords) {
      throw new BadRequestException(
        'Attendance for this date has been finalized and locked. Please submit an attendance correction request.',
      );
    }

    // Upsert attendance records
    await this.prisma.$transaction(
      dto.records.map((rec) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            // using unique fields if available or findFirst replacement
            id: `temp-${dto.sectionId}-${rec.studentId}-${dto.date}`,
          },
          create: {
            studentId: rec.studentId,
            sectionId: dto.sectionId,
            date: targetDate,
            status: rec.status as AttendanceStatus,
            remarks: rec.remarks || null,
            createdBy: userId,
          },
          update: {
            status: rec.status as AttendanceStatus,
            remarks: rec.remarks || null,
            updatedBy: userId,
          },
        }),
      ),
    ).catch(async () => {
      // Fallback clean loop for databases without compound unique key on attendance
      for (const rec of dto.records) {
        const existing = await this.prisma.attendanceRecord.findFirst({
          where: {
            studentId: rec.studentId,
            sectionId: dto.sectionId,
            date: targetDate,
          },
        });

        if (existing) {
          await this.prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              status: rec.status as AttendanceStatus,
              remarks: rec.remarks || null,
              updatedBy: userId,
            },
          });
        } else {
          await this.prisma.attendanceRecord.create({
            data: {
              studentId: rec.studentId,
              sectionId: dto.sectionId,
              date: targetDate,
              status: rec.status as AttendanceStatus,
              remarks: rec.remarks || null,
              createdBy: userId,
            },
          });
        }
      }
    });

    // Audit log
    await this.auditService.log({
      action: 'TEACHER_ATTENDANCE_MARKED',
      entity: 'AttendanceRecord',
      entityId: dto.sectionId,
      userId,
      details: {
        sectionId: dto.sectionId,
        date: dto.date,
        recordsCount: dto.records.length,
      },
    });

    return {
      success: true,
      message: 'Attendance saved successfully.',
      markedCount: dto.records.length,
    };
  }

  async requestAttendanceCorrection(
    userId: string,
    dto: ITeacherAttendanceCorrectionDto,
  ) {
    await this.teacherAuth.validateSectionAccess(userId, dto.sectionId);
    await this.teacherAuth.validateStudentAccess(userId, dto.studentId);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        studentId: dto.studentId,
        sectionId: dto.sectionId,
        date: new Date(dto.date),
      },
    });

    if (!record) {
      throw new NotFoundException('No existing attendance record found for this student on the specified date.');
    }

    const correction = await this.prisma.attendanceCorrection.create({
      data: {
        attendanceRecordId: record.id,
        requestedStatus: dto.requestedStatus as AttendanceStatus,
        reason: dto.reason,
        requestedById: userId,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Attendance correction request submitted to administration.',
      correctionId: correction.id,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Examinations & Marks Entry
  // ---------------------------------------------------------------------------

  async getExamTasks(userId: string): Promise<ITeacherExamTask[]> {
    const teacher = await this.teacherAuth.getTeacherProfileByUserId(userId);
    const assignedSectionIds = await this.teacherAuth.getAssignedSectionIds(teacher.id);

    const schedules = await this.prisma.examSchedule.findMany({
      where: {
        OR: [
          { sectionId: { in: assignedSectionIds } },
          { invigilators: { some: { teacherId: teacher.id } } },
        ],
      },
      include: {
        examSession: true,
        subject: true,
        section: {
          include: {
            class: true,
            enrollments: { where: { status: RecordStatus.ACTIVE } },
          },
        },
        results: {
          select: { id: true, status: true },
        },
        room: true,
      },
      orderBy: { examDate: 'desc' },
    });

    return schedules.map((s) => {
      const totalStudents = s.section?.enrollments.length || 0;
      const enteredMarksCount = s.results.length;
      const isSubmitted = s.results.length > 0 && s.results.every((r) => r.status !== MarksEntryStatus.DRAFT);

      return {
        examScheduleId: s.id,
        examSessionName: s.examSession.name,
        subjectName: s.subject.name,
        subjectCode: s.subject.code,
        className: s.section?.class.name || 'Class',
        sectionName: s.section?.name || 'Section',
        examDate: s.examDate.toISOString().split('T')[0],
        startTime: s.startTime,
        endTime: s.endTime,
        roomNumber: s.room?.roomNumber || null,
        maxMarks: Number(s.maxMarks),
        passingMarks: Number(s.passingMarks),
        totalStudents,
        enteredMarksCount,
        isSubmitted,
        status: s.results[0]?.status || 'NOT_STARTED',
      };
    });
  }

  async getMarksRoster(
    userId: string,
    examScheduleId: string,
  ): Promise<ITeacherMarksRoster> {
    const { schedule } = await this.teacherAuth.validateExamAccess(userId, examScheduleId);

    const scheduleWithRelations = await this.prisma.examSchedule.findUnique({
      where: { id: examScheduleId },
      include: {
        examSession: true,
        subject: true,
        section: {
          include: {
            class: true,
            enrollments: {
              where: { status: RecordStatus.ACTIVE },
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true } },
                  },
                },
              },
              orderBy: { rollNumber: 'asc' },
            },
          },
        },
        results: true,
      },
    });

    if (!scheduleWithRelations) throw new NotFoundException('Exam schedule details not found.');

    const resultsMap = new Map<string, any>();
    scheduleWithRelations.results.forEach((r) => resultsMap.set(r.studentId, r));

    const enrollments = scheduleWithRelations.section?.enrollments || [];
    const isSubmitted =
      scheduleWithRelations.results.length > 0 &&
      scheduleWithRelations.results.every((r) => r.status !== MarksEntryStatus.DRAFT);

    return {
      examScheduleId,
      examSessionName: scheduleWithRelations.examSession.name,
      subjectName: scheduleWithRelations.subject.name,
      className: scheduleWithRelations.section?.class.name || 'Class',
      sectionName: scheduleWithRelations.section?.name || 'Section',
      maxMarks: Number(scheduleWithRelations.maxMarks),
      passingMarks: Number(scheduleWithRelations.passingMarks),
      isSubmitted,
      students: enrollments.map((en) => {
        const res = resultsMap.get(en.student.id);
        return {
          studentId: en.student.id,
          admissionNumber: en.student.admissionNumber,
          rollNumber: en.rollNumber,
          fullName: `${en.student.user.firstName} ${en.student.user.lastName}`.trim(),
          marksObtained: res?.marksObtained ? Number(res.marksObtained) : null,
          isAbsent: res?.isAbsent || false,
          isExempt: res?.isExempt || false,
          grade: res?.grade || null,
          remarks: res?.remarks || null,
          status: res?.status || 'NOT_ENTERED',
        };
      }),
    };
  }

  async submitMarks(userId: string, dto: ITeacherSubmitMarksDto) {
    const { schedule } = await this.teacherAuth.validateExamAccess(userId, dto.examScheduleId);

    const maxMarks = Number(schedule.maxMarks);

    // Validate marks client-side and server-side
    for (const rec of dto.records) {
      if (rec.marksObtained !== undefined && rec.marksObtained !== null) {
        if (rec.marksObtained < 0 || rec.marksObtained > maxMarks) {
          throw new BadRequestException(
            `Invalid marks obtained: ${rec.marksObtained}. Must be between 0 and maximum marks (${maxMarks}).`,
          );
        }
      }
    }

    const newStatus = dto.submitFinal ? MarksEntryStatus.SUBMITTED : MarksEntryStatus.DRAFT;

    for (const rec of dto.records) {
      const existing = await this.prisma.examResult.findFirst({
        where: {
          examScheduleId: dto.examScheduleId,
          studentId: rec.studentId,
        },
      });

      const marks = rec.marksObtained ?? 0;
      const percentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
      const isPassed = marks >= Number(schedule.passingMarks);

      // Simple grading scale fallback
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';

      if (existing) {
        if (existing.status === MarksEntryStatus.LOCKED) {
          throw new BadRequestException('Marks for this exam are locked. Modification requires an approved correction request.');
        }

        await this.prisma.examResult.update({
          where: { id: existing.id },
          data: {
            marksObtained: marks,
            percentage,
            grade,
            isPassed,
            isAbsent: rec.isAbsent || false,
            isExempt: rec.isExempt || false,
            remarks: rec.remarks || null,
            status: newStatus,
          },
        });
      } else {
        await this.prisma.examResult.create({
          data: {
            examScheduleId: dto.examScheduleId,
            studentId: rec.studentId,
            marksObtained: marks,
            percentage,
            grade,
            isPassed,
            isAbsent: rec.isAbsent || false,
            isExempt: rec.isExempt || false,
            remarks: rec.remarks || null,
            status: newStatus,
          },
        });
      }
    }

    // Audit marks entry / submission
    await this.auditService.log({
      action: dto.submitFinal ? 'TEACHER_MARKS_SUBMITTED' : 'TEACHER_MARKS_DRAFT_SAVED',
      entity: 'ExamSchedule',
      entityId: dto.examScheduleId,
      userId,
      details: {
        examScheduleId: dto.examScheduleId,
        recordsCount: dto.records.length,
        status: newStatus,
      },
    });

    return {
      success: true,
      message: dto.submitFinal
        ? 'Marks submitted successfully for administrative review.'
        : 'Marks draft saved successfully.',
      status: newStatus,
    };
  }

  async requestMarksCorrection(userId: string, dto: ITeacherMarksCorrectionDto) {
    const result = await this.prisma.examResult.findUnique({
      where: { id: dto.examResultId },
      include: { examSchedule: true },
    });

    if (!result) throw new NotFoundException('Exam result record not found.');

    await this.teacherAuth.validateExamAccess(userId, result.examScheduleId);

    const maxMarks = Number(result.examSchedule.maxMarks);
    if (dto.requestedMarks < 0 || dto.requestedMarks > maxMarks) {
      throw new BadRequestException(`Requested marks must be between 0 and maximum marks (${maxMarks}).`);
    }

    const correction = await this.prisma.marksCorrectionRequest.create({
      data: {
        examResultId: result.id,
        currentMarks: result.marksObtained,
        requestedMarks: dto.requestedMarks,
        reason: dto.reason,
        requestedBy: userId,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Marks correction request submitted successfully.',
      correctionRequestId: correction.id,
    };
  }

  async getResultSummary(
    userId: string,
    examScheduleId: string,
  ): Promise<ITeacherResultSummary> {
    await this.teacherAuth.validateExamAccess(userId, examScheduleId);

    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id: examScheduleId },
      include: {
        examSession: true,
        subject: true,
        section: { include: { class: true } },
        results: true,
      },
    });

    if (!schedule) throw new NotFoundException('Exam schedule not found.');

    const results = schedule.results.filter((r) => !r.isAbsent && !r.isExempt);
    const totalAppeared = results.length;
    const totalPassed = results.filter((r) => r.isPassed).length;
    const totalFailed = totalAppeared - totalPassed;
    const passPercentage = totalAppeared > 0 ? Number(((totalPassed / totalAppeared) * 100).toFixed(1)) : 0;

    const scores = results.map((r) => Number(r.marksObtained));
    const averageMarks = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
    const highestMarks = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestMarks = scores.length > 0 ? Math.min(...scores) : 0;

    return {
      examScheduleId,
      examSessionName: schedule.examSession.name,
      subjectName: schedule.subject.name,
      className: schedule.section?.class.name || 'Class',
      sectionName: schedule.section?.name || 'Section',
      totalAppeared,
      totalPassed,
      totalFailed,
      passPercentage,
      averageMarks,
      highestMarks,
      lowestMarks,
    };
  }

  /**
   * Alias for getTimetable.
   */
  async getWeeklyTimetable(userId: string) {
    return this.getTimetable(userId);
  }

  /**
   * Alias for getResultSummary.
   */
  async getClassResultSummary(userId: string, examScheduleId: string) {
    return this.getResultSummary(userId, examScheduleId);
  }
}
