import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async create(organizationId: string, dto: { name: string; code: string; description?: string; permissionCodes?: string[] }, userId: string) {
    const normalizedCode = dto.code.toUpperCase().trim();
    const existing = await this.prisma.role.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: normalizedCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Role with code "${normalizedCode}" already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        code: normalizedCode,
        description: dto.description,
        isSystem: false,
        createdBy: userId,
      },
    });

    if (dto.permissionCodes && dto.permissionCodes.length > 0) {
      await this.assignPermissions(role.id, organizationId, dto.permissionCodes, userId);
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      module: 'roles',
      resourceId: role.id,
      newValues: { name: role.name, code: role.code, isSystem: role.isSystem },
    });

    return this.findOne(role.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: { name?: string; description?: string }, userId: string) {
    const role = await this.findOne(id, organizationId);

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      module: 'roles',
      resourceId: id,
      oldValues: { name: role.name, description: role.description },
      newValues: { name: updated.name, description: updated.description },
    });

    return this.findOne(id, organizationId);
  }

  async assignPermissions(id: string, organizationId: string, permissionCodes: string[], userId: string) {
    const role = await this.findOne(id, organizationId);

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    // Replace existing role permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    for (const perm of permissions) {
      await this.prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: 'ASSIGN_PERMISSIONS',
      module: 'roles',
      resourceId: id,
      newValues: { assignedCount: permissions.length, permissionCodes },
    });

    return this.findOne(id, organizationId);
  }

  async delete(id: string, organizationId: string, userId: string) {
    const role = await this.findOne(id, organizationId);

    if (role.isSystem) {
      throw new BadRequestException(`Cannot delete system-defined role "${role.name}". System roles are protected.`);
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(`Cannot delete role "${role.name}" because it is currently assigned to ${role._count.userRoles} user(s). Reassign users before deleting.`);
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await this.prisma.role.delete({ where: { id: role.id } });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'DELETE',
      module: 'roles',
      resourceId: id,
      oldValues: { name: role.name, code: role.code },
    });

    return { message: `Role ${role.name} deleted successfully` };
  }
}
