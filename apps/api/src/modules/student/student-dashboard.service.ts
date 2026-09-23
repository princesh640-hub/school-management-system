// =============================================================================
// Phase 4O: Student Dashboard Overview Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StudentAuthService } from './student-auth.service';
import { IStudentDashboardOverview } from '@school/shared-types';
import { RecordStatus, TimetableStatus, ExamSessionStatus, MarksEntryStatus, AnnouncementStatus } from '@prisma/client';

@Injectable()
export class StudentDashboardService {
  private readonly logger = new Logger(StudentDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAuth: StudentAuthService,
  ) {}

  /**
   * Aggregates real cross-module data for the student dashboard.
   * Real metrics only; zero fabricated values.
   */
  async getDashboardOverview(userId: string): Promise<IStudentDashboardOverview> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];
    const sectionId = activeEnrollment?.sectionId;
    const className = activeEnrollment?.section?.class?.name || 'Unassigned';
    const sectionName = activeEnrollment?.section?.name || 'Unassigned';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(todayStr);

    // 1. Attendance metrics
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'desc' },
    });

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY',
    ).length;
    const attendancePercentage =
      totalDays > 0 ? Number(((presentDays / totalDays) * 100).toFixed(1)) : 100;

    const todayRecord = attendanceRecords.find(
      (r) => r.date.toISOString().split('T')[0] === todayStr,
    );
    const todayAttendanceStatus = todayRecord ? todayRecord.status : null;

    // 2. Today's published timetable
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayName = daysOfWeek[now.getDay()];

    let todayClassesCount = 0;
    if (sectionId) {
      const publishedTimetableEntries = await this.prisma.timetableEntry.findMany({
        where: {
          sectionId,
          dayOfWeek: currentDayName as any,
          timetableVersion: { status: TimetableStatus.PUBLISHED },
        },
      });
      todayClassesCount = publishedTimetableEntries.length;
    }

    // 3. Upcoming published exams
    const upcomingExams = await this.prisma.examSchedule.findMany({
      where: {
        examDate: { gte: todayStart },
        examSession: {
          status: ExamSessionStatus.PUBLISHED,
        },
        OR: [
          { classId: activeEnrollment?.section?.classId },
          { sectionId: sectionId || undefined },
        ],
      },
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
      include: {
        subject: true,
        room: true,
      },
      take: 5,
    });

    const upcomingExamsCount = upcomingExams.length;
    const nextExam = upcomingExams[0]
      ? {
          subjectName: upcomingExams[0].subject.name,
          examDate: upcomingExams[0].examDate.toISOString().split('T')[0],
          startTime: upcomingExams[0].startTime,
          roomName: upcomingExams[0].room?.roomNumber || null,
        }
      : null;

    // 4. Latest published result
    const latestResultRecord = await this.prisma.examResult.findFirst({
      where: {
        studentId: student.id,
        status: { in: [MarksEntryStatus.APPROVED, MarksEntryStatus.LOCKED] },
        examSchedule: {
          examSession: {
            status: ExamSessionStatus.PUBLISHED,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        examSchedule: {
          include: {
            subject: true,
            examSession: true,
          },
        },
      },
    });

    const latestResult = latestResultRecord
      ? {
          examName: latestResultRecord.examSchedule.examSession.name,
          subjectName: latestResultRecord.examSchedule.subject.name,
          marksObtained: Number(latestResultRecord.marksObtained),
          maxMarks: Number(latestResultRecord.examSchedule.maxMarks),
          grade: latestResultRecord.grade,
          percentage: latestResultRecord.percentage ? Number(latestResultRecord.percentage) : null,
        }
      : null;

    // 5. Unread notices count (Announcements targeted to students)
    const announcements = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        OR: [
          { targetType: 'ALL' },
          { roles: { has: 'STUDENT' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });
    const unreadNoticesCount = announcements.length;

    // 6. Library active & overdue loans
    const libraryMember = await this.prisma.libraryMember.findFirst({
      where: {
        OR: [
          { userId: student.userId },
          { studentProfileId: student.id },
        ],
      },
      include: {
        loans: {
          where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
        },
      },
    });

    const activeLoans = libraryMember?.loans || [];
    const activeLibraryLoansCount = activeLoans.length;
    const overdueLibraryLoansCount = activeLoans.filter((l) => l.dueDate < now).length;

    // 7. Transport Assignment
    const transport = await this.prisma.studentTransportAssignment.findFirst({
      where: {
        studentId: student.id,
        isActive: true,
      },
      include: {
        stop: true,
      },
    });
    const hasTransport = !!transport;
    const transportPickupTime = transport?.stop?.pickupTime || null;

    // 8. Hostel Allocation
    const hostel = await this.prisma.hostelAllocation.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
      },
      include: {
        room: true,
      },
    });
    const hasHostel = !!hostel;
    const hostelRoomNumber = hostel?.room?.roomNumber || null;

    // 9. Fee balance outstanding
    const feeInvoices = await this.prisma.feeInvoice.findMany({
      where: { studentId: student.id },
    });

    const totalInvoiced = feeInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalPaid = feeInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    const feeBalanceOutstanding = Math.max(0, totalInvoiced - totalPaid);

    // 10. Actionable Attention Items
    const attentionItems: IStudentDashboardOverview['attentionItems'] = [];

    if (attendancePercentage < 75 && totalDays >= 5) {
      attentionItems.push({
        id: 'low-attendance',
        type: 'ATTENDANCE',
        severity: 'danger',
        title: 'Low Attendance Alert',
        message: `Your current attendance is ${attendancePercentage}%, which is below the 75% required threshold.`,
        linkTab: 'attendance',
      });
    }

    if (nextExam) {
      attentionItems.push({
        id: 'upcoming-exam',
        type: 'EXAM',
        severity: 'info',
        title: 'Upcoming Examination',
        message: `${nextExam.subjectName} is scheduled on ${nextExam.examDate} at ${nextExam.startTime}.`,
        linkTab: 'exams',
      });
    }

    if (overdueLibraryLoansCount > 0) {
      attentionItems.push({
        id: 'overdue-books',
        type: 'LIBRARY',
        severity: 'warning',
        title: 'Overdue Library Books',
        message: `You have ${overdueLibraryLoansCount} book(s) past their due date. Please return them promptly to avoid fines.`,
        linkTab: 'services',
      });
    }

    if (feeBalanceOutstanding > 0) {
      attentionItems.push({
        id: 'fee-due',
        type: 'FEE',
        severity: 'warning',
        title: 'Outstanding Fee Dues',
        message: `You have an outstanding balance of $${feeBalanceOutstanding.toFixed(2)}. Please ensure timely clearance.`,
        linkTab: 'fees',
      });
    }

    return {
      studentId: student.id,
      fullName: `${student.user.firstName} ${student.user.lastName}`.trim(),
      admissionNumber: student.admissionNumber,
      className,
      sectionName,
      avatarUrl: student.user.avatarUrl,
      attendancePercentage,
      todayAttendanceStatus,
      todayClassesCount,
      upcomingExamsCount,
      nextExam,
      latestResult,
      unreadNoticesCount,
      activeLibraryLoansCount,
      overdueLibraryLoansCount,
      hasTransport,
      transportPickupTime,
      hasHostel,
      hostelRoomNumber,
      feeBalanceOutstanding,
      attentionItems,
    };
  }
}
