# Phase 4G — Fees, Billing & Finance Specification & Gap Analysis

**Status:** IN PROGRESS  
**Domain:** Fees, Invoicing, Billing, Payments, Refunds, Student Ledgers, Financial Reports & Cashier Workflows

---

## 1. Domain Overview & Objectives

Transform the foundational fee recording mechanism into an authoritative, secure, auditable, and production-grade school financial management subsystem.

The subsystem manages:
$$\text{Fee Configuration} \longrightarrow \text{Student Assignment / Overrides} \longrightarrow \text{Invoice Generation} \longrightarrow \text{Payments} \longrightarrow \text{Receipts} \longrightarrow \text{Reconciliation / Adjustments / Refunds} \longrightarrow \text{Financial Reporting}$$

---

## 2. Gap Analysis: Existing vs Missing vs To Implement vs Deferred

### EXISTING (Phase 2 & Phase 3 Baseline)
- **Database Models (`apps/api/prisma/schema.prisma`):**
  - `FeeStructure`: Basic model linking `campusId`, `name`, `amount`, `frequency`, `status`.
  - `FeeInvoice`: Single structure invoice with `academicYearId`, `studentId`, `invoiceNumber`, `amount`, `paidAmount`, `dueDate`, `status`.
  - `PaymentTransaction`: Payment record with `feeInvoiceId`, `amount`, `paymentDate`, `paymentMethod`, `referenceNumber`, `receiptNumber`, `remarks`.
- **Database Enums:**
  - `InvoiceStatus`: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`
  - `PaymentMethod`: `CASH`, `BANK_TRANSFER`, `CHEQUE`, `CARD`, `ONLINE_GATEWAY`
- **Backend Endpoints (`FeesController` & `FeesService`):**
  - `POST /fees/structures`: `createStructure`
  - `GET /fees/structures`: `getStructures`
  - `POST /fees/invoices/generate`: `generateInvoices`
  - `GET /fees/invoices`: `getInvoices`
  - `GET /fees/invoices/:id`: `getInvoiceById`
  - `POST /fees/payments`: `recordPayment`
- **Web UI:**
  - `apps/web/src/app/(dashboard)/portal/fees/page.tsx` with fee structures cards, invoices table, and simple payment modal.

---

### MISSING (To Build in Phase 4G)
1. **Fee Categories:** Configurable categories (Tuition, Admission, Examination, Transport, Hostel, Lab, Library, Activities) with code, description, and active status.
2. **Fee Structure Enhancements:** Explicit relations to `Organization`, `FeeCategory`, `AcademicYear`, `Class`, and optional `Section`. Configurable frequencies (`ONE_TIME`, `MONTHLY`, `QUARTERLY`, `TERM`, `ANNUAL`, `CUSTOM`).
3. **Fee Schedules:** Scheduled periodic billing charges with due dates and attached late fee policies.
4. **Student-Specific Fee Assignments & Overrides:** Student custom tuition rates, assigned optional fees (transport, hostel), and tracked authorization for overrides.
5. **Discounts, Concessions & Scholarships:** Configurable percentage and fixed reductions, approval states, and non-negative total enforcement.
6. **Fines & Late Fee Policies:** Configurable fine models (fixed amount, per-day rate, percentage, grace period, maximum cap) applied idempotently.
7. **Itemized Invoices (`InvoiceItem`):** Invoices with line items for base charges, additional services, discounts, concessions, and fines.
8. **Collision-Safe Sequential Numbering:** Organization-scoped sequential invoice numbering (`INV-YYYY-XXXXX`) and receipt numbering (`RCP-YYYY-XXXXX`).
9. **Financial Integrity & Reversals / Refunds:** Immutable payment records with formal reversal/refund workflow (`PaymentRefund`) tracking requestedBy, approvedBy, and reason.
10. **Administrative Adjustments:** Tracked adjustments (`FeeAdjustment`) for rounding, corrections, and fee waivers without modifying completed transaction history.
11. **Installment Plans:** Multi-installment schedules with due dates and balance tracking.
12. **Student Financial Ledger:** Chronological debit/credit statement of all charges, discounts, fines, payments, refunds, and running balances.
13. **Defaulter & Overdue Tracking:** Overdue aging classification (Current, 1-30 days, 31-60 days, 60+ days) and defaulter lists.
14. **Cashier Workflows & Shift Reconciliation:** Cash drawer tracking, opening balance, collections, refunds, and daily reconciliation.
15. **Idempotency & Concurrent Payment Safety:** Idempotency keys (`idempotencyKey`) on payment submissions and transaction isolation protecting against race conditions.
16. **Print-Ready Documents:** Professional receipts, invoices, and student ledger statements with institutional letterhead and signatures.
17. **Online Payment Gateway Abstraction:** Unified payment gateway interface for webhooks and server-side verification readiness.

---

### TO IMPLEMENT (Phase 4G Architecture)

#### 1. Schema Extensions (`schema.prisma`)
- Models:
  - `FeeCategory`: Institutional fee classifications.
  - `FeeSchedule`: Scheduled billing calendar.
  - `StudentFeeAssignment`: Student-specific fee rates and overrides.
  - `FeeDiscount`: Scholarships, concessions, and discounts.
  - `InvoiceItem`: Line items on invoices.
  - `PaymentRefund`: Controlled refunds and reversals.
  - `FeeAdjustment`: Audited financial adjustments.
  - `FeeInstallment`: Scheduled installment breakdowns.
  - `CashierShift`: Cashier drawer sessions and reconciliation.
- Enums:
  - `FeeFrequency`: `ONE_TIME`, `MONTHLY`, `QUARTERLY`, `TERM`, `ANNUAL`, `CUSTOM`
  - `DiscountType`: `PERCENTAGE`, `FIXED_AMOUNT`, `SCHOLARSHIP`, `SIBLING_CONCESSION`, `SPECIAL_WAIVER`
  - `LateFeeType`: `FIXED`, `DAILY_RATE`, `PERCENTAGE`
  - `RefundStatus`: `PENDING`, `APPROVED`, `REJECTED`, `PROCESSED`
  - `AdjustmentType`: `CREDIT`, `DEBIT`, `CORRECTION`, `WAIVER`
  - Extend `InvoiceStatus`: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`, `VOID`

