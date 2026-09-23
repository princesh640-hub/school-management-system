// =============================================================================
// Phase 4R: Dashboard Preferences Service
// =============================================================================
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { IDashboardPreferenceDto } from '@school/shared-types';

@Injectable()
export class DashboardPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(orgId: string, userId: string, roleKey: string): Promise<IDashboardPreferenceDto> {
    const pref = await this.prisma.dashboardPreference.findUnique({
      where: {
        organizationId_userId_roleKey: {
          organizationId: orgId,
          userId,
          roleKey,
        },
      },
    });

    if (pref) {
      return {
        roleKey: pref.roleKey,
        layoutConfig: pref.layoutConfig as Record<string, any>,
        defaultFilters: pref.defaultFilters as Record<string, any> | undefined,
      };
    }

    return {
      roleKey,
      layoutConfig: {
        visibleWidgets: ['kpis', 'trends', 'attentionItems', 'recentActivity'],
        widgetOrder: ['kpis', 'attentionItems', 'trends', 'recentActivity'],
      },
    };
  }

  async savePreferences(
    orgId: string,
    userId: string,
    dto: IDashboardPreferenceDto,
  ): Promise<IDashboardPreferenceDto> {
    const roleKey = dto.roleKey || 'PRINCIPAL';

    const pref = await this.prisma.dashboardPreference.upsert({
      where: {
        organizationId_userId_roleKey: {
          organizationId: orgId,
          userId,
          roleKey,
        },
      },
      create: {
        organizationId: orgId,
        userId,
        roleKey,
        layoutConfig: dto.layoutConfig || {},
        defaultFilters: dto.defaultFilters || {},
      },
      update: {
        layoutConfig: dto.layoutConfig || {},
        defaultFilters: dto.defaultFilters || {},
      },
    });

    return {
      roleKey: pref.roleKey,
      layoutConfig: pref.layoutConfig as Record<string, any>,
      defaultFilters: pref.defaultFilters as Record<string, any> | undefined,
    };
  }
}
