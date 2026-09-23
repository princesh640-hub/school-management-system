import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class CampusesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.campus.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const campus = await this.prisma.campus.findFirst({
      where: { id, organizationId },
      include: {
        academicYears: true,
        departments: true,
      },
    });

    if (!campus) {
      throw new NotFoundException(`Campus ${id} not found`);
    }

    return campus;
  }

  async create(organizationId: string, dto: any, userId?: string) {
    return this.prisma.campus.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        address: dto.address,
        city: dto.city,
        country: dto.country,
        isMainCampus: dto.isMainCampus ?? false,
        createdBy: userId,
      },
    });
  }

  async update(id: string, organizationId: string, dto: any, userId?: string) {
    await this.findOne(id, organizationId);

    return this.prisma.campus.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        isMainCampus: dto.isMainCampus,
        status: dto.status,
        updatedBy: userId,
      },
    });
  }

  async updateStatus(id: string, organizationId: string, status: any, userId?: string) {
    await this.findOne(id, organizationId);

    return this.prisma.campus.update({
      where: { id },
      data: { status, updatedBy: userId },
    });
  }
}
