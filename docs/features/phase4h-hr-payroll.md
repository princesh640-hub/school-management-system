# Phase 4H — HR, Employees & Payroll Domain Analysis

**Date:** 2026-09-19  
**Domain:** Human Resources, Employee Lifecycle, Contracts, Documents, Salary Structures, Payroll Engine & Payslips  
**Status:** IN PROGRESS

---

## 1. Existing Foundations (EXISTING)

1. **Employee Profile (`EmployeeProfile`)**:
   - Schema model exists linking `User`, `Department`, `Designation`, `EmployeeAttendance`, `LeaveBalance`, and legacy `PayrollRecord`.
   - Fields present: `userId`, `departmentId`, `designationId`, `employeeCode`, `designation`, `employmentType`, `joiningDate`, `salaryBase`, `status`.
   - `EmployeesService` and `EmployeesController` expose `findAll`, `findOne`, `create`.
2. **Organization Structure**:
   - `Department`: Configurable campus-linked organizational departments (`name`, `code`, `campusId`, `status`).
   - `Designation`: Configurable titles (`title`, `code`, `departmentId`, `status`).
3. **Attendance & Leave Foundations (Phase 4D)**:
   - `EmployeeAttendance`: Records daily clock-in/clock-out, attendance status (`PRESENT`, `ABSENT`, `HALF_DAY`, `LATE`), and locked sessions.
   - `LeaveApplication` & `LeaveBalance`: Tracks leave types, quotas, approved/rejected leaves, and leave balance transactions.
4. **Finance / Calculator Foundation (Phase 4G)**:
   - `FinancialCalculatorService` pattern for strict 2-decimal rounding (`roundMoney`) with zero floating-point arithmetic drift.
5. **Cross-Cutting Capabilities**:
   - Audit logging via `AuditService`.
   - Notification dispatch via `NotificationsService`.
   - File storage architecture for document metadata.
   - RBAC Permissions system (`PermissionsGuard`, `RequirePermissions`).
   - Front-end portal at `/portal/hr` with basic employee directory and `/portal/hr/attendance`, `/portal/hr/leave`.

---

## 2. Gaps & Deficiencies (MISSING)

1. **Employee Master & Lifecycle History**:
   - No backend-generated collision-safe Employee IDs (`EMP-YYYY-XXXXX`).
   - No append-only `EmployeeStatusHistory` to audit transitions (`APPLICANT`, `ON_PROBATION`, `ACTIVE`, `CONFIRMED`, `ON_LEAVE`, `SUSPENDED`, `RESIGNED`, `TERMINATED`, `RETIRED`, `ARCHIVED`).
   - Missing rich HR attributes: emergency contacts, national ID, address, qualifications, experience, reporting manager.
2. **Contract Management**:
   - No `EmploymentContract` model to track contracts, start/end dates, renewal alerts, terms, and statuses (`ACTIVE`, `EXPIRING`, `EXPIRED`, `RENEWED`, `TERMINATED`).
3. **HR Document Store**:
   - No `EmployeeDocument` repository for contracts, certificates, disciplinary records, or identity documents.
4. **Configurable Salary Structures & Compensation History**:
   - Only a single flat `salaryBase` Decimal on `EmployeeProfile`.
   - No modular `SalaryStructure` or itemized `SalaryComponent` (Allowances: housing, transport, medical; Deductions: tax, provident fund).
   - No `EmployeeSalaryAssignment` with effective-date versioning.
   - No `SalaryHistory` preserving compensation changes across time.
5. **Comprehensive Payroll Engine & Workflow**:
   - `PayrollRecord` was only a basic static table (`month`, `year`, `basicSalary`, `allowances`, `deductions`, `netSalary`).
   - No `PayrollPeriod` (`DRAFT`, `OPEN`, `PROCESSING`, `PROCESSED`, `APPROVED`, `LOCKED`, `PAID`, `CLOSED`).
   - No `PayrollRun` coordinating batch execution and exception reviews.
   - No itemized `PayrollEarning` and `PayrollDeduction` line items.
   - No `PayrollAdjustment` workflow for audited earnings/deduction corrections.
   - No approval gate and locking mechanism preventing modification of locked payroll.
6. **Loans & Advances Subsystem**:
   - No `EmployeeLoan` or `LoanRepayment` tracking with monthly installment deduction integration.
7. **Official Payslips & Self-Service**:
   - No sequential `Payslip` generation (`PSL-YYYY-XXXXX`) or printable view.
   - No isolated employee self-service view restricting access strictly to own records.
8. **HR & Payroll Reporting**:
   - No payroll summaries, department payroll distribution, loan ledgers, or contract expiry reports.

---

## 3. Scope of Implementation (TO IMPLEMENT)

