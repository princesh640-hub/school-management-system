// =============================================================================
// Phase 4N: Parent Children Service (Roster, Profile & Child Overview)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ParentAuthService } from './parent-auth.service';
import {
  IParentChildSummary,
  IParentChildProfile,
  IParentChildOverview,
} from '@school/shared-types';
import { DayOfWeek, TimetableStatus } from '@prisma/client';

@Injectable()
export class ParentChildrenService {
  private readonly logger = new Logger(ParentChildrenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parentAuth: ParentAuthService,
  ) {}

  /**
   * Retrieves all verified children linked to the authenticated guardian.
   */
  async getChildren(userId: string): Promise<IParentChildSummary[]> {
    const guardian = await this.parentAuth.getGuardianProfileByUserId(userId);

    const links = await this.prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                gender: true,
                campus: { select: { id: true, name: true } },
              },
            },
            enrollments: {
              where: { status: 'ACTIVE' },
              orderBy: { enrollmentDate: 'desc' },
              take: 1,
              include: {
                class: { select: { id: true, name: true, gradeLevel: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { isPrimary: 'desc' },
    });

    return links.map((l) => {
      const s = l.student;
      const u = s.user;
      const activeEnrollment = s.enrollments[0];

      return {
        studentId: s.id,
        userId: u.id,
        admissionNumber: s.admissionNumber,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        gender: u.gender,
        avatarUrl: u.avatarUrl,
        gradeLevel: activeEnrollment?.class?.gradeLevel || null,
        className: activeEnrollment?.class?.name || null,
        sectionName: activeEnrollment?.section?.name || null,
        campusId: u.campus?.id || null,
        campusName: u.campus?.name || null,
        enrollmentStatus: s.lifecycleStatus,
        relationship: l.relationship || guardian.relationship || 'Guardian',
        isPrimaryGuardian: l.isPrimary,
        canPickup: l.canPickup,
      };
    });
  }

  /**
   * Retrieves child's full profile including enrolled class, campus, and authorized guardians.
   * Strips internal administrative and HR notes.
   */
  async getChildProfile(
    userId: string,
    studentId: string,
  ): Promise<IParentChildProfile> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const detailedStudent = await this.prisma.studentProfile.findUnique({
      where: { id: student.id },
      include: {
        user: {
          include: {
            campus: { select: { id: true, name: true } },
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          orderBy: { enrollmentDate: 'desc' },
          take: 1,
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
            academicYear: { select: { name: true } },
          },
        },
        guardians: {
          include: {
            guardian: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!detailedStudent) {
      throw new Error('Student profile not found');
    }

    const u = detailedStudent.user;
    const activeEnrollment = detailedStudent.enrollments[0];

    return {
      studentId: detailedStudent.id,
      userId: u.id,
      admissionNumber: detailedStudent.admissionNumber,
      admissionDate: detailedStudent.admissionDate.toISOString(),
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      dateOfBirth: detailedStudent.dateOfBirth.toISOString().split('T')[0],
      gender: u.gender,
      bloodGroup: detailedStudent.bloodGroup,
      emergencyContact: detailedStudent.emergencyContact,
      emergencyContactName: detailedStudent.emergencyContactName,
      emergencyContactPhone: detailedStudent.emergencyContactPhone,
      emergencyContactRelation: detailedStudent.emergencyContactRelation,
      address: detailedStudent.address,
      campusName: u.campus?.name || null,
      currentClass: activeEnrollment?.class?.name || null,
      currentSection: activeEnrollment?.section?.name || null,
      academicYear: activeEnrollment?.academicYear?.name || null,
      lifecycleStatus: detailedStudent.lifecycleStatus,
      guardians: detailedStudent.guardians.map((g) => ({
        id: g.id,
        name: `${g.guardian.user.firstName} ${g.guardian.user.lastName}`.trim(),
        relationship: g.relationship || g.guardian.relationship || 'Guardian',
        phone: g.guardian.user.phone,
        email: g.guardian.user.email,
        isPrimary: g.isPrimary,
        canPickup: g.canPickup,
      })),
    };
  }

  /**
   * Aggregates a comprehensive child overview dashboard with real metrics across modules.
   */
  async getChildOverview(
    userId: string,
    studentId: string,
  ): Promise<IParentChildOverview> {
    const { student } = await this.parentAuth.validateGuardianStudentAccess(
      userId,
      studentId,
    );

    const childList = await this.getChildren(userId);
    const childSummary = childList.find((c) => c.studentId === student.id)!;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

    // Day of week mapping for timetable
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    const todayDayOfWeek = days[startOfToday.getDay()];

    const activeEnrollment = student.enrollments[0];
    const sectionId = activeEnrollment?.section?.id;

    const [
      todayAttendance,
      monthAttendance,
      feeInvoices,
      todayTimetable,
      upcomingExams,
      latestResult,
    ] = await Promise.all([
      // 1. Today's attendance
      this.prisma.attendanceRecord.findFirst({
        where: {
          studentId: student.id,
          date: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // 2. Month attendance records
      this.prisma.attendanceRecord.findMany({
        where: {
          studentId: student.id,
          date: { gte: startOfMonth },
        },
      }),

      // 3. Fee Invoices
      this.prisma.feeInvoice.findMany({
        where: {
          studentId: student.id,
          status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
      }),

      // 4. Today's timetable entries (strictly published version)
      sectionId
        ? this.prisma.timetableEntry.findMany({
            where: {
              sectionId,
              dayOfWeek: todayDayOfWeek,
              timetableVersion: { status: TimetableStatus.PUBLISHED },
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
            orderBy: { period: { periodNumber: 'asc' } },
          })
        : Promise.resolve([]),

      // 5. Upcoming exams
      activeEnrollment?.class?.id
        ? this.prisma.examSchedule.findMany({
            where: {
              classId: activeEnrollment.class.id,
              examDate: { gte: startOfToday },
            },
            include: {
              examSession: true,
              subject: true,
            },
            orderBy: { examDate: 'asc' },
            take: 3,
          })
        : Promise.resolve([]),

      // 6. Latest published exam result
      this.prisma.examOverallResult.findFirst({
        where: {
          studentId: student.id,
          isPublished: true,
        },
        include: {
          examSession: true,
        },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    // Attendance stats
    const totalDays = monthAttendance.length;
    const daysPresent = monthAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY',
    ).length;
    const daysAbsent = monthAttendance.filter((a) => a.status === 'ABSENT').length;
    const monthPercentage = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 100;

    // Fee calculations
    const totalDue = feeInvoices.reduce(
      (acc, inv) => acc + Number(inv.amount),
      0,
    );
    const totalPaid = feeInvoices.reduce(
      (acc, inv) => acc + Number(inv.paidAmount),
      0,
    );
    const balanceOutstanding = totalDue - totalPaid;
    const hasOverdue = feeInvoices.some((inv) => inv.status === 'OVERDUE');
    const nextDueDate = feeInvoices
      .map((i) => i.dueDate)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    // Build Attention Items
    const attentionItems: IParentChildOverview['attentionItems'] = [];

    if (todayAttendance?.status === 'ABSENT') {
      attentionItems.push({
        type: 'ATTENDANCE',
        severity: 'URGENT',
        title: 'Marked Absent Today',
        message: `${childSummary.firstName} has been recorded absent for today's session (${startOfToday.toLocaleDateString()}).`,
      });
    }

    if (hasOverdue) {
      attentionItems.push({
        type: 'FEE',
        severity: 'WARNING',
        title: 'Outstanding Overdue Fee',
        message: `An invoice of $${balanceOutstanding.toFixed(2)} is overdue for ${childSummary.firstName}.`,
        actionUrl: `/portal/parent?tab=fees&studentId=${student.id}`,
      });
    }

    if (upcomingExams.length > 0) {
      const nextExam = upcomingExams[0];
      attentionItems.push({
        type: 'EXAM',
        severity: 'INFO',
        title: `Upcoming Exam: ${nextExam.subject.name}`,
        message: `Scheduled on ${nextExam.examDate.toLocaleDateString()} (${nextExam.examSession.name}).`,
        actionUrl: `/portal/parent?tab=exams&studentId=${student.id}`,
      });
    }

    return {
      child: childSummary,
      attentionItems,
      attendance: {
        todayStatus: todayAttendance?.status || null,
        monthPercentage,
        daysPresent,
        daysAbsent,
        totalDays,
      },
      fees: {
        totalDue,
        totalPaid,
        balanceOutstanding,
        nextDueDate: nextDueDate ? nextDueDate.toISOString().split('T')[0] : null,
        hasOverdue,
      },
      upcomingTimetableToday: todayTimetable.map((t) => ({
        periodName: t.period.name,
        startTime: t.period.startTime,
        endTime: t.period.endTime,
        subjectName: t.subject.name,
        teacherName: t.teacher
          ? `${t.teacher.user.firstName} ${t.teacher.user.lastName}`.trim()
          : null,
        roomName: t.room?.name || null,
      })),
      upcomingExams: upcomingExams.map((e) => ({
        examName: e.examSession.name,
        subjectName: e.subject.name,
        examDate: e.examDate.toISOString().split('T')[0],
        startTime: e.startTime,
        durationMinutes: e.durationMinutes,
      })),
      latestResult: latestResult
        ? {
            examName: latestResult.examSession.name,
            percentage: Number(latestResult.percentage),
            grade: latestResult.grade,
            status: latestResult.resultStatus,
            publishedAt: latestResult.publishedAt?.toISOString() || '',
          }
        : null,
    };
  }
}
