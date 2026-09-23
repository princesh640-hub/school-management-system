// =============================================================================
// Phase 4P: Teacher Dashboard Service ("What do I need to do today?")
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TeacherAuthService } from './teacher-auth.service';
import { ITeacherDashboardOverview } from '@school/shared-types';
import { TimetableStatus, ExamSessionStatus, MarksEntryStatus, RecordStatus } from '@prisma/client';

@Injectable()
export class TeacherDashboardService {
  private readonly logger = new Logger(TeacherDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherAuth: TeacherAuthService,
  ) {}

  /**
   * Aggregates real operational data for the teacher's daily workspace.
   */
  async getDashboardOverview(userId: string): Promise<ITeacherDashboardOverview> {
    const teacher = await this.teacherAuth.getTeacherProfileByUserId(userId);
    const assignedSectionIds = await this.teacherAuth.getAssignedSectionIds(teacher.id);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayName = daysOfWeek[now.getDay()];

    // 1. Today's published timetable schedule
    const todayTimetableEntries = await this.prisma.timetableEntry.findMany({
      where: {
        teacherId: teacher.id,
        dayOfWeek: currentDayName as any,
        timetableVersion: { status: TimetableStatus.PUBLISHED },
      },
      include: {
        period: true,
        subject: true,
        section: {
          include: {
            class: true,
          },
        },
        room: true,
      },
      orderBy: { period: { periodNumber: 'asc' } },
    });

    const todayClassesCount = todayTimetableEntries.length;
    const todaySchedule = todayTimetableEntries.map((e) => ({
      periodNumber: e.period.periodNumber,
      startTime: e.period.startTime,
      endTime: e.period.endTime,
      subjectName: e.subject.name,
      className: e.section.class.name,
      sectionName: e.section.name,
      roomNumber: e.room?.roomNumber || null,
    }));

    // 2. Workload counts
    const weeklyEntries = await this.prisma.timetableEntry.findMany({
      where: {
        teacherId: teacher.id,
        timetableVersion: { status: TimetableStatus.PUBLISHED },
      },
    });
    const weeklyTeachingPeriods = weeklyEntries.length;

    const assignedSubjects = await this.prisma.subjectOffering.findMany({
      where: { primaryTeacherId: teacher.id, status: RecordStatus.ACTIVE },
      select: { subjectId: true },
    });
    const distinctSubjectIds = new Set(assignedSubjects.map((s) => s.subjectId));
    const totalAssignedSubjects = distinctSubjectIds.size;
    const totalAssignedSections = assignedSectionIds.length;

    // 3. Pending Daily Attendance
    // Find sections where the teacher is class teacher
    const classTeacherSections = await this.prisma.classTeacherAssignment.findMany({
      where: { teacherId: teacher.id, isCurrent: true, status: RecordStatus.ACTIVE },
      include: { section: { include: { class: true } } },
    });

    let pendingAttendanceSectionsCount = 0;
    const pendingAttendanceList: Array<{ sectionId: string; sectionName: string; className: string }> = [];

    for (const cta of classTeacherSections) {
      const attendanceToday = await this.prisma.attendanceRecord.findFirst({
        where: {
          sectionId: cta.sectionId,
          date: new Date(todayStr),
        },
      });

      if (!attendanceToday) {
        pendingAttendanceSectionsCount++;
        pendingAttendanceList.push({
          sectionId: cta.sectionId,
          sectionName: cta.section.name,
          className: cta.section.class.name,
        });
      }
    }

    // 4. Pending Marks Entry Tasks
    const todayStart = new Date(todayStr);
    const pastExams = await this.prisma.examSchedule.findMany({
      where: {
        examDate: { lte: todayStart },
        OR: [
          { sectionId: { in: assignedSectionIds } },
          { invigilators: { some: { teacherId: teacher.id } } },
        ],
      },
      include: {
        subject: true,
        examSession: true,
        results: {
          select: { id: true, status: true },
        },
      },
    });

    const pendingMarksExams = pastExams.filter((ex) => {
      if (ex.results.length === 0) return true;
      return ex.results.some((r) => r.status === MarksEntryStatus.DRAFT);
    });
    const pendingMarksExamsCount = pendingMarksExams.length;

    // 5. Upcoming Exams (next 7 days)
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingExams = await this.prisma.examSchedule.findMany({
      where: {
        examDate: { gte: todayStart, lte: sevenDaysLater },
        examSession: { status: ExamSessionStatus.PUBLISHED },
        OR: [
          { sectionId: { in: assignedSectionIds } },
          { invigilators: { some: { teacherId: teacher.id } } },
        ],
      },
    });
    const upcomingExamsCount = upcomingExams.length;

    // 6. Actionable Pending Tasks
    const pendingTasks: ITeacherDashboardOverview['pendingTasks'] = [];

    pendingAttendanceList.forEach((sec) => {
      pendingTasks.push({
        id: `att-${sec.sectionId}`,
        type: 'ATTENDANCE',
        severity: 'danger',
        title: 'Daily Attendance Pending',
        description: `Today's attendance has not been recorded for ${sec.className} - ${sec.sectionName}.`,
        actionTab: 'attendance',
        referenceId: sec.sectionId,
      });
    });

    pendingMarksExams.slice(0, 3).forEach((ex) => {
      pendingTasks.push({
        id: `marks-${ex.id}`,
        type: 'MARKS',
        severity: 'warning',
        title: 'Marks Submission Awaiting',
        description: `Marks for ${ex.subject.name} (${ex.examSession.name}) are pending completion.`,
        actionTab: 'exams',
        referenceId: ex.id,
      });
    });

    if (upcomingExamsCount > 0) {
      pendingTasks.push({
        id: 'upcoming-exams-alert',
        type: 'EXAM',
        severity: 'info',
        title: 'Upcoming Examinations This Week',
        description: `You have ${upcomingExamsCount} scheduled examination session(s) in the next 7 days.`,
        actionTab: 'exams',
      });
    }

    // 7. Leave Summary
    const leaveBalances = await this.prisma.leaveBalance.findMany({
      where: { userId },
    });
    const availableDays = leaveBalances.reduce(
      (sum, b) => sum + (Number(b.allocatedDays) - Number(b.usedDays)),
      0,
    );

    const pendingLeaveApps = await this.prisma.leaveApplication.count({
      where: { userId, status: 'PENDING' },
    });

    return {
      teacherId: teacher.id,
      fullName: `${teacher.user.firstName} ${teacher.user.lastName}`.trim(),
      employeeCode: teacher.employeeCode,
      specialization: teacher.specialization,
      avatarUrl: teacher.user.avatarUrl,
      todayClassesCount,
      totalAssignedSections,
      totalAssignedSubjects,
      weeklyTeachingPeriods,
      pendingAttendanceSectionsCount,
      pendingMarksExamsCount,
      upcomingExamsCount,
      todaySchedule,
      pendingTasks,
      leaveSummary: {
        availableDays: Math.max(0, availableDays),
        pendingApplicationsCount: pendingLeaveApps,
      },
    };
  }
}
