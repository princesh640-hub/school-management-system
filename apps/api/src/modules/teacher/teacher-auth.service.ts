// =============================================================================
// Phase 4P: Centralized Teacher Authorization & Scope Service
// =============================================================================
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class TeacherAuthService {
  private readonly logger = new Logger(TeacherAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the TeacherProfile for a given authenticated user ID.
   * Throws ForbiddenException if user does not have an active teacher profile.
   */
  async getTeacherProfileByUserId(userId: string) {
    if (!userId || typeof userId !== 'string') {
      throw new ForbiddenException('Invalid authentication credentials.');
    }

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            status: true,
            campusId: true,
            organizationId: true,
          },
        },
        classTeacherAssignments: {
          where: { isCurrent: true, status: RecordStatus.ACTIVE },
          include: {
            section: {
              include: {
                class: true,
              },
            },
          },
        },
        subjectOfferings: {
          where: { status: RecordStatus.ACTIVE },
          include: {
            subject: true,
            section: {
              include: {
                class: true,
              },
            },
          },
        },
        subjectTeachers: {
          include: {
            subject: true,
            section: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });

    if (!teacher || teacher.status !== RecordStatus.ACTIVE) {
      this.logger.warn(`User ${userId} attempted teacher access without an active teacher profile`);
      throw new ForbiddenException(
        'Access denied: You do not have an active teaching profile in this institution.',
      );
    }

    // Verify employee record is not terminated or suspended
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { userId },
    });
    if (employee && (employee.status === 'TERMINATED' || employee.status === 'SUSPENDED')) {
      throw new ForbiddenException('Access denied: Staff employment account is inactive or terminated.');
    }

    return teacher;
  }

  /**
   * Collects all section IDs assigned to the teacher (as class teacher or subject teacher).
   */
  async getAssignedSectionIds(teacherId: string): Promise<string[]> {
    const [classTeacherSecs, subjectOfferingSecs, subjectTeacherSecs] = await Promise.all([
      this.prisma.classTeacherAssignment.findMany({
        where: { teacherId, isCurrent: true, status: RecordStatus.ACTIVE },
        select: { sectionId: true },
      }),
      this.prisma.subjectOffering.findMany({
        where: { primaryTeacherId: teacherId, status: RecordStatus.ACTIVE },
        select: { sectionId: true },
      }),
      this.prisma.subjectTeacher.findMany({
        where: { teacherId },
        select: { sectionId: true },
      }),
    ]);

    const sectionIds = new Set<string>();
    classTeacherSecs.forEach((s) => sectionIds.add(s.sectionId));
    subjectOfferingSecs.forEach((s) => sectionIds.add(s.sectionId));
    subjectTeacherSecs.forEach((s) => sectionIds.add(s.sectionId));

    return Array.from(sectionIds);
  }

  /**
   * Strictly validates that the teacher is assigned to the specified section.
   * Throws ForbiddenException if section is outside teacher's authorization scope.
   */
  async validateSectionAccess(userId: string, sectionId: string) {
    const teacher = await this.getTeacherProfileByUserId(userId);
    const assignedSectionIds = await this.getAssignedSectionIds(teacher.id);

    if (!assignedSectionIds.includes(sectionId)) {
      this.logger.warn(
        `Security Scope Breach: Teacher ${teacher.id} (user ${userId}) attempted to access unassigned section ${sectionId}`,
      );
      throw new ForbiddenException(
        'Access denied: You are not assigned to teach or manage this class section.',
      );
    }

    return { teacher, assignedSectionIds };
  }

  /**
   * Strictly validates that the teacher teaches the specified student in at least one assigned section.
   */
  async validateStudentAccess(userId: string, studentId: string) {
    const teacher = await this.getTeacherProfileByUserId(userId);
    const assignedSectionIds = await this.getAssignedSectionIds(teacher.id);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        sectionId: { in: assignedSectionIds },
        status: RecordStatus.ACTIVE,
      },
    });

    if (!enrollment) {
      this.logger.warn(
        `Security Scope Breach: Teacher ${teacher.id} attempted to access unauthorized student ${studentId}`,
      );
      throw new ForbiddenException(
        'Access denied: This student is not enrolled in any of your assigned classes or sections.',
      );
    }

    return { teacher, enrollment };
  }

  /**
   * Strictly validates that the teacher is authorized for the specified exam schedule
   * (either teaching the subject to that section/class or assigned as an invigilator).
   */
  async validateExamAccess(userId: string, examScheduleId: string) {
    const teacher = await this.getTeacherProfileByUserId(userId);

    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id: examScheduleId },
      include: {
        invigilators: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Exam schedule not found.');
    }

    // Check if invigilator
    const isInvigilator = schedule.invigilators.some((inv) => inv.teacherId === teacher.id);

    // Check if subject teacher for the scheduled section/class
    const assignedSectionIds = await this.getAssignedSectionIds(teacher.id);
    const isSectionTeacher = schedule.sectionId
      ? assignedSectionIds.includes(schedule.sectionId)
      : false;

    // Check subject offering
    const isSubjectTeacher = await this.prisma.subjectOffering.findFirst({
      where: {
        primaryTeacherId: teacher.id,
        subjectId: schedule.subjectId,
        classId: schedule.classId,
        status: RecordStatus.ACTIVE,
      },
    });

    if (!isInvigilator && !isSectionTeacher && !isSubjectTeacher) {
      this.logger.warn(
        `Security Scope Breach: Teacher ${teacher.id} attempted to access unauthorized exam ${examScheduleId}`,
      );
      throw new ForbiddenException(
        'Access denied: You are not assigned as an examiner or invigilator for this examination.',
      );
    }

    return { teacher, schedule };
  }

  /**
   * Alias for validateExamAccess to match naming convention.
   */
  async validateExamScheduleAccess(userId: string, examScheduleId: string) {
    return this.validateExamAccess(userId, examScheduleId);
  }

  /**
   * Returns assigned subject offering IDs for a teacher.
   */
  async getAssignedSubjectOfferingIds(teacherId: string): Promise<string[]> {
    const offerings = await this.prisma.subjectOffering.findMany({
      where: { primaryTeacherId: teacherId, status: RecordStatus.ACTIVE },
      select: { id: true },
    });
    return offerings.map((o) => o.id);
  }

  /**
   * Validates teacher assignment to a specific subject offering.
   */
  async validateSubjectAccess(userId: string, subjectOfferingId: string) {
    const teacher = await this.getTeacherProfileByUserId(userId);
    const assignedOfferingIds = await this.getAssignedSubjectOfferingIds(teacher.id);

    if (!assignedOfferingIds.includes(subjectOfferingId)) {
      this.logger.warn(
        `Security Scope Breach: Teacher ${teacher.id} attempted to access unauthorized subject offering ${subjectOfferingId}`,
      );
      throw new ForbiddenException(
        'Access denied: You are not assigned to teach this subject offering.',
      );
    }

    return { teacher };
  }
}
