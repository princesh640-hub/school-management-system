import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { RecordStatus } from '@school/shared-types';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, departmentId?: string, search?: string) {
    const where: any = { organizationId, status: { not: RecordStatus.ARCHIVED } };
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.designation.findMany({
      where,
      include: { department: true, _count: { select: { employees: true } } },
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const designation = await this.prisma.designation.findFirst({
      where: { id, organizationId },
      include: { department: true, employees: { include: { user: true } } },
    });

    if (!designation) {
      throw new NotFoundException(`Designation with ID ${id} not found`);
    }

    return designation;
  }

  async create(organizationId: string, dto: CreateDesignationDto, userId: string) {
    const existing = await this.prisma.designation.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Designation with code "${dto.code}" already exists`);
    }

    const designation = await this.prisma.designation.create({
      data: {
        organizationId,
        departmentId: dto.departmentId || null,
        title: dto.title,
        code: dto.code.toUpperCase(),
        description: dto.description,
        createdBy: userId,
      },
      include: { department: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      module: 'designations',
      resourceId: designation.id,
      newValues: designation,
    });

    return designation;
  }

  async update(id: string, organizationId: string, dto: UpdateDesignationDto, userId: string) {
    const existing = await this.findOne(id, organizationId);

    const updated = await this.prisma.designation.update({
      where: { id: existing.id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedBy: userId,
      },
      include: { department: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      module: 'designations',
      resourceId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  async updateStatus(id: string, organizationId: string, status: RecordStatus, userId: string) {
    const existing = await this.findOne(id, organizationId);

    const updated = await this.prisma.designation.update({
      where: { id: existing.id },
      data: { status, updatedBy: userId },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE_STATUS',
      module: 'designations',
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
