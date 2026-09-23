// =============================================================================
// Phase 4O: Student Profile & Preferences Service
// =============================================================================
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StudentAuthService } from './student-auth.service';
import {
  IStudentProfile,
  IUpdateStudentProfileDto,
  IStudentPreferencesDto,
} from '@school/shared-types';

@Injectable()
export class StudentProfileService {
  private readonly logger = new Logger(StudentProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAuth: StudentAuthService,
  ) {}

  /**
   * Retrieves sanitized student profile.
   * Internal administrative remarks, staff notes, and disciplinary details are excluded.
   */
  async getStudentProfile(userId: string): Promise<IStudentProfile> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);
    const activeEnrollment = student.enrollments[0];

    const guardians = (student.guardians || []).map((g) => ({
      name: `${g.guardian.user.firstName} ${g.guardian.user.lastName}`.trim(),
      relationship: g.relationship || 'Guardian',
      isPrimary: g.isPrimary,
      canPickup: g.canPickup,
    }));

    return {
      id: student.id,
      userId: student.userId,
      admissionNumber: student.admissionNumber,
      admissionDate: student.admissionDate.toISOString().split('T')[0],
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      phone: student.user.phone,
      avatarUrl: student.user.avatarUrl,
      gender: (student as any).gender || null,
      dateOfBirth: student.dateOfBirth.toISOString().split('T')[0],
      bloodGroup: student.bloodGroup,
      address: student.address,
      emergencyContactName: student.emergencyContactName,
      emergencyContactPhone: student.emergencyContactPhone,
      emergencyContactRelation: student.emergencyContactRelation,
      lifecycleStatus: student.lifecycleStatus,
      currentClass: activeEnrollment?.section?.class?.name || 'Unassigned',
      currentSection: activeEnrollment?.section?.name || 'Unassigned',
      academicYear: activeEnrollment?.academicYear?.name || 'Current Year',
      campusName: activeEnrollment?.section?.class?.campus?.name || 'Main Campus',
      guardians,
    };
  }

  /**
   * Allows limited self-service update of non-academic fields (phone, address, emergency contact phone).
   * Institutional parameters (class, section, admissionNumber, lifecycleStatus) CANNOT be updated by students.
   */
  async updateStudentProfile(
    userId: string,
    dto: IUpdateStudentProfileDto,
  ): Promise<IStudentProfile> {
    const student = await this.studentAuth.getStudentProfileByUserId(userId);

    // Update student profile table fields
    await this.prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        address: dto.address !== undefined ? dto.address : undefined,
        emergencyContactPhone:
          dto.emergencyContactPhone !== undefined
            ? dto.emergencyContactPhone
            : undefined,
      },
    });

    // Update user table phone if provided
    if (dto.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone: dto.phone },
      });
    }

    return this.getStudentProfile(userId);
  }

  /**
   * Retrieves notification and quiet hours preferences for the authenticated student.
   */
  async getStudentPreferences(userId: string): Promise<IStudentPreferencesDto> {
    const preference = await this.prisma.communicationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      return {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        quietHoursEnabled: false,
        preferredLanguage: 'en',
      };
    }

    return {
      emailNotifications: preference.emailOptIn,
      smsNotifications: preference.smsOptIn,
      pushNotifications: preference.pushOptIn,
      quietHoursEnabled: preference.quietHoursEnabled,
      quietHoursStart: preference.quietHoursStart || undefined,
      quietHoursEnd: preference.quietHoursEnd || undefined,
      preferredLanguage: preference.preferredLanguage,
    };
  }

  /**
   * Updates notification and quiet hours preferences.
   */
  async updateStudentPreferences(
    userId: string,
    dto: IStudentPreferencesDto,
  ): Promise<IStudentPreferencesDto> {
    await this.prisma.communicationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailOptIn: dto.emailNotifications ?? true,
        smsOptIn: dto.smsNotifications ?? true,
        pushOptIn: dto.pushNotifications ?? true,
        whatsappOptIn: false,
        quietHoursEnabled: dto.quietHoursEnabled ?? false,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        preferredLanguage: (dto.preferredLanguage as any) || 'EN',
      },
      update: {
        emailOptIn: dto.emailNotifications,
        smsOptIn: dto.smsNotifications,
        pushOptIn: dto.pushNotifications,
        quietHoursEnabled: dto.quietHoursEnabled,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        preferredLanguage: (dto.preferredLanguage as any) || undefined,
      },
    });

    return this.getStudentPreferences(userId);
  }
}
