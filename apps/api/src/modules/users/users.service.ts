import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { RecordStatus } from '@school/shared-types';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserLifecycleAction, UserLifecycleDto } from './dto/user-lifecycle.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const where: any = { organizationId };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          avatarUrl: true,
          campusId: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data: users,
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async create(organizationId: string, dto: any, creatorId?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new Error(`User with email ${dto.email} already exists`);
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        campusId: dto.campusId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        gender: dto.gender,
        createdBy: creatorId,
        status: 'ACTIVE',
      },
    });

    if (dto.roleCodes && dto.roleCodes.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: {
          organizationId,
          code: { in: dto.roleCodes },
        },
      });

      for (const role of roles) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }
    }

    return this.findOne(user.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: any, updaterId?: string) {
    await this.findOne(id, organizationId);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        gender: dto.gender,
        campusId: dto.campusId,
        status: dto.status,
        updatedBy: updaterId,
      },
    });

    return this.findOne(updated.id, organizationId);
  }

  async updateStatus(id: string, organizationId: string, status: any, updaterId?: string) {
    await this.findOne(id, organizationId);

    await this.prisma.user.update({
      where: { id },
      data: { status, updatedBy: updaterId },
    });

    return { message: `User status updated to ${status}` };
  }

  async assignRoles(id: string, organizationId: string, roleCodes: string[]) {
    await this.findOne(id, organizationId);

    const roles = await this.prisma.role.findMany({
      where: { organizationId, code: { in: roleCodes } },
    });

    // Remove existing roles and assign new list
    await this.prisma.userRole.deleteMany({ where: { userId: id } });

    for (const r of roles) {
      await this.prisma.userRole.create({
        data: { userId: id, roleId: r.id },
      });
    }

    return this.findOne(id, organizationId);
  }

  async overridePermission(id: string, organizationId: string, permCode: string, isGranted: boolean) {
    await this.findOne(id, organizationId);

    const permission = await this.prisma.permission.findUnique({
      where: { code: permCode },
    });

    if (!permission) {
      throw new NotFoundException(`Permission ${permCode} does not exist`);
    }

    await this.prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionId: {
          userId: id,
          permissionId: permission.id,
        },
      },
      update: { isGranted },
      create: {
        userId: id,
        permissionId: permission.id,
        isGranted,
      },
    });

    return { message: `Permission override for ${permCode} set to ${isGranted}` };
  }

  async applyLifecycle(
    id: string,
    organizationId: string,
    dto: UserLifecycleDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if ((dto.action === UserLifecycleAction.SUSPEND || dto.action === UserLifecycleAction.ARCHIVE) && id === actorId) {
      throw new BadRequestException('Security violation: An administrator cannot suspend or archive their own account');
    }

    if ((dto.action === UserLifecycleAction.SUSPEND || dto.action === UserLifecycleAction.ARCHIVE) && !dto.reason?.trim()) {
      throw new BadRequestException(`An explicit justification reason is required to ${dto.action.toLowerCase()} a user account`);
    }

    let newStatus: RecordStatus = user.status;
    const updateData: any = { updatedBy: actorId };

    switch (dto.action) {
      case UserLifecycleAction.ACTIVATE:
        newStatus = RecordStatus.ACTIVE;
        updateData.status = newStatus;
        updateData.lockedUntil = null;
        updateData.failedLoginAttempts = 0;
        break;

      case UserLifecycleAction.DEACTIVATE:
        newStatus = RecordStatus.INACTIVE;
        updateData.status = newStatus;
        break;

      case UserLifecycleAction.SUSPEND:
        newStatus = RecordStatus.SUSPENDED;
        updateData.status = newStatus;
        updateData.suspendedAt = new Date();
        updateData.suspendedReason = dto.reason;
        // Invalidate active sessions immediately
        await this.prisma.userSession.updateMany({
          where: { userId: id, isRevoked: false },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: `User suspended: ${dto.reason}`,
          },
        });
        break;

      case UserLifecycleAction.RESTORE:
        newStatus = RecordStatus.ACTIVE;
        updateData.status = newStatus;
        updateData.suspendedAt = null;
        updateData.suspendedReason = null;
        updateData.archivedAt = null;
        updateData.lockedUntil = null;
        updateData.failedLoginAttempts = 0;
        break;

      case UserLifecycleAction.ARCHIVE:
        newStatus = RecordStatus.ARCHIVED;
        updateData.status = newStatus;
        updateData.archivedAt = new Date();
        // Invalidate active sessions
        await this.prisma.userSession.updateMany({
          where: { userId: id, isRevoked: false },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: `User archived: ${dto.reason}`,
          },
        });
        break;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      organizationId,
      campusId: user.campusId,
      userId: actorId,
      action: `LIFECYCLE_${dto.action}`,
      module: 'users',
      resourceId: id,
      oldValues: { status: user.status, suspendedAt: user.suspendedAt, archivedAt: user.archivedAt },
      newValues: { status: newStatus, reason: dto.reason, action: dto.action },
      ipAddress,
      userAgent,
    });

    return {
      message: `User lifecycle action ${dto.action} applied successfully`,
      status: newStatus,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        status: updatedUser.status,
      },
    };
  }
}
