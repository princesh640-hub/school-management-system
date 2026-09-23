// =============================================================================
// Phase 4R: Reports & Analytics Controller
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { QueueService, QueueName } from '../../core/queue/queue.service';
import { ReportsService } from './reports.service';
import { ReportRegistryService } from './report-registry.service';
import { ReportExecutionService } from './report-execution.service';
import { ReportExportService } from './report-export.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { SavedReportsService } from './saved-reports.service';
import { DashboardAnalyticsService } from './dashboard-analytics.service';
import { DashboardPreferencesService } from './dashboard-preferences.service';
import {
  IReportExecuteDto,
  ISavedReportCreateDto,
  IScheduledReportCreateDto,
  IDashboardPreferenceDto,
  IDrillDownQueryDto,
} from '@school/shared-types';

@ApiTags('Reports & Institutional Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly queueService: QueueService,
    private readonly reportsService: ReportsService,
    private readonly registry: ReportRegistryService,
    private readonly executionService: ReportExecutionService,
    private readonly exportService: ReportExportService,
    private readonly schedulerService: ReportSchedulerService,
    private readonly savedReportsService: SavedReportsService,
    private readonly analyticsService: DashboardAnalyticsService,
    private readonly preferencesService: DashboardPreferencesService,
  ) {}

  private getUserId(user: CurrentUserPayload): string {
    return (user as any).userId || user.id;
  }

  // ---------------------------------------------------------------------------
  // 1. Preserved Acceptance QA Endpoints (Phase 3 Verified)
  // ---------------------------------------------------------------------------

  @Get('student-list')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get basic student demographic list report' })
  @ApiQuery({ name: 'campusId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getStudentList(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getStudentListReport(user, {
      campusId,
      classId,
      sectionId,
      status,
    });
  }

  @Get('attendance-summary')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get attendance summary aggregates' })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAttendanceSummary(
    @Query('sectionId') sectionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAttendanceSummaryReport({
      sectionId,
      startDate,
      endDate,
    });
  }

  @Get('fee-summary')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get financial and fee collection summary report' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getFeeSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.reportsService.getFeeSummaryReport(user, academicYearId);
  }

  @Post('generate')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Request asynchronous bulk report generation via background queue' })
  async requestReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { reportType: string; filters?: Record<string, unknown> },
  ) {
    const job = await this.queueService.addJob(QueueName.REPORTS, 'generate-report', {
      reportType: body.reportType,
      filters: body.filters,
      organizationId: user.organizationId,
      requestedBy: this.getUserId(user),
    });

    return {
      message: 'Report generation queued successfully',
      jobId: job?.id ?? 'sync-mode',
      status: 'QUEUED',
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Operational Report Catalog
  // ---------------------------------------------------------------------------

  @Get('catalog')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get canonical catalog of operational reports across 12 domains' })
  async getCatalog() {
    return this.registry.getCatalog();
  }

  @Get('catalog/:key')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get definition and schema for a specific report' })
  async getReportDefinition(@Param('key') key: string) {
    return this.registry.getReportDefinition(key);
  }

  // ---------------------------------------------------------------------------
  // 3. Report Execution, CSV Export & Printing
  // ---------------------------------------------------------------------------

  @Post('execute')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Execute an operational report with validated filters' })
  async executeReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IReportExecuteDto,
  ) {
    const result = await this.executionService.executeReport(user, dto);

    // Record execution audit log asynchronously
    this.exportService.logExecution(
      user.organizationId,
      user.campusId || undefined,
      this.getUserId(user),
      result.metadata.reportKey,
      result.metadata.name,
      result.metadata.category,
      'JSON',
      result.metadata.totalRecords,
      result.metadata.executionTimeMs,
    );

    return result;
  }

  @Post('export')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Export operational report as RFC 4180 CSV' })
  async exportReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IReportExecuteDto,
    @Res() res: FastifyReply,
  ) {
    const result = await this.executionService.executeReport(user, { ...dto, limit: 5000 });
    const csvContent = this.exportService.generateCsv(result);

    this.exportService.logExecution(
      user.organizationId,
      user.campusId || undefined,
      this.getUserId(user),
      result.metadata.reportKey,
      result.metadata.name,
      result.metadata.category,
      'CSV',
      result.metadata.totalRecords,
      result.metadata.executionTimeMs,
    );

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${result.metadata.reportKey}-${Date.now()}.csv"`);
    return res.send(csvContent);
  }

  @Post('print')
  @RequirePermissions('reports:read')
  @Header('Content-Type', 'text/html')
  @ApiOperation({ summary: 'Render printer-ready HTML document for an operational report' })
  async printReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IReportExecuteDto,
  ) {
    const result = await this.executionService.executeReport(user, { ...dto, limit: 1000 });

    this.exportService.logExecution(
      user.organizationId,
      user.campusId || undefined,
      this.getUserId(user),
      result.metadata.reportKey,
      result.metadata.name,
      result.metadata.category,
      'PDF',
      result.metadata.totalRecords,
      result.metadata.executionTimeMs,
    );

    return this.exportService.renderPrintableReport(result, 'Academic Institution');
  }

  // ---------------------------------------------------------------------------
  // 4. Saved Report Definitions & Favorites
  // ---------------------------------------------------------------------------

  @Get('saved')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'List saved report configurations' })
  async listSavedReports(@CurrentUser() user: CurrentUserPayload) {
    return this.savedReportsService.listSavedReports(user.organizationId, this.getUserId(user));
  }

  @Get('saved/:id')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get a saved report configuration by ID' })
  async getSavedReport(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.savedReportsService.getSavedReport(user.organizationId, this.getUserId(user), id);
  }

  @Post('saved')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Save a reusable report query configuration' })
  async createSavedReport(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ISavedReportCreateDto,
  ) {
    return this.savedReportsService.createSavedReport(
      user.organizationId,
      user.campusId || null,
      this.getUserId(user),
      dto,
    );
  }

  @Put('saved/:id')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Update an existing saved report configuration' })
  async updateSavedReport(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: Partial<ISavedReportCreateDto>,
  ) {
    return this.savedReportsService.updateSavedReport(user.organizationId, this.getUserId(user), id, dto);
  }

  @Delete('saved/:id')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Delete a saved report configuration' })
  async deleteSavedReport(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.savedReportsService.deleteSavedReport(user.organizationId, this.getUserId(user), id);
  }

  // ---------------------------------------------------------------------------
  // 5. Scheduled Reports Subsystem
  // ---------------------------------------------------------------------------

  @Get('schedules')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'List automated scheduled reports for the tenant' })
  async listSchedules(@CurrentUser() user: CurrentUserPayload) {
    return this.schedulerService.listSchedules(user.organizationId);
  }

  @Post('schedules')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Create an automated scheduled report' })
  async createSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IScheduledReportCreateDto,
  ) {
    return this.schedulerService.createSchedule(
      user.organizationId,
      user.campusId || null,
      this.getUserId(user),
      dto,
    );
  }

  @Patch('schedules/:id')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Update or toggle active state of a scheduled report' })
  async updateSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: Partial<IScheduledReportCreateDto> & { isActive?: boolean },
  ) {
    return this.schedulerService.updateSchedule(user.organizationId, id, dto);
  }

  @Post('schedules/:id/run')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Trigger an immediate run of a scheduled report' })
  async runScheduleNow(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.schedulerService.triggerImmediateRun(user.organizationId, id, this.getUserId(user));
  }

  @Delete('schedules/:id')
  @RequirePermissions('reports:create')
  @ApiOperation({ summary: 'Delete a scheduled report' })
  async deleteSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.schedulerService.deleteSchedule(user.organizationId, id);
  }

  // ---------------------------------------------------------------------------
  // 6. Analytics, Trends & Actionable Drill-Downs
  // ---------------------------------------------------------------------------

  @Get('analytics/dashboard')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get unified institutional dashboard KPIs and attention alerts' })
  async getDashboardKpis(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.analyticsService.getOverviewKpis(user.organizationId, campusId || user.campusId || undefined);
  }

  @Get('analytics/trends')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get historical time-series trends (Admissions, Fees, Attendance)' })
  async getTrends(@CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.getTrends(user.organizationId);
  }

  @Get('analytics/drill-down')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get granular record dataset for actionable dashboard cards' })
  async getDrillDown(
    @CurrentUser() user: CurrentUserPayload,
    @Query() dto: IDrillDownQueryDto,
  ) {
    return this.analyticsService.getDrillDownData(user.organizationId, dto);
  }

  // ---------------------------------------------------------------------------
  // 7. Dashboard Preferences
  // ---------------------------------------------------------------------------

  @Get('dashboard/preferences')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Get role-specific dashboard widget layout preferences' })
  @ApiQuery({ name: 'roleKey', required: false })
  async getPreferences(
    @CurrentUser() user: CurrentUserPayload,
    @Query('roleKey') roleKey?: string,
  ) {
    return this.preferencesService.getPreferences(user.organizationId, this.getUserId(user), roleKey || 'PRINCIPAL');
  }

  @Put('dashboard/preferences')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Save role-specific dashboard widget layout preferences' })
  async savePreferences(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IDashboardPreferenceDto,
  ) {
    return this.preferencesService.savePreferences(user.organizationId, this.getUserId(user), dto);
  }

  // ---------------------------------------------------------------------------
  // 8. Execution Audit Logs
  // ---------------------------------------------------------------------------

  @Get('logs')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'List recent report execution logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getExecutionLogs(user.organizationId, limit ? parseInt(limit, 10) : 20);
  }
}
