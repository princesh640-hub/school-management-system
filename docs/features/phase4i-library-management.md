# Phase 4I — School Library Management Subsystem

## 1. Domain Overview & Scope

Phase 4I establishes a complete, configurable, multi-campus, and production-grade School Library Management System.
The system maintains strict architectural separation between bibliographic records (Book Titles) and physical inventory (Book Copies), supports multi-branch campus libraries, manages student and staff library memberships without duplicating identities, enforces server-side borrowing eligibility, automates circulation (issue, return, renewal), provides queue-based title reservations, calculates overdue fines with fine-waiver auditability, tracks lost and damaged copies, provides barcode/QR readiness, and seamlessly links fine payments to the Phase 4G Finance ledger.

---

## 2. Gap Analysis

### EXISTING
- **Multi-Campus Hierarchy**: `Organization` and `Campus` models, academic calendars, and room allocations.
- **Identity Foundation**: `User`, `StudentProfile`, `TeacherProfile`, `EmployeeProfile`, `GuardianProfile`.
- **RBAC & Permissions Guard**: Roles including `LIBRARIAN`, `TEACHER`, `STUDENT`, `SUPER_ADMIN`, and `AppModule.LIBRARY` in `@school/shared-types`.
- **Audit & Security**: Centralized `AuditService` for immutable event logging.
- **Notifications Engine**: In-app and queued notification infrastructure via `NotificationsService`.
- **Finance Subsystem (Phase 4G)**: `FeeInvoice`, `PaymentTransaction`, `FeeAdjustment` for collecting fine payments.
- **Operations Web Preview**: `/portal/operations` placeholder tab for Library.
- **Library API Stub**: Basic `/api/v1/library/books` route returning domain active message.

### MISSING
- **Database Models & Enums**:
  - No `Library` (branch) or `LibraryLocation` (building, floor, room, shelf) models.
  - No `Book` bibliographic record model (ISBN, edition, language, subject, cover, keywords).
  - No `Author`, `Publisher`, `BookCategory`, or `BookAuthor` models.
  - No `BookCopy` physical inventory model (accession number `ACC-YYYY-XXXXX`, barcode, condition, cost, copy status).
  - No `LibraryMember` model referencing existing `User`/`StudentProfile`/`EmployeeProfile`.
  - No `LibraryLoan` circulation model (loan number `LOAN-YYYY-XXXXX`, issue date, due date, return date).
  - No `LibraryRenewal` audit log model.
  - No `LibraryReservation` model with queue positions.
  - No `LibraryFine` model with assessed, waived, and paid states.
  - No `LibraryIncident` / lost & damaged tracking model.
- **Circulation & Eligibility Logic**:
  - No automated member borrowing limit verification or overdue check.
  - No configurable borrowing periods by member type (Student vs Teacher vs Staff).
  - No transactional concurrency guard preventing simultaneous checkout of the same copy.
  - No automatic fine calculation engine (daily rate, grace period, max fine cap).
  - No reservation hold allocation when a returned book has pending reservations.
- **Web UI & User Experience**:
  - No dedicated `/portal/library` multi-tab command center.
  - No quick issue & return circulation desk.
  - No member lookup or library card generator.
  - No printable catalog, issue slips, or library reports.

### TO IMPLEMENT
1. **Work Package 1: Prisma Schema Expansion**:
   - 6 Enums: `BookCopyStatus`, `CopyCondition`, `MemberType`, `LibraryMemberStatus`, `LoanStatus`, `ReservationStatus`, `FineStatus`.
   - 12 Models:
     - `Library` (multi-campus branches)
     - `LibraryLocation` (shelves/locations)
     - `BookCategory`
     - `Publisher`
     - `Author`
     - `Book` (bibliographic record)
     - `BookAuthor` (many-to-many)
     - `BookCopy` (physical copy, accession number `ACC-YYYY-XXXXX`, barcode)
     - `LibraryMember` (membership number `LIB-YYYY-XXXXX`, limits)
     - `LibraryLoan` (loan number `LOAN-YYYY-XXXXX`)
     - `LibraryRenewal` (historical renewal log)
     - `LibraryReservation` (queue hold, reservation number `RES-YYYY-XXXXX`)
     - `LibraryFine` (fine number `FINE-YYYY-XXXXX`, waiver reason, finance link)
2. **Work Package 2: Shared Types (`packages/shared-types`)**:
   - `packages/shared-types/src/interfaces/library.interface.ts`.
   - Export all domain entities, DTOs, eligibility check schemas, circulation statements, and reporting contracts.
3. **Work Package 3: Backend Services & Circulation Engine**:
   - `library-catalog.service.ts`: Books, Authors, Publishers, Categories, manual cataloging, search by ISBN/title/author.
   - `book-copies.service.ts`: Sequential `ACC-YYYY-XXXXX` accession numbers, barcode/QR readiness, shelf allocations, copy status state transitions.
   - `library-members.service.ts`: Sequential `LIB-YYYY-XXXXX`, eligibility verification engine (limits, active check, overdue lock), member statement.
   - `circulation.service.ts`: Transactional issue with concurrency guard, fast return with condition check, renewal workflow with reservation conflict check.
   - `reservations.service.ts`: Title-based queue holds, auto-allocation on return, expiry scanner.
   - `library-fines.service.ts`: Calculation engine (grace days, per-day rate, cap), fine assessment, audited waiver, Phase 4G Finance linkage.
   - `library-reports.service.ts`: Catalog summaries, inventory status, active loans, overdue accounts, lost/damaged ledger.
   - `library.controller.ts`: RESTful endpoints protected with granular RBAC permissions.
4. **Work Package 4: Modernized Web Workspaces**:
   - Upgrade `/portal/library` into a 6-tab command center:
     1. Book Catalog & Bibliographic Index
     2. Circulation Desk (Fast Issue & Return)
     3. Library Members & Eligibility
     4. Reservations Queue
     5. Overdue & Fines Management
     6. Inventory & Library Reports
5. **Work Package 5: Verification & Zero Regression**:
   - `scripts/verify-phase4i.cjs` with comprehensive unit, integration, concurrency, and security checks.
   - Master regression across all 12 test suites (`verify-phase1.cjs` to `verify-phase4i.cjs`).

### DEFERRED
- Physical RFID gate integration & live automated sorting hardware (decoupled data structures provided).
- External Z39.50 / MARC21 live library consortium protocol sync (manual and RESTful bibliographic cataloging provided).
- Physical barcode laser scanner drivers (scanner inputs via standard HID keyboard/input emulation supported).
