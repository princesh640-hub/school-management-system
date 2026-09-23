# Phase 4K — School Hostel Management Subsystem

## 1. Domain Overview & Scope

Phase 4K establishes a complete, configurable, multi-campus, secure, and production-grade School Hostel Management Subsystem.
The subsystem manages the full institutional accommodation lifecycle:
**Campus → Hostel → Building / Block → Floor → Room → Bed → Student Allocation → Hostel Residence → Attendance / Incidents / Maintenance / Outings / Visitors / Fees / Reports**

The subsystem strictly maintains identity reuse (referencing existing `StudentProfile`, `EmployeeProfile`, `Campus`, `AcademicYear`, and `Organization` records), enforces server-side eligibility and room capacity constraints with audited overrides, manages sequential allocation and check-in/check-out workflows, provides a distinct hostel attendance roll-call engine, tracks student movement and curfews with guardian consent verification, manages visitor logs and facility maintenance, links fee references directly into the Phase 4G Finance engine without duplicating ledgers, and provides an accessible 10-tab Command Center web interface.

---

## 2. Gap Analysis

### EXISTING
- **Multi-Campus Organization**: `Organization` and `Campus` models, academic terms, and room structures.
- **Identity Foundation**: `User`, `StudentProfile`, `EmployeeProfile`, `GuardianProfile`, `StudentGuardian`.
- **RBAC & Permissions**: Roles (`WARDEN`, `SUPER_ADMIN`, `STUDENT`, `PARENT`, `ACCOUNTANT`), and `AppModule.HOSTEL` in `@school/shared-types`.
- **Audit & Security**: Centralized `AuditService` for immutable event logging.
- **Notifications Infrastructure**: `NotificationsService` for queued notifications.
- **Finance Boundary (Phase 4G)**: `FeeCategory`, `FeeStructure`, `FeeInvoice`, `PaymentTransaction` for authoritative billing.
- **Operations Web Hub**: `/portal/operations` with a placeholder tab for Hostel.
- **API Stub**: Minimal `/api/v1/hostel/rooms` route returning boundary active message.

### MISSING
- **Database Layer**:
  - No `Hostel` facility model (gender policies, capacity, campus relation).
  - No `HostelBuilding` or `HostelFloor` hierarchy models.
  - No `HostelRoom` model (room type, capacity, gender eligibility, facilities).
  - No `HostelBed` physical inventory model (bed code, condition, status).
  - No `HostelAllocation` residence model (`ALLOC-YYYY-XXXXX`, check-in/out timestamps, transfer tracking).
  - No `HostelAttendance` model (distinct from academic attendance, session-based roll call).
  - No `HostelWarden` staff assignment model.
  - No `HostelOuting` curfew/movement tracking model (`OUT-YYYY-XXXXX`, guardian consent, return status).
  - No `HostelVisitor` visitor access log model (`VIS-YYYY-XXXXX`).
  - No `HostelIncident` and `HostelIncidentStudent` models (`HINC-YYYY-XXXXX`).
  - No `HostelMaintenanceRequest` facility repair model (`HMNT-YYYY-XXXXX`).
- **Domain Business Logic**:
  - No capacity enforcement engine preventing over-allocation unless authorized.
  - No transactional bed allocation guard preventing double assignment of the same bed.
  - No room transfer workflow preserving historical residency trails.
  - No bulk allocation preview & exception engine.
  - No night roll-call bulk marking engine.
  - No curfew late-return scanner.
- **Web UI & Experience**:
  - No dedicated `/portal/hostel` 10-tab workspace.
  - No visual room/bed occupancy matrix.
  - Operations tab badge remains `'Future'`.

### TO IMPLEMENT
1. **Work Package 1: Prisma Schema Expansion**:
   - 15 Enums: `HostelStatus`, `HostelType`, `HostelRoomType`, `HostelGenderEligibility`, `HostelRoomStatus`, `HostelBedStatus`, `HostelAllocationStatus`, `HostelAttendanceStatus`, `HostelStaffRole`, `HostelOutingStatus`, `HostelOutingType`, `HostelMaintenancePriority`, `HostelMaintenanceStatus`, `HostelVisitorStatus`, `HostelIncidentStatus`.
   - 13 Models: `Hostel`, `HostelBuilding`, `HostelFloor`, `HostelRoom`, `HostelBed`, `HostelAllocation`, `HostelAttendance`, `HostelWarden`, `HostelOuting`, `HostelVisitor`, `HostelIncident`, `HostelIncidentStudent`, `HostelMaintenanceRequest`.
   - Back-references on `Organization`, `Campus`, `StudentProfile`, `EmployeeProfile`, `AcademicYear`.
2. **Work Package 2: Shared Types (`packages/shared-types`)**:
   - `packages/shared-types/src/interfaces/hostel.interface.ts`.
   - Export all domain entities, DTOs, capacity schemas, attendance sheets, and reporting contracts.
3. **Work Package 3: Modular Backend Services**:
   - `hostel-structure.service.ts`: Hostels, buildings, floors, rooms, beds, capacity tracking, facilities.
   - `hostel-allocation.service.ts`: Eligibility verification, single & bulk allocation (`ALLOC-`), check-in/out, transfers, history.
   - `hostel-attendance.service.ts`: Hostel roll call, bulk attendance marking, session records.
   - `hostel-movement.service.ts`: Curfew & outings (`OUT-`), approval workflows, visitor access (`VIS-`).
   - `hostel-operations.service.ts`: Warden assignments, incidents (`HINC-`), maintenance requests (`HMNT-`).
   - `hostel-reports.service.ts`: Dashboard KPIs, occupancy/vacancy, attendance summaries, maintenance cost reports.
   - `hostel.controller.ts`: 50+ REST endpoints protected with granular permissions.
   - `hostel.module.ts`: NestJS module registering all services and controllers.
4. **Work Package 4: Modernized Web Workspace**:
   - Create `/portal/hostel` 10-tab Command Center.
   - Update `/portal/operations` Hostel tab badge to `'Active'` and link to `/portal/hostel`.
5. **Work Package 5: Verification & Zero Regression**:
   - `scripts/verify-phase4k.cjs` with 350+ checks.
   - Master regression across all test suites (`verify-phase1.cjs` to `verify-phase4k.cjs`).

### DEFERRED
- Physical biometric turnstiles and smart card RFID hardware integration (software access records provided).
- External IoT room environmental sensors / HVAC integration (manual facility flags provided).
- Automated SMS/IVR curfew alert gateways (standard notification queues and in-app alerts provided).
