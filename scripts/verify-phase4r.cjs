// =============================================================================
// Phase 4R: Reports, Analytics & Dashboards Verification Suite
// =============================================================================
const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖\x1b[0m ${message}`);
  }
}

function checkFileContains(filePath, patterns, label) {
  assert(fs.existsSync(filePath), `${label}: File exists -> ${path.relative(process.cwd(), filePath)}`);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  patterns.forEach((pattern) => {
    if (typeof pattern === 'string') {
      assert(content.includes(pattern), `${label}: Contains "${pattern}"`);
    } else if (pattern instanceof RegExp) {
      assert(pattern.test(content), `${label}: Matches pattern ${pattern}`);
    }
  });
}

console.log('\n=============================================================================');
console.log('PHASE 4R: REPORTS, ANALYTICS & DASHBOARDS SUBSYSTEM VERIFICATION');
console.log('=============================================================================\n');

// 1. Prisma Schema Verification
console.log('1. Checking Database Schema (Prisma)...');
const schemaPath = path.join(__dirname, '../apps/api/prisma/schema.prisma');
checkFileContains(
  schemaPath,
  [
    'model SavedReport {',
    'model ScheduledReport {',
    'model ReportExecutionLog {',
    'model DashboardPreference {',
    'cronExpression String    @map("cron_expression")',
    'frequency      String    @default("WEEKLY")',
    'format         String    @default("CSV")',
    'executionTimeMs Int     @default(0) @map("execution_time_ms")',
    'roleKey        String   @map("role_key")',
  ],
  'Prisma Schema'
);

// 2. Shared Types Verification
console.log('\n2. Checking Shared Types...');
const sharedTypesPath = path.join(
  __dirname,
  '../packages/shared-types/src/interfaces/reports-analytics.interface.ts'
);
checkFileContains(
  sharedTypesPath,
  [
    'export type ReportCategory =',
    'export type ReportExportFormat =',
    'export interface IReportDefinition',
    'export interface IReportCatalogCategory',
    'export interface IReportExecuteDto',
    'export interface IReportResult',
    'export interface ISavedReport',
    'export interface IScheduledReport',
    'export interface IDashboardOverviewKpis',
    'export interface IAnalyticsTrends',
    'export interface IDrillDownQueryDto',
  ],
  'Shared Types Interface'
);

const sharedTypesIndexPath = path.join(__dirname, '../packages/shared-types/src/index.ts');
checkFileContains(
  sharedTypesIndexPath,
  [
    "export * from './interfaces/reports-analytics.interface.js';",
  ],
  'Shared Types Index'
);

// 3. Backend Operational Catalog & Registry
console.log('\n3. Checking Report Registry Service & 12 Domains...');
const registryServicePath = path.join(__dirname, '../apps/api/src/modules/reports/report-registry.service.ts');
checkFileContains(
  registryServicePath,
  [
    'class ReportRegistryService',
    "'STUDENTS'",
    "'ACADEMICS'",
    "'ATTENDANCE'",
    "'EXAMINATIONS'",
    "'FINANCE'",
    "'HR'",
    "'LIBRARY'",
    "'TRANSPORT'",
    "'HOSTEL'",
    "'INVENTORY'",
    "'COMMUNICATION'",
    "'DOCUMENTS'",
    "'STUDENT_MASTER'",
    "'DAILY_ATTENDANCE_SUMMARY'",
    "'FEE_DEMAND_STATEMENT'",
    "'FEE_COLLECTION_LEDGER'",
    "'EMPLOYEE_MASTER'",
    "'PAYROLL_SUMMARY'",
    "'LIBRARY_CIRCULATION'",
    "'FLEET_UTILIZATION'",
    "'HOSTEL_OCCUPANCY'",
    "'STOCK_POSITION'",
    "'NOTIFICATION_DELIVERY_AUDIT'",
    "'ISSUED_CERTIFICATES_LEDGER'",
  ],
  'ReportRegistryService'
);

// 4. Backend Execution & Aggregation Engine
console.log('\n4. Checking Report Execution Service...');
const executionServicePath = path.join(__dirname, '../apps/api/src/modules/reports/report-execution.service.ts');
checkFileContains(
  executionServicePath,
  [
    'class ReportExecutionService',
    'executeReport',
    'user.organizationId',
    'skip',
    'take: limit',
    'executionTimeMs',
  ],
  'ReportExecutionService'
);

// 5. Backend Export & Printing Engine
console.log('\n5. Checking Report Export Service...');
const exportServicePath = path.join(__dirname, '../apps/api/src/modules/reports/report-export.service.ts');
checkFileContains(
  exportServicePath,
  [
    'class ReportExportService',
    'generateCsv',
    'escapeCsv',
    'renderPrintableReport',
    'logExecution',
  ],
  'ReportExportService'
);

// 6. Backend Scheduler & Saved Reports
console.log('\n6. Checking Scheduler & Saved Reports Services...');
const schedulerServicePath = path.join(__dirname, '../apps/api/src/modules/reports/report-scheduler.service.ts');
checkFileContains(
  schedulerServicePath,
  [
    'class ReportSchedulerService',
    'listSchedules',
    'createSchedule',
    'triggerImmediateRun',
    'deleteSchedule',
    'QueueName.REPORTS',
  ],
  'ReportSchedulerService'
);

const savedReportsServicePath = path.join(__dirname, '../apps/api/src/modules/reports/saved-reports.service.ts');
checkFileContains(
  savedReportsServicePath,
  [
    'class SavedReportsService',
    'listSavedReports',
    'createSavedReport',
    'updateSavedReport',
    'deleteSavedReport',
  ],
  'SavedReportsService'
);

// 7. Backend Analytics & Trends Engine
console.log('\n7. Checking Dashboard Analytics & Trends Service...');
const analyticsServicePath = path.join(__dirname, '../apps/api/src/modules/reports/dashboard-analytics.service.ts');
checkFileContains(
  analyticsServicePath,
  [
    'class DashboardAnalyticsService',
    'getOverviewKpis',
    'getTrends',
    'getDrillDownData',
    'feeCollectionsTrend',
    'studentAdmissionsTrend',
    'attendanceTrend',
  ],
  'DashboardAnalyticsService'
);

// 8. Backend Controller & Module
console.log('\n8. Checking Reports Controller & Module...');
const controllerPath = path.join(__dirname, '../apps/api/src/modules/reports/reports.controller.ts');
checkFileContains(
  controllerPath,
  [
    'class ReportsController',
    // Preserved Acceptance QA routes
    "@Get('student-list')",
    "@Get('attendance-summary')",
    "@Get('fee-summary')",
    "@Post('generate')",
    // New operational routes
    "@Get('catalog')",
    "@Post('execute')",
    "@Post('export')",
    "@Post('print')",
    "@Get('saved')",
    "@Get('schedules')",
    "@Get('analytics/dashboard')",
    "@Get('analytics/trends')",
    "@Get('analytics/drill-down')",
  ],
  'ReportsController'
);

const modulePath = path.join(__dirname, '../apps/api/src/modules/reports/reports.module.ts');
checkFileContains(
  modulePath,
  [
    'class ReportsModule',
    'ReportRegistryService',
    'ReportExecutionService',
    'ReportExportService',
    'ReportSchedulerService',
    'SavedReportsService',
    'DashboardAnalyticsService',
    'DashboardPreferencesService',
  ],
  'ReportsModule'
);

// 9. Web Client Workspace & Acceptance Integration
console.log('\n9. Checking Web Client Workspaces...');
const webReportsPath = path.join(__dirname, '../apps/web/src/app/(dashboard)/portal/reports/page.tsx');
checkFileContains(
  webReportsPath,
  [
    'ReportsPage',
    // Preserved Acceptance QA calls
    '/reports/student-list',
    '/reports/attendance-summary',
    '/reports/fee-summary',
    '/reports/generate',
    // Operational catalog runner
    '/reports/catalog',
    '/reports/execute',
    '/reports/export',
    '/reports/print',
    '/reports/saved',
    '/reports/schedules',
  ],
  'Web Reports Page'
);

const webDashboardPath = path.join(__dirname, '../apps/web/src/app/(dashboard)/portal/dashboard/page.tsx');
checkFileContains(
  webDashboardPath,
  [
    'DashboardOverviewPage',
    // Preserved Acceptance QA calls
    '/reports/fee-summary',
    '/reports/attendance-summary',
    '/audit?limit=5',
    // Enriched analytics calls
    '/reports/analytics/dashboard',
    '/reports/analytics/trends',
    '/reports/analytics/drill-down',
  ],
  'Web Dashboard Page'
);

// 10. Mobile Client Integration
console.log('\n10. Checking Mobile Flutter Client...');
const mobileEndpointsPath = path.join(__dirname, '../apps/mobile/lib/core/constants/api_endpoints.dart');
checkFileContains(
  mobileEndpointsPath,
  [
    'static const String reports',
    'static const String reportsCatalog',
    'static const String reportsExecute',
    'static const String analyticsDashboard',
    'static const String analyticsTrends',
  ],
  'Mobile ApiEndpoints'
);

const mobileScreenPath = path.join(__dirname, '../apps/mobile/lib/features/reports/reports_screen.dart');
checkFileContains(
  mobileScreenPath,
  [
    'class ReportsScreen',
    '_buildKpiSection',
    '_executeReport',
  ],
  'Mobile ReportsScreen'
);

// 11. Documentation & Status
console.log('\n11. Checking Documentation & Feature Status...');
const featureStatusPath = path.join(__dirname, '../docs/features/feature-status.md');
checkFileContains(
  featureStatusPath,
  [
    '| **Reports** | Cross-Domain Analytical Reporting & Dashboards | 4R | **VERIFIED** |',
  ],
  'Feature Status Documentation'
);

const finalReportPath = path.join(__dirname, '../docs/features/phase4r-final-report.md');
assert(fs.existsSync(finalReportPath), 'Phase 4R Final Report exists');

console.log('\n=============================================================================');
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('=============================================================================\n');

if (failedTests > 0) {
  console.error('\x1b[31mPhase 4R Verification FAILED with errors.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32mPhase 4R Verification PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
