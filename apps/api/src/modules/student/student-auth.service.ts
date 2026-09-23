// =============================================================================
// Phase 4O: Centralized Student Authorization Service
// =============================================================================
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { RecordStatus, StudentLifecycleStatus } from '@prisma/client';

@Injectable()
export class StudentAuthService {
  private readonly logger = new Logger(StudentAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the StudentProfile for a given authenticated user ID.
   * Enforces lifecycle status and throws ForbiddenException if user is suspended
   * or has no student profile.
   */
  async getStudentProfileByUserId(userId: string) {
    if (!userId || typeof userId !== 'string') {
      throw new ForbiddenException('Invalid user authentication token.');
    }

    const student = await this.prisma.studentProfile.findUnique({
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
        enrollments: {
          where: { status: RecordStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            section: {
              include: {
                class: {
                  include: {
                    campus: true,
                  },
                },
              },
            },
            academicYear: true,
          },
        },
        guardians: {
          include: {
            guardian: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student || student.status !== RecordStatus.ACTIVE) {
      this.logger.warn(`User ${userId} attempted student access without an active student profile`);
      throw new ForbiddenException(
        'Access denied: You do not have an active student profile in this institution.',
      );
    }

    // Check lifecycle status restrictions
    if (student.lifecycleStatus === StudentLifecycleStatus.SUSPENDED) {
      this.logger.warn(`Suspended student ${student.id} (user ${userId}) attempted portal access`);
      throw new ForbiddenException(
        'Access denied: Your student account is currently suspended. Please contact the administration.',
      );
    }

    return student;
  }

  /**
   * Strictly validates that the requesting student is only accessing their own records.
   * If a requestedStudentId is provided (e.g. from a manipulated parameter), it must
   * exactly match the authenticated student's profile ID.
   */
  async validateStudentAccess(userId: string, requestedStudentId?: string) {
    const student = await this.getStudentProfileByUserId(userId);

    if (requestedStudentId && requestedStudentId !== student.id) {
      this.logger.warn(
        `Security Breach Attempt: User ${userId} (student ${student.id}) tried to access student ${requestedStudentId}`,
      );
      throw new ForbiddenException(
        'Access denied: You are not authorized to view or access another student\'s records.',
      );
    }

    return student;
  }

  /**
   * Checks whether the student is eligible for active academic workflows (e.g. current timetable).
   * Graduated or withdrawn students have read-only historical access.
   */
  isEligibleForActiveAcademics(student: { lifecycleStatus: StudentLifecycleStatus }): boolean {
    return (
      student.lifecycleStatus === StudentLifecycleStatus.ACTIVE ||
      student.lifecycleStatus === StudentLifecycleStatus.ADMITTED
    );
  }
}
