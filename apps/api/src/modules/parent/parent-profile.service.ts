// =============================================================================
// Phase 4N: Parent Profile & Preferences Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ParentAuthService } from './parent-auth.service';
import { ParentChildrenService } from './parent-children.service';
import {
  IParentProfile,
  IUpdateParentProfileDto,
} from '@school/shared-types';

@Injectable()
export class ParentProfileService {
  private readonly logger = new Logger(ParentProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parentAuth: ParentAuthService,
    private readonly childrenService: ParentChildrenService,
  ) {}

  /**
   * Retrieves the authenticated parent's personal profile and linked children roster.
   */
  async getGuardianProfile(userId: string): Promise<IParentProfile> {
    const guardian = await this.parentAuth.getGuardianProfileByUserId(userId);
    const linkedChildren = await this.childrenService.getChildren(userId);

    return {
      guardianId: guardian.id,
      userId: guardian.userId,
      firstName: guardian.user.firstName,
      lastName: guardian.user.lastName,
      fullName: `${guardian.user.firstName} ${guardian.user.lastName}`.trim(),
      email: guardian.user.email,
      phone: guardian.user.phone,
      occupation: guardian.occupation,
      relationship: guardian.relationship,
      address: guardian.address,
      avatarUrl: (guardian.user as any).avatarUrl || null,
      childrenCount: linkedChildren.length,
      linkedChildren,
    };
  }

  /**
   * Updates allowed parent profile contact details (phone, occupation, address).
   * Strictly prevents parents from modifying guardian-child relationship ownership.
   */
  async updateGuardianProfile(userId: string, dto: IUpdateParentProfileDto) {
    const guardian = await this.parentAuth.getGuardianProfileByUserId(userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.phone !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { phone: dto.phone },
        });
      }

      await tx.guardianProfile.update({
        where: { id: guardian.id },
        data: {
          occupation: dto.occupation !== undefined ? dto.occupation : guardian.occupation,
          address: dto.address !== undefined ? dto.address : guardian.address,
        },
      });

      return this.getGuardianProfile(userId);
    });
  }

  /**
   * Retrieves parent's notification and quiet-hour channel preferences.
   */
  async getParentPreferences(userId: string) {
    const preferences = await this.prisma.communicationPreference.findMany({
      where: { userId },
    });

    const quietHours = preferences.find(
      (p) => p.quietHoursStart && p.quietHoursEnd,
    );

    return {
      userId,
      preferences,
      quietHoursStart: quietHours?.quietHoursStart || null,
      quietHoursEnd: quietHours?.quietHoursEnd || null,
    };
  }
}
