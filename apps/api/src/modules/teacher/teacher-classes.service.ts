// =============================================================================
// Phase 4P: Teacher Classes, Sections & Student Scope Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TeacherAuthService } from './teacher-auth.service';
import {
  ITeacherProfile,
  ITeacherSectionWorkspace,
  ITeacherSubjectWorkspace,
  ITeacherStudentSummary,
  ITeacherStudentDetail,
} from '@school/shared-types';
import { RecordStatus, MarksEntryStatus, ExamSessionStatus } from '@prisma/client';

@Injectable()
export class TeacherClassesService {
  private readonly logger = new Logger(TeacherClassesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherAuth: TeacherAuthService,
  ) {}

  /**
   * Retrieves sanitized teacher profile.
   * Internal salary contracts, private HR files, and disciplinary memos are strictly excluded.
   */
  async getTeacherProfile(userId: string): Promise<ITeacherProfile> {
    const teacher = await this.teacherAuth.getTeacherProfileByUserId(userId);
    const assignedSectionIds = await this.teacherAuth.getAssignedSectionIds(teacher.id);

    const employeeProfile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      include: {
        department: true,
        designationRef: true,
        campus: true,
      },
    });

    const distinctSubjects = new Set(teacher.subjectOfferings.map((s) => s.subjectId));

    return {
      id: teacher.id,
      userId: teacher.userId,
      employeeCode: teacher.employeeCode,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      email: teacher.user.email,
      phone: teacher.user.phone,
      avatarUrl: teacher.user.avatarUrl,
      specialization: teacher.specialization,
      qualification: teacher.qualification,
      joiningDate: teacher.joiningDate.toISOString().split('T')[0],
      status: teacher.status,
      departmentName: employeeProfile?.department?.name || null,
      designationTitle: employeeProfile?.designationRef?.title || employeeProfile?.designation || 'Faculty Member',
      campusName: employeeProfile?.campus?.name || 'Main Campus',
      assignedSectionsCount: assignedSectionIds.length,
      assignedSubjectsCount: distinctSubjects.size,
    };
  }

  /**
   * Retrieves all sections assigned to the teacher (as class teacher or subject teacher).
   */
  async getAssignedSections(userId: string): Promise<ITeacherSectionWorkspace[]> {
    const teacher = await this.teacherAuth.getTeacherProfileByUserId(userId);
    const assignedSectionIds = await this.teacherAuth.getAssignedSectionIds(teacher.id);

    const sections = await this.prisma.section.findMany({
      where: { id: { in: assignedSectionIds } },
      include: {
        class: true,
        classTeacherAssignments: {
          where: { teacherId: teacher.id, isCurrent: true, status: RecordStatus.ACTIVE },
        },
        subjectOfferings: {
          where: { primaryTeacherId: teacher.id, status: RecordStatus.ACTIVE },
          include: { subject: true },
        },
        enrollments: {
          where: { status: RecordStatus.ACTIVE },
        },
      },
      orderBy: [{ class: { level: 'asc' } }, { name: 'asc' }],
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const results: ITeacherSectionWorkspace[] = [];
    for (const sec of sections) {
      const todayAttendance = await this.prisma.attendanceRecord.findFirst({
        where: {
          sectionId: sec.id,
          date: new Date(todayStr),
        },
      });

      results.push({
        sectionId: sec.id,
        className: sec.class.name,
        sectionName: sec.name,
        isClassTeacher: sec.classTeacherAssignments.length > 0,
        studentCount: sec.enrollments.length,
        subjectsTaught: sec.subjectOfferings.map((o) => ({
          subjectId: o.subject.id,
          subjectName: o.subject.name,
          subjectCode: o.subject.code,
          weeklyPeriods: o.weeklyPeriods,
        })),
        todayAttendanceMarked: !!todayAttendance,
      });
    }

    return results;
  }

  /**
   * Retrieves all subjects assigned to the teacher, along with corresponding sections.
   */
  async getAssignedSubjects(userId: string): Promise<ITeacherSubjectWorkspace[]> {
    const teacher = await this.teacherAuth.getTeacherProfileByUserId(userId);

    const offerings = await this.prisma.subjectOffering.findMany({
      where: { primaryTeacherId: teacher.id, status: RecordStatus.ACTIVE },
      include: {
        subject: true,
        section: {
          include: {
            class: true,
            enrollments: { where: { status: RecordStatus.ACTIVE } },
          },
        },
      },
    });

    const subjectsMap = new Map<string, ITeacherSubjectWorkspace>();

    offerings.forEach((o) => {
      if (!subjectsMap.has(o.subjectId)) {
        subjectsMap.set(o.subjectId, {
          subjectId: o.subject.id,
          subjectName: o.subject.name,
          subjectCode: o.subject.code,
          category: o.subject.category,
          sections: [],
        });
      }

      const item = subjectsMap.get(o.subjectId)!;
      item.sections.push({
        sectionId: o.sectionId,
        className: o.section.class.name,
        sectionName: o.section.name,
        studentCount: o.section.enrollments.length,
        weeklyPeriods: o.weeklyPeriods,
      });
    });

    return Array.from(subjectsMap.values());
  }

  /**
   * Retrieves student roster scoped strictly to the teacher's assigned sections.
   * Strips all family fee ledgers, private HR files, and unrelated confidential records.
   */
  async getStudentsRoster(
    userId: string,
    sectionId?: string,
  ): Promise<ITeacherStudentSummary[]> {
    const teacher = await this.teacherAuth.getTeacherProfileByUserId(userId);
    const assignedSectionIds = await this.teacherAuth.getAssignedSectionIds(teacher.id);

    const targetSectionIds = sectionId ? [sectionId] : assignedSectionIds;

    // Validate sectionId if provided
    if (sectionId && !assignedSectionIds.includes(sectionId)) {
      await this.teacherAuth.validateSectionAccess(userId, sectionId);
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        sectionId: { in: targetSectionIds },
        status: RecordStatus.ACTIVE,
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true, avatarUrl: true, gender: true },
            },
            attendanceRecords: {
              take: 30,
              orderBy: { date: 'desc' },
            },
          },
        },
        section: {
          include: { class: true },
        },
      },
      orderBy: [{ section: { class: { level: 'asc' } } }, { rollNumber: 'asc' }],
    });

    return enrollments.map((en) => {
      const records = en.student.attendanceRecords;
      const total = records.length;
      const present = records.filter(
        (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY',
      ).length;
      const attendancePercentage =
        total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100;

      return {
        studentId: en.student.id,
        fullName: `${en.student.user.firstName} ${en.student.user.lastName}`.trim(),
        admissionNumber: en.student.admissionNumber,
        rollNumber: en.rollNumber,
        className: en.section.class.name,
        sectionName: en.section.name,
        avatarUrl: en.student.user.avatarUrl,
        attendancePercentage,
        gender: (en.student.user as any).gender || null,
      };
    });
  }

  /**
   * Retrieves educational student details.
   * Enforces server-side validation that student is enrolled in a section taught by teacher.
   */
  async getStudentDetail(userId: string, studentId: string): Promise<ITeacherStudentDetail> {
    await this.teacherAuth.validateStudentAccess(userId, studentId);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
        enrollments: {
          where: { status: RecordStatus.ACTIVE },
          take: 1,
          include: {
            section: {
              include: {
                class: true,
                subjectOfferings: {
                  where: { status: RecordStatus.ACTIVE },
                  include: {
                    subject: true,
                    primaryTeacher: {
                      include: {
                        user: { select: { firstName: true, lastName: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        attendanceRecords: {
          take: 60,
          orderBy: { date: 'desc' },
        },
        examResults: {
          where: {
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
                examSession: true,
              },
            },
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const activeEnrollment = student.enrollments[0];
    const records = student.attendanceRecords;
    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const effectivePresent = presentDays + lateDays + records.filter((r) => r.status === 'HALF_DAY').length * 0.5;
    const attendancePercentage =
      totalDays > 0 ? Number(((effectivePresent / totalDays) * 100).toFixed(1)) : 100;

    return {
      studentId: student.id,
      fullName: `${student.user.firstName} ${student.user.lastName}`.trim(),
      admissionNumber: student.admissionNumber,
      rollNumber: activeEnrollment?.rollNumber || null,
      className: activeEnrollment?.section?.class?.name || 'Class',
      sectionName: activeEnrollment?.section?.name || 'Section',
      avatarUrl: student.user.avatarUrl,
      attendancePercentage,
      attendanceSummary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
      },
      enrolledSubjects: (activeEnrollment?.section?.subjectOfferings || []).map((o) => ({
        subjectName: o.subject.name,
        subjectCode: o.subject.code,
        teacherName: o.primaryTeacher?.user
          ? `${o.primaryTeacher.user.firstName} ${o.primaryTeacher.user.lastName}`.trim()
          : null,
      })),
      recentResults: student.examResults.map((r) => ({
        examName: r.examSchedule.examSession.name,
        subjectName: r.examSchedule.subject.name,
        marksObtained: Number(r.marksObtained),
        maxMarks: Number(r.examSchedule.maxMarks),
        grade: r.grade,
        percentage: r.percentage ? Number(r.percentage) : null,
        isPassed: r.isPassed,
      })),
    };
  }

  /**
   * Alias for getAssignedSections.
   */
  async getAssignedClasses(userId: string) {
    return this.getAssignedSections(userId);
  }

  /**
   * Alias for getStudentsRoster with sectionId.
   */
  async getStudentsForSection(userId: string, sectionId: string) {
    return this.getStudentsRoster(userId, sectionId);
  }
}
