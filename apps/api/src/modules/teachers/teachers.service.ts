import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, campusId?: string) {
    return this.prisma.teacherProfile.findMany({
      where: {
        user: {
          organizationId,
          ...(campusId ? { campusId } : {}),
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        sections: { select: { id: true, name: true, class: { select: { name: true } } } },
        subjectTeachers: {
          include: {
            subject: { select: { name: true, code: true } },
            section: { select: { name: true, class: { select: { name: true } } } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        user: true,
        sections: { include: { class: true } },
        subjectTeachers: {
          include: {
            subject: true,
            section: { include: { class: true } },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }

    return teacher;
  }

  async create(organizationId: string, dto: any, creatorId?: string) {
    const passwordHash = await argon2.hash(dto.password || 'Teacher@2026!');
    const role = await this.prisma.role.findFirst({
      where: { organizationId, code: 'TEACHER' },
    });

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
        userRoles: role ? { create: { roleId: role.id } } : undefined,
      },
    });

    return this.prisma.teacherProfile.create({
      data: {
        userId: user.id,
        employeeCode: dto.employeeCode,
        specialization: dto.specialization,
        qualification: dto.qualification,
        joiningDate: new Date(dto.joiningDate || Date.now()),
        createdBy: creatorId,
      },
      include: { user: true },
    });
  }
}
