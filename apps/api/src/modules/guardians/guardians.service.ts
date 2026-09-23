import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.guardianProfile.findMany({
      where: { user: { organizationId } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        students: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { id },
      include: {
        user: true,
        students: {
          include: {
            student: {
              include: {
                user: true,
                enrollments: { include: { section: { include: { class: true } } } },
              },
            },
          },
        },
      },
    });

    if (!guardian) throw new NotFoundException(`Guardian ${id} not found`);
    return guardian;
  }

  async create(organizationId: string, dto: any, creatorId?: string) {
    const passwordHash = await argon2.hash(dto.password || 'Parent@2026!');
    const role = await this.prisma.role.findFirst({
      where: { organizationId, code: 'PARENT' },
    });

    const user = await this.prisma.user.create({
      data: {
        organizationId,
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

    const guardian = await this.prisma.guardianProfile.create({
      data: {
        userId: user.id,
        relationship: dto.relationship,
        occupation: dto.occupation,
        address: dto.address,
        createdBy: creatorId,
      },
    });

    if (dto.studentId) {
      await this.prisma.studentGuardian.create({
        data: {
          studentId: dto.studentId,
          guardianId: guardian.id,
          isPrimary: dto.isPrimary ?? true,
        },
      });
    }

    return this.findOne(guardian.id);
  }
}
