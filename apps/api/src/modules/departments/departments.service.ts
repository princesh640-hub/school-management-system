import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { RecordStatus } from '@school/shared-types';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, campusId?: string) {
    const where: any = { organizationId, status: { not: RecordStatus.ARCHIVED } };
    if (campusId) where.campusId = campusId;

    return this.prisma.department.findMany({
      where,
      include: {
        campus: true,
        designations: { where: { status: RecordStatus.ACTIVE } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId },
      include: {
        campus: true,
        designations: true,
        employees: { include: { user: true } },
      },
    });

    if (!dept) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return dept;
  }

  async create(organizationId: string, defaultCampusId: string | null, dto: CreateDepartmentDto, userId: string) {
    const targetCampusId = dto.campusId || defaultCampusId;
    if (!targetCampusId) {
      throw new ConflictException('A valid campusId must be provided for department');
    }

    const existing = await this.prisma.department.findUnique({
      where: {
        campusId_code: {
          campusId: targetCampusId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Department with code "${dto.code}" already exists in this campus`);
    }

    const department = await this.prisma.department.create({
      data: {
        organizationId,
        campusId: targetCampusId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        createdBy: userId,
      },
      include: { campus: true },
    });

    await this.auditService.log({
      organizationId,
      campusId: targetCampusId,
      userId,
      action: 'CREATE',
      module: 'departments',
      resourceId: department.id,
      newValues: department,
    });

    return department;
  }

  async update(id: string, organizationId: string, dto: UpdateDepartmentDto, userId: string) {
    const existing = await this.findOne(id, organizationId);

    const updated = await this.prisma.department.update({
      where: { id: existing.id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.campusId ? { campusId: dto.campusId } : {}),
        updatedBy: userId,
      },
      include: { campus: true },
    });

    await this.auditService.log({
      organizationId,
      campusId: updated.campusId,
      userId,
      action: 'UPDATE',
      module: 'departments',
      resourceId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  async updateStatus(id: string, organizationId: string, status: RecordStatus, userId: string) {
    const existing = await this.findOne(id, organizationId);

    const updated = await this.prisma.department.update({
      where: { id: existing.id },
      data: { status, updatedBy: userId },
    });

    await this.auditService.log({
      organizationId,
      campusId: existing.campusId,
      userId,
      action: 'UPDATE_STATUS',
      module: 'departments',
      resourceId: id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status },
    });

    return updated;
  }

  async delete(id: string, organizationId: string, userId: string) {
    return this.updateStatus(id, organizationId, RecordStatus.ARCHIVED, userId);
  }
}
