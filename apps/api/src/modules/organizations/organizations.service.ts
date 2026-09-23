import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getCurrent(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        campuses: {
          select: { id: true, name: true, code: true, isMainCampus: true, status: true },
        },
        _count: {
          select: { users: true, campuses: true, departments: true, designations: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateCurrent(
    organizationId: string,
    dto: {
      name?: string;
      domain?: string;
      currency?: string;
      timezone?: string;
      address?: string;
      city?: string;
      country?: string;
      phone?: string;
      email?: string;
      website?: string;
      taxId?: string;
      logoUrl?: string;
    },
    userId?: string,
  ) {
    const existing = await this.getCurrent(organizationId);

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.domain !== undefined ? { domain: dto.domain } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE_PROFILE',
      module: 'organizations',
      resourceId: organizationId,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }
}
