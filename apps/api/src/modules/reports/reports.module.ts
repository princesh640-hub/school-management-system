// =============================================================================
// Phase 4R: Reports & Analytics Module
// =============================================================================
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportRegistryService } from './report-registry.service';
import { ReportExecutionService } from './report-execution.service';
import { ReportExportService } from './report-export.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { SavedReportsService } from './saved-reports.service';
import { DashboardAnalyticsService } from './dashboard-analytics.service';
import { DashboardPreferencesService } from './dashboard-preferences.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../../core/queue/queue.module';

@Module({
  imports: [QueueModule, AuditModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportRegistryService,
    ReportExecutionService,
    ReportExportService,
    ReportSchedulerService,
    SavedReportsService,
    DashboardAnalyticsService,
    DashboardPreferencesService,
  ],
  exports: [
    ReportsService,
    ReportRegistryService,
    ReportExecutionService,
    ReportExportService,
    ReportSchedulerService,
    SavedReportsService,
    DashboardAnalyticsService,
    DashboardPreferencesService,
  ],
})
export class ReportsModule {}
