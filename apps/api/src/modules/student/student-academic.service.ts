// =============================================================================
// Phase 4O: Student Academic Management Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StudentAuthService } from './student-auth.service';
import {
  IStudentAcademicDetails,
  IStudentSubject,
  IStudentTimetable,
  IStudentTimetablePeriod,
  IStudentAttendanceSummary,
  IStudentExamSchedule,
  IStudentExamResult,
  IStudentReportCard,
  IStudentAcademicHistory,
  IStudentCalendarEvent,
} from '@school/shared-types';
import {
  RecordStatus,
  TimetableStatus,
  ExamSessionStatus,
  MarksEntryStatus,
  EventAudience,
} from '@prisma/client';

@Injectable()
export class StudentAcademicService {
  private readonly logger = new Logger(StudentAcademicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAuth: StudentAuthService,
  ) {}

  /**
   * Retrieves current academic structure: Class, Section, Class Teacher, Academic Year.
   */
  async getAcademicDetails(userId: string): Promise<IStudentAcademicDetails> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];

    if (!activeEnrollment) {
      return {
        className: 'Not Enrolled',
        sectionName: 'Not Enrolled',
        rollNumber: null,
        academicYear: 'N/A',
        campusName: student.user.campusId ? 'Main Campus' : 'Unassigned',
        classTeacher: null,
        enrolledSubjectsCount: 0,
      };
    }

    const section = await this.prisma.section.findUnique({
      where: { id: activeEnrollment.sectionId },
      include: {
        class: {
          include: {
            campus: true,
          },
        },
        teacherAssignments: {
          where: { isPrimary: true, status: RecordStatus.ACTIVE },
          include: {
            teacher: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
          take: 1,
        },
        subjectOfferings: {
          where: { status: RecordStatus.ACTIVE },
        },
      },
    });

    const primaryTeacherAssignment = section?.teacherAssignments[0];
    const classTeacher = primaryTeacherAssignment?.teacher?.user
      ? {
          name: `${primaryTeacherAssignment.teacher.user.firstName} ${primaryTeacherAssignment.teacher.user.lastName}`.trim(),
          email: primaryTeacherAssignment.teacher.user.email,
        }
      : null;

    return {
      className: section?.class?.name || 'Class',
      sectionName: section?.name || 'Section',
      rollNumber: activeEnrollment.rollNumber,
      academicYear: activeEnrollment.academicYear.name,
      campusName: section?.class?.campus?.name || 'Main Campus',
      classTeacher,
      enrolledSubjectsCount: section?.subjectOfferings.length || 0,
    };
  }

  /**
   * Retrieves active subjects enrolled for the student's current section/class.
   */
  async getSubjects(userId: string): Promise<IStudentSubject[]> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];

    if (!activeEnrollment) return [];

    const offerings = await this.prisma.subjectOffering.findMany({
      where: {
        sectionId: activeEnrollment.sectionId,
        status: RecordStatus.ACTIVE,
      },
      include: {
        subject: true,
        primaryTeacher: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { subject: { name: 'asc' } },
    });

    return offerings.map((o) => ({
      id: o.id,
      subjectCode: o.subject.code,
      subjectName: o.subject.name,
      category: o.subject.category,
      weeklyPeriods: o.weeklyPeriods,
      teacherName: o.primaryTeacher?.user
        ? `${o.primaryTeacher.user.firstName} ${o.primaryTeacher.user.lastName}`.trim()
        : null,
      teacherEmail: o.primaryTeacher?.user?.email || null,
    }));
  }

  /**
   * Retrieves published timetable only.
   * Draft versions or conflicting internal changes are never exposed to students.
   */
  async getTimetable(userId: string): Promise<IStudentTimetable> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];

    if (!activeEnrollment) {
      return {
        academicYear: 'N/A',
        className: 'N/A',
        sectionName: 'N/A',
        todayEntries: [],
        weeklyEntries: {},
      };
    }

    const entries = await this.prisma.timetableEntry.findMany({
      where: {
        sectionId: activeEnrollment.sectionId,
        timetableVersion: {
          status: TimetableStatus.PUBLISHED,
        },
      },
      include: {
        period: true,
        subject: true,
        teacher: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { periodNumber: 'asc' } }],
    });

    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = daysOfWeek[new Date().getDay()];

    const weeklyEntries: Record<string, IStudentTimetablePeriod[]> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
    };

    entries.forEach((e) => {
      const periodItem: IStudentTimetablePeriod = {
        periodId: e.periodId,
        periodName: e.period.name,
        periodNumber: e.period.periodNumber,
        startTime: e.period.startTime,
        endTime: e.period.endTime,
        isBreak: e.period.isBreak,
        dayOfWeek: e.dayOfWeek,
        subjectName: e.subject.name,
        subjectCode: e.subject.code,
        teacherName: e.teacher?.user
          ? `${e.teacher.user.firstName} ${e.teacher.user.lastName}`.trim()
          : null,
        roomNumber: e.room?.roomNumber || null,
      };

      if (!weeklyEntries[e.dayOfWeek]) {
        weeklyEntries[e.dayOfWeek] = [];
      }
      weeklyEntries[e.dayOfWeek].push(periodItem);
    });

    const todayEntries = weeklyEntries[currentDay] || [];

    return {
      academicYear: activeEnrollment.academicYear.name,
      className: activeEnrollment.section.class.name,
      sectionName: activeEnrollment.section.name,
      todayEntries,
      weeklyEntries,
    };
  }

  /**
   * Retrieves official attendance records, percentages, and attendance alerts.
   */
  async getAttendance(
    userId: string,
    query?: { startDate?: string; endDate?: string },
  ): Promise<IStudentAttendanceSummary> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const whereClause: any = { studentId: student.id };
    if (query?.startDate || query?.endDate) {
      whereClause.date = {};
      if (query.startDate) whereClause.date.gte = new Date(query.startDate);
      if (query.endDate) whereClause.date.lte = new Date(query.endDate);
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 60,
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const excusedDays = records.filter((r) => r.status === 'EXCUSED').length;

    // Standard school attendance formula: (present + late + halfDay*0.5) / totalDays
    const effectivePresent = presentDays + lateDays + halfDays * 0.5;
    const attendancePercentage =
      totalDays > 0 ? Number(((effectivePresent / totalDays) * 100).toFixed(1)) : 100;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRec = records.find((r) => r.date.toISOString().split('T')[0] === todayStr);

    const alerts: IStudentAttendanceSummary['alerts'] = [];
    if (attendancePercentage < 75 && totalDays >= 5) {
      alerts.push({
        type: 'LOW_ATTENDANCE',
        message: `Your attendance is ${attendancePercentage}%, which is below the mandatory 75% requirement.`,
        severity: 'danger',
      });
    }

    // Check consecutive absences in recent 5 days
    let consecutiveAbsences = 0;
    for (const r of records.slice(0, 5)) {
      if (r.status === 'ABSENT') {
        consecutiveAbsences++;
      } else {
        break;
      }
    }
    if (consecutiveAbsences >= 3) {
      alerts.push({
        type: 'CONSECUTIVE_ABSENCE',
        message: `You have ${consecutiveAbsences} consecutive absences recorded. An official excuse note is required.`,
        severity: 'warning',
      });
    }

    return {
      studentId: student.id,
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      excusedDays,
      attendancePercentage,
      todayStatus: todayRec ? todayRec.status : null,
      recentRecords: records.map((r) => ({
        date: r.date.toISOString().split('T')[0],
        status: r.status as any,
        remarks: r.remarks,
      })),
      alerts,
    };
  }

  /**
   * Retrieves upcoming published examinations applicable to the student.
   */
  async getUpcomingExams(userId: string): Promise<IStudentExamSchedule[]> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];

    if (!activeEnrollment) return [];

    const todayStart = new Date(new Date().toISOString().split('T')[0]);

    const schedules = await this.prisma.examSchedule.findMany({
      where: {
        examDate: { gte: todayStart },
        examSession: { status: ExamSessionStatus.PUBLISHED },
        OR: [
          { classId: activeEnrollment.section.classId },
          { sectionId: activeEnrollment.sectionId },
        ],
      },
      include: {
        examSession: true,
        subject: true,
        room: true,
      },
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
    });

    return schedules.map((s) => ({
      id: s.id,
      examSessionName: s.examSession.name,
      subjectName: s.subject.name,
      subjectCode: s.subject.code,
      examDate: s.examDate.toISOString().split('T')[0],
      startTime: s.startTime,
      endTime: s.endTime,
      roomName: s.room?.roomNumber || null,
      maxMarks: Number(s.maxMarks),
      passingMarks: Number(s.passingMarks),
      instructions: s.instructions,
    }));
  }

  /**
   * Retrieves published examination results only.
   * Draft marks, unapproved entries, and unreleased sessions are strictly withheld.
   */
  async getPublishedResults(userId: string): Promise<IStudentExamResult[]> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const results = await this.prisma.examResult.findMany({
      where: {
        studentId: student.id,
        status: { in: [MarksEntryStatus.APPROVED, MarksEntryStatus.LOCKED] },
        examSchedule: {
          examSession: {
            status: ExamSessionStatus.PUBLISHED,
          },
        },
      },
      include: {
        examSchedule: {
          include: {
            subject: true,
            examSession: {
              include: {
                academicTerm: true,
              },
            },
          },
        },
      },
      orderBy: { examSchedule: { examDate: 'desc' } },
    });

    return results.map((r) => ({
      id: r.id,
      examSessionName: r.examSchedule.examSession.name,
      academicTerm: r.examSchedule.examSession.academicTerm?.name || 'Term',
      subjectName: r.examSchedule.subject.name,
      subjectCode: r.examSchedule.subject.code,
      maxMarks: Number(r.examSchedule.maxMarks),
      passingMarks: Number(r.examSchedule.passingMarks),
      marksObtained: Number(r.marksObtained),
      percentage: r.percentage ? Number(r.percentage) : 0,
      grade: r.grade || 'N/A',
      gradePoint: r.gradePoint ? Number(r.gradePoint) : null,
      isPassed: r.isPassed,
      remarks: r.remarks,
      status: r.status,
    }));
  }

  /**
   * Retrieves official published report cards.
   */
  async getReportCards(userId: string): Promise<IStudentReportCard[]> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const cards = await this.prisma.reportCard.findMany({
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

    return cards.map((c) => ({
      id: c.id,
      examSessionName: c.examSession.name,
      academicYear: c.examSession.academicYear.name,
      issueDate: c.issueDate.toISOString().split('T')[0],
      attendancePercentage: c.attendancePercentage ? Number(c.attendancePercentage) : null,
      daysPresent: c.daysPresent,
      daysAbsent: c.daysAbsent,
      teacherRemarks: c.teacherRemarks,
      principalRemarks: c.principalRemarks,
      isPublished: c.isPublished,
      publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    }));
  }

  /**
   * Retrieves past enrollments and cumulative historical academic performance.
   */
  async getAcademicHistory(userId: string): Promise<IStudentAcademicHistory> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        academicYear: true,
        section: {
          include: {
            class: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const reportCards = await this.getReportCards(userId);

    return {
      studentId: student.id,
      pastEnrollments: enrollments.map((e) => ({
        academicYear: e.academicYear.name,
        className: e.section.class.name,
        sectionName: e.section.name,
        rollNumber: e.rollNumber,
        status: e.status,
      })),
      pastReportCards: reportCards,
    };
  }

  /**
   * Retrieves academic calendar events targeted to students or all institution members.
   */
  async getAcademicCalendar(userId: string): Promise<IStudentCalendarEvent[]> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    const events = await this.prisma.academicCalendarEvent.findMany({
      where: {
        status: RecordStatus.ACTIVE,
        targetAudience: { in: [EventAudience.ALL, EventAudience.STUDENTS] },
        OR: [
          { campusId: student.user.campusId },
          { campusId: null },
        ],
      },
      orderBy: { startDate: 'asc' },
    });

    return events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      category: ev.category as any,
      startDate: ev.startDate.toISOString().split('T')[0],
      endDate: ev.endDate.toISOString().split('T')[0],
      isHoliday: ev.isHoliday,
    }));
  }
}
