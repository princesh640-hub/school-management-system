# Phase 4R — Reports, Analytics & Dashboards Specification

**Date:** September 20, 2026  
**Status:** **IN PROGRESS**  
**Subsystem:** Centralized Reporting Architecture, Operational Report Catalog, Analytics Engine, Role-Based Dashboards, Scheduled Reports, Export & Print Engine  

---

## 1. EXISTING Architecture & Primitives

The system has extensive domain data and earlier foundations that must be unified and leveraged without duplication:

1. **Transactional Domain Models (Phases 4A–4Q):**
   - Students & Admissions (Phase 4B): `StudentProfile`, `AdmissionApplication`, `Enrollment`, `StudentDocument`.
   - Academics & Curriculum (Phase 4C): `Class`, `Section`, `Subject`, `SubjectOffering`, `ClassTeacherAssignment`, `SubjectTeacher`.
   - Attendance & Leave (Phase 4D): `AttendanceRecord`, `AttendanceCorrection`, `LeaveApplication`, `LeaveBalance`.
   - Timetable & Scheduling (Phase 4E): `TimetableEntry`, `TimetableVersion`, `PeriodSlot`, `Room`.
   - Examinations & Grading (Phase 4F): `ExamSession`, `ExamSchedule`, `ExamResult`, `GradeScale`, `ReportCard`.
   - Fees & Billing (Phase 4G): `FeeStructure`, `FeeCategory`, `FeeInvoice`, `InvoiceItem`, `PaymentTransaction`, `CashierShift`.
   - HR & Payroll (Phase 4H): `EmployeeProfile`, `Department`, `Designation`, `SalaryStructure`, `PayrollRun`, `Payslip`.
   - Library (Phase 4I): `LibraryTitle`, `BookCopy`, `BookLoan`, `TitleReservation`, `LibraryFine`, `LibraryMember`.
   - Transport (Phase 4J): `Vehicle`, `DriverProfile`, `TransportRoute`, `RouteStop`, `StudentTransportAssignment`, `BoardingEvent`, `VehicleMaintenanceRecord`.
   - Hostel (Phase 4K): `Hostel`, `HostelRoom`, `HostelBed`, `HostelAllocation`, `HostelRollCall`, `HostelOuting`.
   - Inventory & Procurement (Phase 4L): `Item`, `InventoryItem`, `StockMovement`, `StockAudit`, `PurchaseRequest`, `PurchaseOrder`, `GoodsReceivedNote`.
   - Communication (Phase 4M): `Announcement`, `Notification`, `NotificationDelivery`, `CommunicationTemplate`.
   - Parent & Student Portals (Phases 4N, 4O, 4P): Identity-bound dashboards and attention metrics.
   - Documents & Certificates (Phase 4Q): `InstitutionalDocument`, `DocumentVersion`, `DocumentShare`, `CertificateType`, `IssuedCertificate`, `DocumentGenerationJob`.

2. **Infrastructure Foundations:**
   - BullMQ Queue: `QueueName.REPORTS = 'queue:reports'` in `QueueService` (`apps/api/src/core/queue/queue.service.ts`).
   - Audit Logging: `AuditService` (`apps/api/src/modules/audit/audit.service.ts`).
   - Print & PDF Architecture: Centralized `@media print` CSS in `apps/web/src/app/globals.css`, `PrintingService` in `apps/api/src/modules/printing/`.
   - Base Reports Endpoints: `ReportsController` and `ReportsService` (`/reports/student-list`, `/reports/attendance-summary`, `/reports/fee-summary`, `/reports/generate`).

---

## 2. MISSING Capabilities

1. **Centralized Reporting Catalog:**
   - No structured registry defining operational reports across all 12 institutional domains with parameter schemas, column definitions, and required permissions.
   - No uniform report execution response format containing metadata, summary metrics, table data, sub-totals, and execution audit logging.

2. **Universal Parameter Filtering & Validation:**
   - Missing unified server-side parameter validation enforcing tenant and campus boundaries across all operational reports.
   - Lack of date range normalization, academic year binding, and role-scoped filter guards.

3. **Multi-Format Export & Printing Integration:**
   - Missing RFC 4180-compliant CSV generation and download handler.
   - Missing integration of cross-domain operational reports with the Phase 4Q print/PDF layout engine.

