import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AttendanceStatus, SystemRole } from '@school/shared-types';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Verify whether teacher has permission to access this section
   */
  async verifySectionAccess(user: CurrentUserPayload, sectionId: string) {
    if (user.roles.includes(SystemRole.SUPER_ADMIN) || user.roles.includes(SystemRole.PRINCIPAL)) {
      return true;
    }

    if (user.roles.includes(SystemRole.TEACHER) || user.roles.includes(SystemRole.CLASS_TEACHER)) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.id },
      });

      if (!teacher) throw new ForbiddenException('Teacher profile not found');

      // Check if class teacher of section
      const isClassTeacher = await this.prisma.section.findFirst({
        where: { id: sectionId, classTeacherId: teacher.id },
      });

      if (isClassTeacher) return true;

      // Check if subject teacher of section
      const isSubjectTeacher = await this.prisma.subjectTeacher.findFirst({
        where: { sectionId, teacherId: teacher.id },
      });

      if (isSubjectTeacher) return true;

      // Check if primary teacher in SubjectOffering (Phase 4C)
      const isOfferingTeacher = await this.prisma.subjectOffering.findFirst({
        where: { sectionId, primaryTeacherId: teacher.id },
      });

      if (isOfferingTeacher) return true;

      throw new ForbiddenException('You are not assigned to mark attendance for this section');
    }

    return true;
  }

  /**
   * Check if a date is designated as a holiday in Phase 4C Academic Calendar
   */
  async isDateHoliday(organizationId: string, campusId: string | undefined, date: Date): Promise<boolean> {
    const holidayEvent = await this.prisma.academicCalendarEvent.findFirst({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        isHoliday: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    return !!holidayEvent;
  }

  /**
   * Check if attendance is locked for a section on a given date
   */
  async isAttendanceLocked(sectionId: string, dateStr: string): Promise<boolean> {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    const lock = await this.prisma.attendanceLock.findFirst({
      where: {
        isLocked: true,
        OR: [
          { scopeType: 'DATE', targetDate: date },
          { scopeType: 'SECTION', sectionId },
          { scopeType: 'MONTH', month: date.getMonth() + 1, year: date.getFullYear() },
        ],
      },
    });

    return !!lock;
  }

  async getRosterForDate(user: CurrentUserPayload, sectionId: string, dateStr: string) {
    await this.verifySectionAccess(user, sectionId);

    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    const isLocked = await this.isAttendanceLocked(sectionId, dateStr);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId, status: 'ACTIVE' },
      orderBy: { rollNumber: 'asc' },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const studentIds = enrollments.map((e) => e.studentId);

    const existingAttendance = await this.prisma.attendanceRecord.findMany({
      where: {
        sectionId,
        date,
        studentId: { in: studentIds },
      },
    });

    const recordMap = new Map<string, { status: AttendanceStatus; remarks: string | null; id: string; source: string }>();
    existingAttendance.forEach((rec) => {
      recordMap.set(rec.studentId, { status: rec.status, remarks: rec.remarks, id: rec.id, source: rec.source });
    });

    return enrollments.map((e) => {
      const recorded = recordMap.get(e.studentId);
      return {
        id: recorded ? recorded.id : null,
        studentId: e.studentId,
        rollNumber: e.rollNumber,
        name: `${e.student.user.firstName} ${e.student.user.lastName}`,
        status: recorded ? recorded.status : AttendanceStatus.PRESENT,
        remarks: recorded ? recorded.remarks : null,
        source: recorded ? recorded.source : 'MANUAL',
        isLocked,
      };
    });
  }

  async markAttendance(
    user: CurrentUserPayload,
    sectionId: string,
    dateStr: string,
    records: Array<{ studentId: string; status: AttendanceStatus; remarks?: string; source?: any }>,
    sessionId?: string,
  ) {
    await this.verifySectionAccess(user, sectionId);

    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    // Locking guard
    const isLocked = await this.isAttendanceLocked(sectionId, dateStr);
    if (isLocked) {
      throw new ForbiddenException('Attendance for this date and section is locked. Corrections must be requested.');
    }

    const results = [];
    for (const r of records) {
      const rec = await this.prisma.attendanceRecord.upsert({
        where: {
          studentId_date: {
            studentId: r.studentId,
            date,
          },
        },
        update: {
          status: r.status,
          remarks: r.remarks,
          source: r.source || 'WEB',
          sessionId: sessionId || null,
          updatedBy: user.id,
        },
        create: {
          studentId: r.studentId,
          sectionId,
          sessionId: sessionId || null,
          date,
          status: r.status,
          source: r.source || 'WEB',
          remarks: r.remarks,
          createdBy: user.id,
        },
      });
      results.push(rec);
    }

    // Log audited bulk mark
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { class: true },
    });

    if (section) {
      await this.auditService.log({
        organizationId: user.organizationId,
        campusId: section.class.campusId,
        userId: user.id,
        action: 'MARK_STUDENT_ATTENDANCE',
        module: 'attendance',
        resourceId: sectionId,
        newValues: {
          sectionId,
          date: dateStr,
          totalStudents: records.length,
        },
      });
    }

    return { message: `Saved attendance for ${results.length} students`, date: dateStr };
  }

  async getSummary(sectionId: string, startDateStr?: string, endDateStr?: string) {
    const where: any = { sectionId };

    if (startDateStr && endDateStr) {
      where.date = {
        gte: new Date(startDateStr),
        lte: new Date(endDateStr),
      };
    }

    const totalRecords = await this.prisma.attendanceRecord.count({ where });
    const presentCount = await this.prisma.attendanceRecord.count({
      where: { ...where, status: AttendanceStatus.PRESENT },
    });
    const absentCount = await this.prisma.attendanceRecord.count({
      where: { ...where, status: AttendanceStatus.ABSENT },
    });
    const lateCount = await this.prisma.attendanceRecord.count({
      where: { ...where, status: AttendanceStatus.LATE },
    });
    const halfDayCount = await this.prisma.attendanceRecord.count({
      where: { ...where, status: AttendanceStatus.HALF_DAY },
    });
    const excusedCount = await this.prisma.attendanceRecord.count({
      where: { ...where, status: AttendanceStatus.EXCUSED },
    });

    // Attendance Rate Formula: (Present + Late + HalfDay * 0.5 + Excused) / Total
    const effectivePresent = presentCount + lateCount + halfDayCount * 0.5 + excusedCount;
    const attendanceRate = totalRecords > 0 ? (effectivePresent / totalRecords) * 100 : 0;

    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      excusedCount,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
    };
  }

  // ---------------------------------------------------------------------------
  // Attendance Sessions
  // ---------------------------------------------------------------------------

  async getOrCreateSession(
    organizationId: string,
    campusId: string | undefined,
    dto: { academicYearId: string; classId: string; sectionId: string; date: string; sessionType?: any; subjectId?: string },
    userId?: string,
  ) {
    const date = new Date(dto.date);
    date.setUTCHours(0, 0, 0, 0);

    const sessionType = dto.sessionType || 'FULL_DAY';

    const existing = await this.prisma.attendanceSession.findUnique({
      where: {
        sectionId_date_sessionType: {
          sectionId: dto.sectionId,
          date,
          sessionType,
        },
      },
    });

    if (existing) return existing;

    return this.prisma.attendanceSession.create({
      data: {
        organizationId,
        campusId: campusId || null,
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        sectionId: dto.sectionId,
        date,
        sessionType,
        subjectId: dto.subjectId || null,
        createdBy: userId,
      },
    });
  }

  async getSessions(sectionId: string, dateStr: string) {
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    return this.prisma.attendanceSession.findMany({
      where: { sectionId, date },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Attendance Locking
  // ---------------------------------------------------------------------------

  async lockAttendance(
    organizationId: string,
    campusId: string | undefined,
    dto: { scopeType: any; targetDate?: string; sectionId?: string; month?: number; year?: number },
    userId: string,
  ) {
    const targetDate = dto.targetDate ? new Date(dto.targetDate) : undefined;
    if (targetDate) targetDate.setUTCHours(0, 0, 0, 0);

    const lock = await this.prisma.attendanceLock.create({
      data: {
        organizationId,
        campusId: campusId || null,
        scopeType: dto.scopeType,
        targetDate: targetDate || null,
        sectionId: dto.sectionId || null,
        month: dto.month || null,
        year: dto.year || null,
        isLocked: true,
        lockedBy: userId,
        lockedAt: new Date(),
      },
    });

    await this.auditService.log({
      organizationId,
      campusId,
      userId,
      action: 'LOCK_ATTENDANCE',
      module: 'attendance',
      resourceId: lock.id,
      newValues: dto,
    });

    return lock;
  }

  async unlockAttendance(id: string, reason: string, userId: string) {
    const lock = await this.prisma.attendanceLock.findUnique({ where: { id } });
    if (!lock) throw new NotFoundException(`Attendance lock with ID ${id} not found`);

    const updated = await this.prisma.attendanceLock.update({
      where: { id },
      data: {
        isLocked: false,
        unlockedBy: userId,
        unlockedAt: new Date(),
        unlockReason: reason,
      },
    });

    await this.auditService.log({
      organizationId: lock.organizationId,
      campusId: lock.campusId || undefined,
      userId,
      action: 'UNLOCK_ATTENDANCE',
      module: 'attendance',
      resourceId: id,
      newValues: { reason },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Attendance Corrections Workflow
  // ---------------------------------------------------------------------------

  async requestCorrection(
    user: CurrentUserPayload,
    dto: { targetType: any; recordId: string; requestedStatus: any; reason: string },
  ) {
    let originalStatus: any;
    let studentId: string | undefined;

    if (dto.targetType === 'STUDENT') {
      const rec = await this.prisma.attendanceRecord.findUnique({ where: { id: dto.recordId } });
      if (!rec) throw new NotFoundException(`Attendance record with ID ${dto.recordId} not found`);
      originalStatus = rec.status;
      studentId = rec.studentId;
    } else {
      const rec = await this.prisma.employeeAttendance.findUnique({ where: { id: dto.recordId } });
      if (!rec) throw new NotFoundException(`Employee attendance record with ID ${dto.recordId} not found`);
      originalStatus = rec.status;
    }

    const correction = await this.prisma.attendanceCorrection.create({
      data: {
        organizationId: user.organizationId,
        targetType: dto.targetType,
        attendanceRecordId: dto.targetType === 'STUDENT' ? dto.recordId : null,
        employeeAttendanceId: dto.targetType === 'EMPLOYEE' ? dto.recordId : null,
        originalStatus,
        requestedStatus: dto.requestedStatus,
        reason: dto.reason,
        status: 'PENDING',
        requesterId: user.id,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REQUEST_ATTENDANCE_CORRECTION',
      module: 'attendance',
      resourceId: correction.id,
      newValues: {
        targetType: dto.targetType,
        originalStatus,
        requestedStatus: dto.requestedStatus,
        reason: dto.reason,
      },
    });

    return correction;
  }

  async reviewCorrection(
    user: CurrentUserPayload,
    correctionId: string,
    dto: { decision: 'APPROVE' | 'REJECT'; decisionReason?: string },
  ) {
    const correction = await this.prisma.attendanceCorrection.findUnique({ where: { id: correctionId } });
    if (!correction) throw new NotFoundException(`Correction with ID ${correctionId} not found`);

    if (correction.status !== 'PENDING') {
      throw new ConflictException(`Correction is already finalized (${correction.status})`);
    }

    if (dto.decision === 'APPROVE') {
      // Apply status change
      if (correction.targetType === 'STUDENT' && correction.attendanceRecordId) {
        await this.prisma.attendanceRecord.update({
          where: { id: correction.attendanceRecordId },
          data: {
            status: correction.requestedStatus,
            updatedBy: user.id,
          },
        });
      } else if (correction.targetType === 'EMPLOYEE' && correction.employeeAttendanceId) {
        await this.prisma.employeeAttendance.update({
          where: { id: correction.employeeAttendanceId },
          data: {
            status: correction.requestedStatus,
            updatedBy: user.id,
          },
        });
      }
    }

    const updated = await this.prisma.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewerId: user.id,
        decisionReason: dto.decisionReason || null,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: dto.decision === 'APPROVE' ? 'APPROVE_ATTENDANCE_CORRECTION' : 'REJECT_ATTENDANCE_CORRECTION',
      module: 'attendance',
      resourceId: correctionId,
      newValues: { decision: dto.decision, decisionReason: dto.decisionReason },
    });

    return updated;
  }

  async getCorrections(organizationId: string, query?: { status?: any; targetType?: any }) {
    return this.prisma.attendanceCorrection.findMany({
      where: {
        organizationId,
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.targetType ? { targetType: query.targetType } : {}),
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Attendance Thresholds & Streak Detection
  // ---------------------------------------------------------------------------

  async getThresholds(organizationId: string, campusId?: string) {
    return this.prisma.attendanceThreshold.findFirst({
      where: { organizationId, ...(campusId ? { campusId } : {}) },
    });
  }

  async updateThresholds(
    organizationId: string,
    campusId: string | undefined,
    dto: { minimumPercentage: number; warningPercentage: number; criticalPercentage: number },
  ) {
    const existing = await this.prisma.attendanceThreshold.findFirst({
      where: { organizationId, campusId: campusId || null },
    });

    if (existing) {
      return this.prisma.attendanceThreshold.update({
        where: { id: existing.id },
        data: {
          minimumPercentage: dto.minimumPercentage,
          warningPercentage: dto.warningPercentage,
          criticalPercentage: dto.criticalPercentage,
        },
      });
    }

    return this.prisma.attendanceThreshold.create({
      data: {
        organizationId,
        campusId: campusId || null,
        minimumPercentage: dto.minimumPercentage,
        warningPercentage: dto.warningPercentage,
        criticalPercentage: dto.criticalPercentage,
      },
    });
  }

  async getAbsenceStreaks(sectionId: string, consecutiveThreshold = 3) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId, status: 'ACTIVE' },
      include: {
        student: { include: { user: true } },
      },
    });

    const flaggedStudents = [];

    for (const enr of enrollments) {
      const recentRecords = await this.prisma.attendanceRecord.findMany({
        where: { studentId: enr.studentId },
        orderBy: { date: 'desc' },
        take: consecutiveThreshold,
      });

      const isConsecutiveAbsent =
        recentRecords.length >= consecutiveThreshold &&
        recentRecords.every((r) => r.status === AttendanceStatus.ABSENT);

      if (isConsecutiveAbsent) {
        flaggedStudents.push({
          studentId: enr.studentId,
          name: `${enr.student.user.firstName} ${enr.student.user.lastName}`,
          consecutiveDays: recentRecords.length,
          lastDate: recentRecords[0]?.date,
        });
      }
    }

    return { sectionId, flaggedStudents, threshold: consecutiveThreshold };
  }
}
