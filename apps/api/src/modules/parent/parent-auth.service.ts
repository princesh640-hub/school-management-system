// =============================================================================
// Phase 4N: Centralized Parent-Student Authorization Service
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
export class ParentAuthService {
  private readonly logger = new Logger(ParentAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the active GuardianProfile for a given authenticated user ID.
   * Throws ForbiddenException if user is not a registered active guardian.
   */
  async getGuardianProfileByUserId(userId: string) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!guardian || guardian.status !== RecordStatus.ACTIVE) {
      this.logger.warn(`User ${userId} attempted parent access without an active guardian profile`);
      throw new ForbiddenException(
        'Access denied: You do not have an active parent/guardian profile in this institution.',
      );
    }

    return guardian;
  }

  /**
   * Strictly validates that the requesting parent has an authorized, active link to the requested student.
   * NEVER trusts client-side state, URL params, or cached child context without this check.
   */
  async validateGuardianStudentAccess(userId: string, studentId: string) {
    if (!studentId || typeof studentId !== 'string') {
      throw new ForbiddenException('Invalid student identification provided.');
    }

    const guardian = await this.getGuardianProfileByUserId(userId);

    const link = await this.prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId: guardian.id,
        },
      },
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
                campusId: true,
              },
            },
            enrollments: {
              where: { status: 'ACTIVE' },
              orderBy: { enrollmentDate: 'desc' },
              take: 1,
              include: {
                class: { select: { id: true, name: true, gradeLevel: true } },
                section: { select: { id: true, name: true } },
                academicYear: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!link) {
      this.logger.warn(
        `SECURITY ALERT: Guardian ${guardian.id} (User ${userId}) attempted unauthorized access to student ${studentId}`,
      );
      throw new ForbiddenException(
        'Access denied: You are not authorized to view or manage records for this student.',
      );
    }

    if (!link.student) {
      throw new NotFoundException(`Student profile not found for ID '${studentId}'.`);
    }

    return {
      guardian,
      studentGuardian: link,
      student: link.student,
    };
  }

  /**
   * Resolves the list of all authorized student IDs linked to a guardian user.
   */
  async getAuthorizedStudentIds(userId: string): Promise<string[]> {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        students: {
          select: { studentId: true },
        },
      },
    });

    if (!guardian) return [];
    return guardian.students.map((s) => s.studentId);
  }
}