### WP1: Database Schema Expansion (`schema.prisma`)
- Expand `EmployeeProfile` with preferred name, national ID, emergency contacts, qualifications, experience, reporting manager, and lifecycle status.
- Add 11 new models:
  - `EmployeeStatusHistory`: Append-only transition log.
  - `EmploymentContract`: Contract terms, sequential numbers (`CNT-YYYY-XXXXX`), renewal dates, and statuses.
  - `EmployeeDocument`: Tagged document repository.
  - `SalaryStructure`: Reusable compensation templates.
  - `SalaryComponent`: Component allowances and deductions.
  - `EmployeeSalaryAssignment`: Effective-date compensation binding.
  - `SalaryHistory`: Audited compensation change ledger.
  - `PayrollPeriod`: Multi-status institutional pay cycle.
  - `PayrollRun`: Executed payroll batch with approval and locking gates.
  - `PayrollEmployeeRecord`: Individual employee payout with itemized earnings and deductions.
  - `PayrollEarning`: Detailed earning lines (`BASE`, `ALLOWANCE`, `BONUS`, `OVERTIME`, `OTHER`).
  - `PayrollDeduction`: Detailed deduction lines (`TAX`, `LOAN_REPAYMENT`, `UNPAID_LEAVE`, `ABSENCE`, `LATE`, `OTHER`).
  - `PayrollAdjustment`: Audited payroll adjustments.
  - `EmployeeLoan` & `LoanRepayment`: Advance/loan tracking with payroll installment integration.
  - `Payslip`: Printable payslip model (`PSL-YYYY-XXXXX`).
- Add 8 new Enums: `EmployeeLifecycleStatus`, `ContractStatus`, `SalaryComponentType`, `SalaryCalculationType`, `PayrollPeriodStatus`, `PayrollRunStatus`, `EarningType`, `DeductionType`, `LoanStatus`.

### WP2: Shared Types Package (`packages/shared-types`)
- Create `packages/shared-types/src/interfaces/hr-payroll.interface.ts`.
- Export entities, enums, DTO contracts, report structures, and payslip schemas.

### WP3: Backend Services & Payroll Calculation Engine (`apps/api/src/modules/`)
- `PayrollCalculatorService`: Deterministic money calculations (`roundMoney`), base salary, allowances, bonuses, overtime, loan deduction capping, unpaid leave deductions.
- `EmployeesService`: Lifecycle transitions, backend-generated `EMP-YYYY-XXXXX`, status history, documents, and contracts.
- `SalaryStructuresService`: Salary structures, components, employee assignments with effective-date validation, and compensation history.
- `LoansService`: Loan issuance, approval, balance tracking, and repayment processing.
- `PayrollService`: Period management, batch payroll runs, exception pre-checks, review/approval/locking workflow, and adjustments.
- `PayslipsService`: Sequential `PSL-YYYY-XXXXX` payslip generation, printable views, and employee self-service access control.
- `HrReportsService`: HR directory, contract expiry, department salary summaries, payroll registers.
- Granular permissions: `employees:view`, `employees:create`, `employees:update`, `employees:status`, `hr:contracts:manage`, `payroll:view`, `payroll:process`, `payroll:approve`, `payroll:lock`, `payroll:adjust`, `payslips:view`, `payslips:generate`.

### WP4: Modernized Web Workspace (`apps/web/src/app/(dashboard)/portal/hr/page.tsx` & `/portal/hr/payroll`)
- Multi-tab HR & Payroll command center:
  1. **Employee Master Directory & Lifecycle**: Search, filter, status badges, employee details, and status transition modal.
  2. **Contracts & Documents**: Contract alerts, renewal tracker, and document repository.
  3. **Salary Structures**: Compensation templates, components, and employee assignments.
  4. **Loans & Advances**: Active loans, repayment schedules, and outstanding balances.
  5. **Payroll Processing**: Pay periods, pre-processing exception validation, run workflow (Draft -> Process -> Review -> Approve -> Lock), and payslip generation.
  6. **Payslips & Self-Service**: Printable official payslip viewer.
  7. **HR & Payroll Analytics**: Headcount, department salary distribution, net payroll summary.

### WP5: Verification & Zero-Regression Master Suite
- Create `scripts/verify-phase4h.cjs` with comprehensive assertions.
- Run master regression across all 11 suites (`verify-phase1.cjs` to `verify-phase4h.cjs`).

---

## 4. Architectural Boundaries & Deferred Scope (DEFERRED)

- **Hardware Biometric Devices**: Direct hardware biometric USB/RS485 drivers remain decoupled; system integrates via standard attendance punch records.
- **Direct Banking ACH/SEPA/NACH Automated Wire Dispatch**: Live bank clearing protocols remain decoupled; system produces verified payroll registers and payment statuses.
- **Jurisdiction-Specific Statutory Tax Engines**: Statutory tax is supported via configurable percentage or fixed salary components/rules without hardcoding a specific country's tax code into core logic.