#### 2. Shared Types Package (`packages/shared-types`)
- Create `finance.interface.ts` with all enums, interfaces, DTOs, ledger models, and analytics contracts.
- Export in `packages/shared-types/src/index.ts`.

#### 3. Backend Services & Controllers (`apps/api/src/modules/fees`)
- `financial-calculator.service.ts`: Deterministic calculation engine utilizing `Decimal` arithmetic.
- `fee-structures.service.ts`: Categories, structures, and student fee assignments.
- `invoicing.service.ts`: Sequential invoice generation, bulk billing, line items, discounts, late fines, and status transitions.
- `payments.service.ts`: Idempotent payments, concurrent race protection, receipts, and cashier shifts.
- `refunds-adjustments.service.ts`: Audited refunds, reversals, and financial adjustments.
- `student-ledger.service.ts`: Chronological debit/credit student ledgers with running balance.
- `financial-reports.service.ts`: Collection summaries, defaulters aging, and reconciliation.
- `fees.service.ts`: Preserved Phase 2 methods with delegation to new modular engines.
- `fees.controller.ts`: REST endpoints with Swagger and granular RBAC decorators.
- `fees.module.ts`: Provider registration, `AuditModule`, and `NotificationsModule`.

#### 4. Web Application Workspace (`apps/web/src/app/(dashboard)/portal/fees/page.tsx`)
- 6-Tab Finance Command Center:
  1. **Invoices & Billing**: Filterable invoice table, bulk billing modal, and invoice preview.
  2. **Cashier & Payment Collection**: Fast student search, balance check, idempotent payment modal, and print receipt.
  3. **Fee Structures & Categories**: Category manager and structure configuration.
  4. **Student Financial Ledger**: Chronological statement of accounts with running balance and print trigger.
  5. **Refunds & Adjustments**: Reversal/refund approval requests and adjustment entries.
  6. **Collections & Reports**: Daily/monthly collection KPIs, payment method breakdown, defaulters aging, and reconciliation.

#### 5. Verification Suite (`scripts/verify-phase4g.cjs`)
- Comprehensive checks for schema, types, calculation engine, idempotency, concurrency safety, refunds, ledgers, controller RBAC, and web UI.

---

### DEFERRED
- Physical hardware point-of-sale (POS) terminal serial device drivers.
- Live merchant bank API credentials (pluggable gateway adapter interface is provided).
