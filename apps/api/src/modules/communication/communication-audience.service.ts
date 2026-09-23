// =============================================================================
// Phase 4M: Communication Audience Resolution Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  AudienceType,
  RecordStatus,
} from '@prisma/client';
import {
  ICreateAudienceDto,
} from '@school/shared-types';

export interface ResolvedRecipient {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  roleCodes: string[];
  deviceTokens: string[];
}

@Injectable()
export class CommunicationAudienceService {
  private readonly logger = new Logger(CommunicationAudienceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a saved audience segment for recurring campaigns.
   */
  async createAudience(organizationId: string, dto: ICreateAudienceDto) {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.communicationAudience.findFirst({
      where: { organizationId, code },
    });

    if (existing) {
      throw new ConflictException(`Audience with code '${code}' already exists.`);
    }

    return this.prisma.communicationAudience.create({
      data: {
        organizationId,
        name: dto.name,
        code,
        description: dto.description,
        audienceType: (dto.audienceType as AudienceType) || AudienceType.ROLES,
        filterCriteria: dto.filterCriteria || {},
        isDynamic: true,
        isActive: true,
      },
    });
  }

  /**
   * Lists saved audience segments.
   */
  async listAudiences(organizationId: string, search?: string) {
    const where: any = { organizationId, isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.communicationAudience.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves an audience segment by ID.
   */
  async getAudienceById(organizationId: string, id: string) {
    const audience = await this.prisma.communicationAudience.findFirst({
      where: { id, organizationId },
    });

    if (!audience) {
      throw new NotFoundException(`Audience with ID '${id}' not found.`);
    }

    return audience;
  }

  /**
   * Updates an existing audience segment.
   */
  async updateAudience(
    organizationId: string,
    id: string,
    dto: {
      name?: string;
      description?: string;
      audienceType?: AudienceType;
      filterCriteria?: any;
      isActive?: boolean;
    },
  ) {
    await this.getAudienceById(organizationId, id);

    return this.prisma.communicationAudience.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        audienceType: dto.audienceType,
        filterCriteria: dto.filterCriteria,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Deletes an audience segment.
   */
  async deleteAudience(organizationId: string, id: string) {
    await this.getAudienceById(organizationId, id);
    return this.prisma.communicationAudience.delete({
      where: { id },
    });
  }

  /**
   * Resolves recipients dynamically based on audience type and criteria filters.
   * This is executed server-side securely to prevent exposure of arbitrary user data.
   */
  async resolveRecipients(
    organizationId: string,
    audienceType: AudienceType,
    filterCriteria: {
      roles?: string[];
      campuses?: string[];
      campusId?: string;
      grades?: string[];
      sections?: string[];
      departments?: string[];
      userIds?: string[];
    } = {},
  ): Promise<ResolvedRecipient[]> {
    const baseWhere: any = {
      organizationId,
      status: RecordStatus.ACTIVE,
    };

    // Filter by campus if provided
    const targetCampuses = filterCriteria.campuses || (filterCriteria.campusId ? [filterCriteria.campusId] : []);
    if (targetCampuses.length > 0) {
      baseWhere.campusId = { in: targetCampuses };
    }

    switch (audienceType) {
      case AudienceType.ALL: {
        // All active users in organization (subject to campus filter)
        break;
      }

      case AudienceType.ROLES: {
        if (filterCriteria.roles && filterCriteria.roles.length > 0) {
          baseWhere.userRoles = {
            some: {
              role: {
                code: { in: filterCriteria.roles.map((r) => r.toUpperCase()) },
              },
            },
          };
        }
        break;
      }

      case AudienceType.CAMPUS: {
        // Campuses already constrained in baseWhere
        break;
      }

      case AudienceType.CLASS_SECTION: {
        // Target students and optionally parents enrolled in matching sections/grades
        const enrollmentWhere: any = {
          status: 'ACTIVE',
        };

        if (filterCriteria.sections && filterCriteria.sections.length > 0) {
          enrollmentWhere.sectionId = { in: filterCriteria.sections };
        }
        if (filterCriteria.grades && filterCriteria.grades.length > 0) {
          enrollmentWhere.class = {
            gradeLevel: { in: filterCriteria.grades },
          };
        }

        baseWhere.studentProfile = {
          enrollments: {
            some: enrollmentWhere,
          },
        };
        break;
      }

      case AudienceType.DEPARTMENT: {
        if (filterCriteria.departments && filterCriteria.departments.length > 0) {
          baseWhere.employeeProfile = {
            departmentId: { in: filterCriteria.departments },
          };
        }
        break;
      }

      case AudienceType.INDIVIDUAL:
      case AudienceType.CUSTOM: {
        if (filterCriteria.userIds && filterCriteria.userIds.length > 0) {
          baseWhere.id = { in: filterCriteria.userIds };
        }
        break;
      }

      default:
        break;
    }

    const users = await this.prisma.user.findMany({
      where: baseWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        userRoles: {
          select: {
            role: {
              select: { code: true },
            },
          },
        },
        deviceRegistrations: {
          where: { isActive: true },
          select: { deviceToken: true },
        },
      },
    });

    return users.map((u) => ({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      phone: u.phone,
      roleCodes: u.userRoles.map((ur) => ur.role.code),
      deviceTokens: u.deviceRegistrations.map((d) => d.deviceToken),
    }));
  }

  /**
   * Previews audience counts and sample recipients before committing to a campaign.
   */
  async previewAudience(
    organizationId: string,
    audienceType: AudienceType,
    filterCriteria: any = {},
  ) {
    const recipients = await this.resolveRecipients(
      organizationId,
      audienceType,
      filterCriteria,
    );

    return {
      totalRecipients: recipients.length,
      sampleRecipients: recipients.slice(0, 10).map((r) => ({
        userId: r.userId,
        name: r.name,
        email: r.email,
        phone: r.phone ? '***' + r.phone.slice(-4) : null,
        roles: r.roleCodes,
        hasDeviceToken: r.deviceTokens.length > 0,
      })),
    };
  }
}