4. **Scheduled & Saved Reports Subsystem:**
   - No database models or services for persisting user-saved report configurations (filters, columns, favorites).
   - No recurring report scheduler supporting crons, frequency (DAILY, WEEKLY, MONTHLY), delivery channels (EMAIL, IN-APP), and background dispatch via BullMQ.

5. **Analytics & Trend Visualizers:**
   - Missing multi-role analytics engine calculating authentic time-series trends (monthly admissions, monthly fee collections, attendance trends) from authoritative database records.
   - Missing actionable drill-down workflows linking high-level dashboard metrics to granular student, employee, or invoice rosters.

6. **Dashboard Personalization & Preferences:**
   - No mechanism for storing user dashboard widget preferences and visibility layouts per role.

---

## 3. TO IMPLEMENT

### Database Schema (`apps/api/prisma/schema.prisma`):
- `SavedReport`: User-saved report query configurations, filters, column visibility, and favorite toggles.
- `ScheduledReport`: Automated recurring report schedules with cron expressions, frequencies, format, recipients, and status.
- `ReportExecutionLog`: Tamper-evident execution audit logging (report key, format, row count, execution duration, requester).
- `DashboardPreference`: Role-specific widget layout configurations and default filter preferences.

### Shared Types (`packages/shared-types`):
- `packages/shared-types/src/interfaces/reports-analytics.interface.ts`:
  - Report Catalog & Metadata: `IReportDefinition`, `IReportCatalogCategory`, `IReportParameterDefinition`, `IReportColumnDefinition`.
  - Execution & Data: `IReportExecuteDto`, `IReportResult`, `IReportMetadata`, `IReportPagination`.
  - Saved & Scheduled Reports: `ISavedReport`, `ISavedReportCreateDto`, `IScheduledReport`, `IScheduledReportCreateDto`.
  - Analytics & Dashboards: `IDashboardOverviewKpis`, `ITimeSeriesDataPoint`, `IAnalyticsTrends`, `IDashboardPreferenceDto`, `IDrillDownQueryDto`.

### Backend Architecture (`apps/api/src/modules/reports/`):
- `report-registry.service.ts`: Authoritative catalog of 36+ standard institutional reports across 12 operational categories.
- `report-execution.service.ts`: Query orchestration with tenant/campus scope enforcement, data aggregation, column transformation, subtotaling, and pagination.
- `report-export.service.ts`: CSV streaming, printable HTML report generation with institutional headers/footers, and execution logging.
- `report-scheduler.service.ts`: Recurring report dispatch, cron validation, recipient routing, and BullMQ queue integration.
- `saved-reports.service.ts`: Management of user-saved report configurations and favorites.
- `dashboard-analytics.service.ts`: Role-aware analytical KPI calculation, time-series trend aggregation, and drill-down dataset queries.
- `dashboard-preferences.service.ts`: Widget layout persistence per user and role.
- `reports.controller.ts`: REST endpoints for catalog, execution, legacy endpoints, exports, schedules, saved reports, and analytics.

### Web Workspace (`apps/web`):
- `/portal/reports`: Comprehensive Report Center with Catalog Browser, Interactive Filter Drawer, Table Preview with sorting/pagination, CSV Export, Print Layout, Saved Reports, and Scheduled Reports management.
- `/portal/dashboard`: Enriched role-aware dashboard featuring authoritative KPI cards, time-series trend charts, and actionable drill-down drawers.

### Mobile Client (`apps/mobile`):
- `ApiEndpoints`: Analytical dashboard, reports catalog, execution, and export routes.
- `reports_screen.dart`: Mobile-optimized executive KPI overview, operational reports browser, and filterable report viewer.

---

## 4. DEFERRED

1. **Arbitrary User-Defined SQL Query Builders (Raw SQL Console)**:
   - Deferred for security, tenant safety, and SQL injection prevention. Replaced by parameter-driven query services with strict whitelists.
2. **Third-Party External BI Server Integrations (Tableau, PowerBI Direct Connectors)**:
   - Deferred to Phase 4S/4T; native in-app analytics and standard CSV/PDF exports fulfill institutional compliance.
3. **Continuous Real-Time WebSockets for Low-Velocity Reports**:
   - Polling and asynchronous BullMQ workers adequately handle report generation without unnecessary WebSocket connections.
