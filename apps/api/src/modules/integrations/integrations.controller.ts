// =============================================================================
// Phase 4S: Integrations Controller (Administrative Workspaces)
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { Public } from '../../common/decorators/public.decorator';

import { IntegrationRegistryService } from './integration-registry.service';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationHealthService } from './integration-health.service';
import { IntegrationLoggingService } from './integration-logging.service';
import { DataExchangeService } from './data-exchange/data-exchange.service';
import { CalendarAdapter } from './adapters/calendar.adapter';
import { PrismaService } from '../../core/database/prisma.service';

import {
  ICreateIntegrationDto,
  IUpdateIntegrationDto,
  IntegrationType,
} from '@school/shared-types';

@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(
    private readonly registry: IntegrationRegistryService,
    private readonly configService: IntegrationConfigService,
    private readonly healthService: IntegrationHealthService,
    private readonly loggingService: IntegrationLoggingService,
    private readonly dataExchangeService: DataExchangeService,
    private readonly calendarAdapter: CalendarAdapter,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Catalog & Configurations
  // ---------------------------------------------------------------------------

  @Get('catalog')
  @RequirePermissions('integrations:view')
  getCatalog() {
    return this.registry.getCatalog();
  }

  @Get('')
  @RequirePermissions('integrations:view')
  listConfigs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('type') type?: IntegrationType,
  ) {
    return this.configService.listConfigs(user.organizationId, { campusId, type });
  }

  @Get(':id')
  @RequirePermissions('integrations:view')
  getConfigById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.configService.getConfigById(user.organizationId, id);
  }

  @Post('')
  @RequirePermissions('integrations:manage')
  createConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ICreateIntegrationDto,
  ) {
    return this.configService.createOrUpdateConfig(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('integrations:manage')
  updateConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: IUpdateIntegrationDto,
  ) {
    return this.configService.updateConfig(user.organizationId, id, dto);
  }

  @Post(':id/enable')
  @RequirePermissions('integrations:manage')
  enableConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.configService.setEnabled(user.organizationId, id, true);
  }

  @Post(':id/disable')
  @RequirePermissions('integrations:manage')
  disableConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.configService.setEnabled(user.organizationId, id, false);
  }

  @Delete(':id')
  @RequirePermissions('integrations:manage')
  deleteConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.configService.deleteConfig(user.organizationId, id);
  }

  // ---------------------------------------------------------------------------
  // Health & Connection Testing
  // ---------------------------------------------------------------------------

  @Post(':id/test')
  @RequirePermissions('integrations:manage')
  testConnection(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.healthService.testConnection(user.organizationId, id);
  }

  @Get('health/overview')
  @RequirePermissions('integrations:view')
  getHealthOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.healthService.getHealthOverview(user.organizationId);
  }

  // ---------------------------------------------------------------------------
  // Operational & Webhook Logs
  // ---------------------------------------------------------------------------

  @Get('logs/all')
  @RequirePermissions('integrations:view')
  listLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('normalizedError') normalizedError?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.loggingService.listLogs(user.organizationId, {
      type,
      provider,
      status,
      normalizedError,
      limit,
      offset,
    });
  }

  @Get('webhooks/logs')
  @RequirePermissions('integrations:view')
  async listWebhookLogs(
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    const where: any = {};
    if (provider) where.provider = provider;
    if (status) where.status = status;

    const items = await this.prisma.webhookEventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit || 50, 100),
    });

    return items;
  }

  // ---------------------------------------------------------------------------
  // Data Exchange Subsystem
  // ---------------------------------------------------------------------------

  @Get('data-exchange/templates')
  @RequirePermissions('integrations:view')
  getDataExchangeTemplates() {
    return this.dataExchangeService.getTemplateSchemas();
  }

  @Post('data-exchange/validate')
  @RequirePermissions('integrations:manage')
  validateDataExchange(
    @Body() body: { entityType: string; csvContent: string },
  ) {
    return this.dataExchangeService.validateCsvContent(body.entityType, body.csvContent);
  }

  @Post('data-exchange/import')
  @RequirePermissions('integrations:manage')
  importData(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { entityType: string; fileName: string; csvContent: string },
  ) {
    return this.dataExchangeService.executeImport(
      user.organizationId,
      user.id,
      body.entityType,
      body.fileName,
      body.csvContent,
    );
  }

  // ---------------------------------------------------------------------------
  // Calendar RFC 5545 Feed Endpoint
  // ---------------------------------------------------------------------------

  @Public()
  @Get('calendar/feed/:feedToken.ics')
  async getCalendarFeed(
    @Param('feedToken') feedToken: string,
    @Res() res: FastifyReply,
  ) {
    const calendarText = this.calendarAdapter.generateIcsFeed(
      'Beacon Horizon Academic Calendar',
      [
        {
          id: 'term-start-2026',
          title: 'Fall Semester Orientation & Classes Begin',
          description: 'Official commencement of Academic Year 2026-2027 classes',
          startDate: new Date('2026-09-01T08:00:00Z'),
          endDate: new Date('2026-09-01T15:00:00Z'),
          category: 'ACADEMIC',
        },
        {
          id: 'midterm-exams-2026',
          title: 'Midterm Examination Week',
          description: 'Formal assessments across all enrolled subjects',
          startDate: new Date('2026-11-15T09:00:00Z'),
          endDate: new Date('2026-11-20T12:00:00Z'),
          category: 'EXAMINATION',
        },
      ],
    );

    res.header('Content-Type', 'text/calendar; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="academic-calendar.ics"');
    return res.send(calendarText);
  }
}
