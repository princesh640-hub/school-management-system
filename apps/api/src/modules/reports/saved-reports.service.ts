// =============================================================================
// Phase 4R: Saved Reports Service
// =============================================================================
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ISavedReport, ISavedReportCreateDto } from '@school/shared-types';

@Injectable()
export class SavedReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listSavedReports(orgId: string, userId: string): Promise<ISavedReport[]> {
    const records = await this.prisma.savedReport.findMany({
      where: {
        organizationId: orgId,
        OR: [{ userId }, { isPublic: true }],
      },
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((r) => this.mapToDto(r));
  }

  async getSavedReport(orgId: string, userId: string, id: string): Promise<ISavedReport> {
    const record = await this.prisma.savedReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!record) {
      throw new NotFoundException(`Saved report ${id} not found`);
    }

    if (!record.isPublic && record.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this private saved report');
    }

    return this.mapToDto(record);
  }

  async createSavedReport(
    orgId: string,
    campusId: string | null,
    userId: string,
    dto: ISavedReportCreateDto,
  ): Promise<ISavedReport> {
    const record = await this.prisma.savedReport.create({
      data: {
        organizationId: orgId,
        campusId,
        userId,
        reportKey: dto.reportKey,
        name: dto.name,
        description: dto.description || null,
        category: dto.category,
        filters: dto.filters || {},
        displayColumns: dto.displayColumns || null,
        isPublic: dto.isPublic ?? false,
        isFavorite: dto.isFavorite ?? false,
      },
    });

    await this.audit.logAction({
      action: 'SAVED_REPORT_CREATED',
      entity: 'SavedReport',
      entityId: record.id,
      userId,
      orgId,
      details: { name: dto.name, reportKey: dto.reportKey },
    });

    return this.mapToDto(record);
  }

  async updateSavedReport(
    orgId: string,
    userId: string,
    id: string,
    dto: Partial<ISavedReportCreateDto>,
  ): Promise<ISavedReport> {
    const existing = await this.prisma.savedReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException(`Saved report ${id} not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Only the author can update this saved report configuration');
    }

    const updated = await this.prisma.savedReport.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.filters ? { filters: dto.filters } : {}),
        ...(dto.displayColumns ? { displayColumns: dto.displayColumns } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        ...(dto.isFavorite !== undefined ? { isFavorite: dto.isFavorite } : {}),
      },
    });

    return this.mapToDto(updated);
  }

  async deleteSavedReport(orgId: string, userId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.savedReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException(`Saved report ${id} not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Only the author can delete this saved report');
    }

    await this.prisma.savedReport.delete({ where: { id } });
    return { success: true };
  }

  private mapToDto(r: any): ISavedReport {
    return {
      id: r.id,
      organizationId: r.organizationId,
      campusId: r.campusId,
      userId: r.userId,
      reportKey: r.reportKey,
      name: r.name,
      description: r.description,
      category: r.category,
      filters: r.filters as Record<string, any>,
      displayColumns: r.displayColumns as string[] | null,
      sortConfig: r.sortConfig as Record<string, any> | null,
      isPublic: r.isPublic,
      isFavorite: r.isFavorite,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
