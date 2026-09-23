// =============================================================================
// Phase 4N: Parent Academic Service (Attendance, Timetable, Exams & Results)
// =============================================================================
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ParentAuthService } from './parent-auth.service';
import {
  IParentAttendanceSummary,
  IParentTimetable,
  IParentExamItem,
  IParentExamResult,
  IParentReportCard,
} from '@school/shared-types';
import { TimetableStatus } from '@prisma/client';

@Injectable()
export class ParentAcademicService {
  private readonly logger = new Logger(ParentAcademicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parentAuth: ParentAuthService,
  ) {}

  /**
   * Retrieves child's official attendance records and summary metrics.
   */
  async getChildAttendance(
    userId: string,
    studentId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<IParentAttendanceSummary> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const where: any = { studentId: student.id };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    } else {
      // Default to last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      where.date = { gte: ninetyDaysAgo };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
    const excusedDays = records.filter((r) => r.status === 'EXCUSED').length;

    // Standard attendance percentage: (PRESENT + LATE + HALF_DAY) / total
    const effectiveAttended = presentDays + lateDays + halfDays;
    const attendancePercentage =
      totalDays > 0 ? Math.round((effectiveAttended / totalDays) * 100) : 100;

    return {
      studentId: student.id,
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'Recent Academic Records',
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      excusedDays,
      attendancePercentage,
      records: records.map((r) => ({
        id: r.id,
        date: r.date.toISOString().split('T')[0],
        status: r.status as any,
        remarks: r.remarks,
      })),
    };
  }

  /**
   * Retrieves child's published timetable. Draft or unpublished schedules are strictly hidden.
   */
  async getChildTimetable(
    userId: string,
    studentId: string,
  ): Promise<IParentTimetable> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment || !activeEnrollment.section) {
      throw new NotFoundException('No active class section found for this student.');
    }

    const sectionId = activeEnrollment.section.id;

    // Find the current active PUBLISHED timetable version for section's academic year/campus
    const version = await this.prisma.timetableVersion.findFirst({
      where: {
        academicYearId: activeEnrollment.academicYearId,
        status: TimetableStatus.PUBLISHED,
      },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
      return {
        studentId: student.id,
        className: activeEnrollment.class.name,
        sectionName: activeEnrollment.section.name,
        versionName: 'Unpublished',
        versionNumber: 0,
        status: 'PUBLISHED',
        publishedAt: null,
        entries: [],
      };
    }

    const entries = await this.prisma.timetableEntry.findMany({
      where: {
        timetableVersionId: version.id,
        sectionId,
      },
      include: {
        period: true,
        subject: true,
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
    });

    return {
      studentId: student.id,
      className: activeEnrollment.class.name,
      sectionName: activeEnrollment.section.name,
      versionName: version.name,
      versionNumber: version.versionNumber,
      status: 'PUBLISHED',
      publishedAt: version.publishedAt?.toISOString() || null,
      entries: entries.map((e) => ({
        id: e.id,
        dayOfWeek: e.dayOfWeek,
        periodName: e.period.name,
        startTime: e.period.startTime,
        endTime: e.period.endTime,
        subjectName: e.subject.name,
        subjectCode: e.subject.code,
        teacherName: e.teacher
          ? `${e.teacher.user.firstName} ${e.teacher.user.lastName}`.trim()
          : null,
        roomName: e.room?.name || null,
      })),
    };
  }

  /**
   * Lists upcoming examinations the child is eligible to sit.
   */
  async getChildExams(
    userId: string,
    studentId: string,
  ): Promise<IParentExamItem[]> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const schedules = await this.prisma.examSchedule.findMany({
      where: {
        classId: activeEnrollment.classId,
        examDate: { gte: now },
      },
      include: {
        examSession: true,
        subject: true,
      },
      orderBy: { examDate: 'asc' },
    });

    return schedules.map((s) => ({
      id: s.id,
      examSessionId: s.examSessionId,
      examSessionName: s.examSession.name,
      subjectName: s.subject.name,
      subjectCode: s.subject.code,
      examDate: s.examDate.toISOString().split('T')[0],
      startTime: s.startTime,
      endTime: s.endTime,
      maxMarks: Number(s.maxMarks),
      passingMarks: Number(s.passingMarks),
      roomName: null,
    }));
  }

  /**
   * Retrieves official, published examination results.
   * Draft, submitted, or unapproved marks are strictly withheld.
   */
  async getChildResults(
    userId: string,
    studentId: string,
  ): Promise<IParentExamResult[]> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const results = await this.prisma.examResult.findMany({
      where: {
        studentId: student.id,
        status: { in: ['APPROVED', 'LOCKED'] },
      },
      include: {
        examSchedule: {
          include: {
            examSession: true,
            subject: true,
          },
        },
      },
      orderBy: { examSchedule: { examDate: 'desc' } },
    });

    return results.map((r) => ({
      id: r.id,
      examSessionName: r.examSchedule.examSession.name,
      subjectName: r.examSchedule.subject.name,
      subjectCode: r.examSchedule.subject.code,
      marksObtained: Number(r.marksObtained),
      maxMarks: Number(r.examSchedule.maxMarks),
      percentage: Number(r.percentage || 0),
      grade: r.grade,
      gradePoint: r.gradePoint ? Number(r.gradePoint) : null,
      isPassed: r.isPassed,
      isAbsent: r.isAbsent,
      status: r.status,
      remarks: r.remarks,
    }));
  }

  /**
   * Retrieves child's official published report cards.
   */
  async getChildReportCards(
    userId: string,
    studentId: string,
  ): Promise<IParentReportCard[]> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const reportCards = await this.prisma.reportCard.findMany({
      where: {
        studentId: student.id,
        isPublished: true,
      },
      include: {
        examSession: {
          include: {
            academicYear: true,
          },
        },
      },
      orderBy: { issueDate: 'desc' },
    });

    // Also query overall session results to combine rank and percentage
    const overallResults = await this.prisma.examOverallResult.findMany({
      where: {
        studentId: student.id,
        isPublished: true,
      },
    });

    return reportCards.map((rc) => {
      const overall = overallResults.find(
        (o) => o.examSessionId === rc.examSessionId,
      );

      return {
        id: rc.id,
        examSessionId: rc.examSessionId,
        examSessionName: rc.examSession.name,
        academicYear: rc.examSession.academicYear.name,
        issueDate: rc.issueDate.toISOString().split('T')[0],
        totalMarksObtained: overall ? Number(overall.totalMarksObtained) : null,
        totalMaxMarks: overall ? Number(overall.totalMaxMarks) : null,
        percentage: overall
          ? Number(overall.percentage)
          : rc.attendancePercentage
            ? Number(rc.attendancePercentage)
            : null,
        grade: overall?.grade || null,
        gpa: overall?.gpa ? Number(overall.gpa) : null,
        resultStatus: overall?.resultStatus || null,
        rank: overall?.rank || null,
        attendancePercentage: rc.attendancePercentage
          ? Number(rc.attendancePercentage)
          : null,
        teacherRemarks: rc.teacherRemarks,
        principalRemarks: rc.principalRemarks,
        isPublished: rc.isPublished,
        publishedAt: rc.publishedAt?.toISOString() || null,
      };
    });
  }
}
