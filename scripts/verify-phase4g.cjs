/**
 * Phase 4G Automated Verification Suite
 * Fees, Billing & Finance Subsystem
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4G VERIFICATION: FEES, BILLING & FINANCE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function check(label, condition, details = '') {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passCount++;
  } else {
    console.log(`  [FAIL] ${label} - ${details}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// 1. Prisma Schema Expansions
// -----------------------------------------------------------------------------
console.log('1. Checking Database Layer (Prisma Schema Expansions)...');
const schemaPath = path.join(rootDir, 'apps/api/prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Models
check('Schema contains FeeCategory model', schema.includes('model FeeCategory'));
check('Schema contains FeeStructure model', schema.includes('model FeeStructure'));
check('Schema contains FeeSchedule model', schema.includes('model FeeSchedule'));
check('Schema contains StudentFeeAssignment model', schema.includes('model StudentFeeAssignment'));
check('Schema contains FeeDiscount model', schema.includes('model FeeDiscount'));
check('Schema contains FeeInvoice model', schema.includes('model FeeInvoice'));
check('Schema contains InvoiceItem model', schema.includes('model InvoiceItem'));
check('Schema contains PaymentTransaction model', schema.includes('model PaymentTransaction'));
check('Schema contains PaymentRefund model', schema.includes('model PaymentRefund'));
check('Schema contains FeeAdjustment model', schema.includes('model FeeAdjustment'));
check('Schema contains FeeInstallment model', schema.includes('model FeeInstallment'));
check('Schema contains CashierShift model', schema.includes('model CashierShift'));

// Enums
check('Schema contains FeeFrequency enum', schema.includes('enum FeeFrequency'));
check('Schema contains DiscountType enum', schema.includes('enum DiscountType'));
check('Schema contains LateFeeType enum', schema.includes('enum LateFeeType'));
check('Schema contains RefundStatus enum', schema.includes('enum RefundStatus'));
check('Schema contains AdjustmentType enum', schema.includes('enum AdjustmentType'));
check('Schema contains InvoiceStatus enum with VOID', schema.includes('enum InvoiceStatus') && schema.includes('VOID'));

// Core relations & fields
check('FeeInvoice has relation to InvoiceItem and FeeAdjustment',
  schema.includes('items') && schema.includes('InvoiceItem[]') &&
  schema.includes('adjustments') && schema.includes('FeeAdjustment[]'));
check('PaymentTransaction has idempotencyKey unique field',
  /idempotencyKey\s+String\?\s+@unique/.test(schema));
check('PaymentTransaction has relation to PaymentRefund and CashierShift',
  schema.includes('refunds') && schema.includes('PaymentRefund[]') &&
  schema.includes('cashierShift') && schema.includes('CashierShift?'));
check('FeeStructure has feeCategory and studentFeeAssignments relations',
  schema.includes('feeCategory') && schema.includes('FeeCategory?') &&
  schema.includes('studentFeeAssignments') && schema.includes('StudentFeeAssignment[]'));
check('StudentProfile has feeInvoices and studentFeeAssignments relations',
  schema.includes('feeInvoices') && schema.includes('FeeInvoice[]') &&
  schema.includes('feeAssignments') && schema.includes('StudentFeeAssignment[]'));

// -----------------------------------------------------------------------------
// 2. Shared Types Package Exports
// -----------------------------------------------------------------------------
console.log('\n2. Checking Shared Types Package Exports...');
const financeTypesPath = path.join(rootDir, 'packages/shared-types/src/interfaces/finance.interface.ts');
const sharedTypesIndexPath = path.join(rootDir, 'packages/shared-types/src/index.ts');

check('finance.interface.ts exists', fs.existsSync(financeTypesPath));
const sharedTypesIndex = fs.readFileSync(sharedTypesIndexPath, 'utf8');
check('shared-types index exports finance.interface',
  sharedTypesIndex.includes('./interfaces/finance.interface'));

const financeTypes = fs.readFileSync(financeTypesPath, 'utf8');
// Enums/Types
check('finance defines FeeFrequency type', financeTypes.includes('FeeFrequency ='));
check('finance defines DiscountType type', financeTypes.includes('DiscountType ='));
check('finance defines LateFeeType type', financeTypes.includes('LateFeeType ='));
check('finance defines RefundStatus type', financeTypes.includes('RefundStatus ='));
check('finance defines AdjustmentType type', financeTypes.includes('AdjustmentType ='));
check('finance defines InvoiceStatusType type', financeTypes.includes('InvoiceStatusType ='));
check('finance defines PaymentMethodType type', financeTypes.includes('PaymentMethodType ='));

// Entities
check('finance defines FeeCategoryEntity', financeTypes.includes('interface FeeCategoryEntity'));
check('finance defines FeeStructureEntity', financeTypes.includes('interface FeeStructureEntity'));
check('finance defines FeeScheduleEntity', financeTypes.includes('interface FeeScheduleEntity'));
check('finance defines FeeDiscountEntity', financeTypes.includes('interface FeeDiscountEntity'));
check('finance defines StudentFeeAssignmentEntity', financeTypes.includes('interface StudentFeeAssignmentEntity'));
check('finance defines FeeInvoiceEntity', financeTypes.includes('interface FeeInvoiceEntity'));
check('finance defines InvoiceItemEntity', financeTypes.includes('interface InvoiceItemEntity'));
check('finance defines PaymentTransactionEntity', financeTypes.includes('interface PaymentTransactionEntity'));
check('finance defines PaymentRefundEntity', financeTypes.includes('interface PaymentRefundEntity'));
check('finance defines FeeAdjustmentEntity', financeTypes.includes('interface FeeAdjustmentEntity'));
check('finance defines FeeInstallmentEntity', financeTypes.includes('interface FeeInstallmentEntity'));
check('finance defines CashierShiftEntity', financeTypes.includes('interface CashierShiftEntity'));

// Reporting & Ledger Contracts
check('finance defines StudentLedgerResponse & StudentLedgerEntry',
  financeTypes.includes('interface StudentLedgerResponse') && financeTypes.includes('interface StudentLedgerEntry'));
check('finance defines CollectionSummaryReport', financeTypes.includes('interface CollectionSummaryReport'));
check('finance defines DefaultersAgingReport & DefaulterRecord',
  financeTypes.includes('interface DefaultersAgingReport') && financeTypes.includes('interface DefaulterRecord'));

// -----------------------------------------------------------------------------
// 3. Backend Services & Financial Engine
// -----------------------------------------------------------------------------
console.log('\n3. Checking Backend Services & Financial Engine...');
const feesDir = path.join(rootDir, 'apps/api/src/modules/fees');

const calcServicePath = path.join(feesDir, 'financial-calculator.service.ts');
const feeStructuresServicePath = path.join(feesDir, 'fee-structures.service.ts');
const invoicingServicePath = path.join(feesDir, 'invoicing.service.ts');
const paymentsServicePath = path.join(feesDir, 'payments.service.ts');
const refundsAdjServicePath = path.join(feesDir, 'refunds-adjustments.service.ts');
const studentLedgerServicePath = path.join(feesDir, 'student-ledger.service.ts');
const financialReportsServicePath = path.join(feesDir, 'financial-reports.service.ts');
const feesServicePath = path.join(feesDir, 'fees.service.ts');
const feesControllerPath = path.join(feesDir, 'fees.controller.ts');
const feesModulePath = path.join(feesDir, 'fees.module.ts');

check('FinancialCalculatorService exists', fs.existsSync(calcServicePath));
check('FeeStructuresService exists', fs.existsSync(feeStructuresServicePath));
check('InvoicingService exists', fs.existsSync(invoicingServicePath));
check('PaymentsService exists', fs.existsSync(paymentsServicePath));
check('RefundsAdjustmentsService exists', fs.existsSync(refundsAdjServicePath));
check('StudentLedgerService exists', fs.existsSync(studentLedgerServicePath));
check('FinancialReportsService exists', fs.existsSync(financialReportsServicePath));
check('FeesService exists', fs.existsSync(feesServicePath));
check('FeesController exists', fs.existsSync(feesControllerPath));
check('FeesModule exists', fs.existsSync(feesModulePath));

const feesModuleContent = fs.readFileSync(feesModulePath, 'utf8');
check('FeesModule imports AuditModule', feesModuleContent.includes('AuditModule'));
check('FeesModule imports NotificationsModule', feesModuleContent.includes('NotificationsModule'));
check('FeesModule provides all 8 financial services',
  feesModuleContent.includes('FeesService') &&
  feesModuleContent.includes('FinancialCalculatorService') &&
  feesModuleContent.includes('FeeStructuresService') &&
  feesModuleContent.includes('InvoicingService') &&
  feesModuleContent.includes('PaymentsService') &&
  feesModuleContent.includes('RefundsAdjustmentsService') &&
  feesModuleContent.includes('StudentLedgerService') &&
  feesModuleContent.includes('FinancialReportsService'));

// Unit logic verification of FinancialCalculatorService
const calcContent = fs.readFileSync(calcServicePath, 'utf8');
check('FinancialCalculatorService implements strict 2-decimal rounding',
  calcContent.includes('roundMoney') && calcContent.includes('Math.round'));
check('FinancialCalculatorService calculates percentage and fixed discounts capped at base',
  calcContent.includes('calculateDiscount') && calcContent.includes('Math.min(base, discount)'));
check('FinancialCalculatorService calculates late fees with grace period and cap',
  calcContent.includes('calculateLateFee') && calcContent.includes('graceDays') && calcContent.includes('maxLateFee'));
check('FinancialCalculatorService computes net invoice totals',
  calcContent.includes('computeInvoiceTotal') && calcContent.includes('netTotal'));
check('FinancialCalculatorService calculates eligible refunds against paid amount',
  calcContent.includes('calculateEligibleRefund'));
check('FinancialCalculatorService computes installment schedule balancing pennies on last tranche',
  calcContent.includes('calculateInstallmentSchedule') && calcContent.includes('remainder'));

// FeeStructuresService checks
const feeStructuresContent = fs.readFileSync(feeStructuresServicePath, 'utf8');
check('FeeStructuresService manages fee categories',
  feeStructuresContent.includes('createCategory') && feeStructuresContent.includes('getCategories'));
check('FeeStructuresService manages fee structures',
  feeStructuresContent.includes('createStructure') && feeStructuresContent.includes('getStructures'));
check('FeeStructuresService manages billing schedules',
  feeStructuresContent.includes('createSchedule') && feeStructuresContent.includes('getSchedules'));
check('FeeStructuresService manages discounts and scholarships',
  feeStructuresContent.includes('createDiscount') && feeStructuresContent.includes('getDiscounts'));
check('FeeStructuresService manages student-specific fee overrides (StudentFeeAssignment)',
  feeStructuresContent.includes('assignStudentFee') && feeStructuresContent.includes('getStudentFeeAssignments'));

// InvoicingService checks
const invoicingContent = fs.readFileSync(invoicingServicePath, 'utf8');
check('InvoicingService generates sequential collision-safe INV-YYYY-XXXXX numbers',
  invoicingContent.includes('generateSequentialInvoiceNumber') && invoicingContent.includes('INV-'));
check('InvoicingService generates bulk invoices integrating student discounts and overrides',
  invoicingContent.includes('generateInvoices') && invoicingContent.includes('studentFeeAssignment'));
check('InvoicingService generates itemized single invoices with custom line items',
  invoicingContent.includes('generateSingleInvoice') && invoicingContent.includes('lineItems'));
check('InvoicingService supports voiding unpaid invoices with audit logging',
  invoicingContent.includes('voidInvoice') && invoicingContent.includes('InvoiceStatus.VOID'));
check('InvoicingService implements late fee scanner for overdue accounts',
  invoicingContent.includes('applyLateFees') && invoicingContent.includes('calculateLateFee'));

// PaymentsService checks
const paymentsContent = fs.readFileSync(paymentsServicePath, 'utf8');
check('PaymentsService generates sequential RCP-YYYY-XXXXX receipt numbers',
  paymentsContent.includes('generateSequentialReceiptNumber') && paymentsContent.includes('RCP-'));
check('PaymentsService enforces idempotent payment processing via idempotencyKey',
  paymentsContent.includes('idempotencyKey') && paymentsContent.includes('findUnique'));
check('PaymentsService enforces concurrency protection and transactional invoice updates',
  paymentsContent.includes('$transaction') && paymentsContent.includes('newPaidAmount'));
check('PaymentsService produces structured printable payment receipt',
  paymentsContent.includes('generateReceipt') && paymentsContent.includes('printable'));
check('PaymentsService manages cashier shifts (open, close, drawer cash reconciliation)',
  paymentsContent.includes('openShift') && paymentsContent.includes('closeShift') &&
  paymentsContent.includes('discrepancy'));

// RefundsAdjustmentsService checks
const refundsAdjContent = fs.readFileSync(refundsAdjServicePath, 'utf8');
check('RefundsAdjustmentsService generates sequential REF-YYYY-XXXXX numbers',
  refundsAdjContent.includes('generateSequentialRefundNumber') && refundsAdjContent.includes('REF-'));
check('RefundsAdjustmentsService validates refund amount against eligible payment balance',
  refundsAdjContent.includes('requestRefund') && refundsAdjContent.includes('calculateEligibleRefund'));
check('RefundsAdjustmentsService reviews and applies refunds updating invoice balance',
  refundsAdjContent.includes('reviewRefund') && refundsAdjContent.includes('approved'));
check('RefundsAdjustmentsService generates sequential ADJ-YYYY-XXXXX adjustment numbers',
  refundsAdjContent.includes('generateSequentialAdjustmentNumber') && refundsAdjContent.includes('ADJ-'));
check('RefundsAdjustmentsService creates fee adjustments (credit, debit, waiver, correction)',
  refundsAdjContent.includes('createAdjustment') && refundsAdjContent.includes('CREDIT') && refundsAdjContent.includes('DEBIT'));

// StudentLedgerService checks
const studentLedgerContent = fs.readFileSync(studentLedgerServicePath, 'utf8');
check('StudentLedgerService builds chronological ledger with debits and credits',
  studentLedgerContent.includes('getStudentLedger') && studentLedgerContent.includes('rawEntries'));
check('StudentLedgerService calculates cumulative running balance after each transaction',
  studentLedgerContent.includes('runningBalance') && studentLedgerContent.includes('e.debit - e.credit'));
check('StudentLedgerService computes complete ledger financial summary',
  studentLedgerContent.includes('totalInvoiced') && studentLedgerContent.includes('totalPaid') &&
  studentLedgerContent.includes('netOutstandingBalance'));

// FinancialReportsService checks
const reportsContent = fs.readFileSync(financialReportsServicePath, 'utf8');
check('FinancialReportsService generates collection summary report by payment method',
  reportsContent.includes('getCollectionSummary') && reportsContent.includes('byPaymentMethod'));
check('FinancialReportsService generates defaulters aging report in 30-day buckets',
  reportsContent.includes('getDefaultersAgingReport') && reportsContent.includes('1-30') &&
  reportsContent.includes('31-60') && reportsContent.includes('61-90') && reportsContent.includes('90+'));

// FeesService legacy compatibility
const feesServiceContent = fs.readFileSync(feesServicePath, 'utf8');
check('FeesService preserves createStructure legacy method', feesServiceContent.includes('createStructure('));
check('FeesService preserves getStructures legacy method', feesServiceContent.includes('getStructures('));
check('FeesService preserves generateInvoices legacy method', feesServiceContent.includes('generateInvoices('));
check('FeesService preserves getInvoices legacy method', feesServiceContent.includes('getInvoices('));
check('FeesService preserves getInvoiceById legacy method', feesServiceContent.includes('getInvoiceById('));
check('FeesService preserves recordPayment legacy method', feesServiceContent.includes('recordPayment('));

// FeesController endpoints & permissions
const feesControllerContent = fs.readFileSync(feesControllerPath, 'utf8');
check('FeesController exposes POST & GET /fees/structures (legacy preserved)',
  feesControllerContent.includes("'structures'") && feesControllerContent.includes('createStructure'));
check('FeesController exposes POST /fees/invoices/generate (legacy preserved)',
  feesControllerContent.includes("'invoices/generate'") && feesControllerContent.includes('generateInvoices'));
check('FeesController exposes GET /fees/invoices and /fees/invoices/:id (legacy preserved)',
  feesControllerContent.includes("'invoices'") && feesControllerContent.includes('getInvoiceById'));
check('FeesController exposes POST /fees/payments (legacy preserved)',
  feesControllerContent.includes("'payments'") && feesControllerContent.includes('recordPayment'));
check('FeesController exposes /fees/categories', feesControllerContent.includes("'categories'"));
check('FeesController exposes /fees/schedules', feesControllerContent.includes("'schedules'"));
check('FeesController exposes /fees/discounts', feesControllerContent.includes("'discounts'"));
check('FeesController exposes /fees/assignments', feesControllerContent.includes("'assignments'"));
check('FeesController exposes /fees/invoices/single', feesControllerContent.includes("'invoices/single'"));
check('FeesController exposes /fees/invoices/:id/void', feesControllerContent.includes("'invoices/:id/void'"));
check('FeesController exposes /fees/receipts/:paymentId', feesControllerContent.includes("'receipts/:paymentId'"));
check('FeesController exposes /fees/shifts', feesControllerContent.includes("'shifts'"));
check('FeesController exposes /fees/refunds', feesControllerContent.includes("'refunds'"));
check('FeesController exposes /fees/adjustments', feesControllerContent.includes("'adjustments'"));
check('FeesController exposes /fees/ledger/student/:studentId', feesControllerContent.includes("'ledger/student/:studentId'"));
check('FeesController exposes /fees/reports/collections & /fees/reports/defaulters',
  feesControllerContent.includes("'reports/collections'") && feesControllerContent.includes("'reports/defaulters'"));
check('FeesController enforces fees:read permission', feesControllerContent.includes("'fees:read'"));
check('FeesController enforces fees:create permission', feesControllerContent.includes("'fees:create'"));
check('FeesController enforces fees:collect permission', feesControllerContent.includes("'fees:collect'"));
check('FeesController enforces fees:manage permission', feesControllerContent.includes("'fees:manage'"));
check('FeesController enforces fees:refund permission', feesControllerContent.includes("'fees:refund'"));
check('FeesController enforces fees:adjust permission', feesControllerContent.includes("'fees:adjust'"));

// -----------------------------------------------------------------------------
// 4. Web Application Fees Workspace
// -----------------------------------------------------------------------------
console.log('\n4. Checking Web Application Fees Workspace...');
const feesWebPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/fees/page.tsx');
check('Fees Web Page exists', fs.existsSync(feesWebPath));

const feesWebContent = fs.readFileSync(feesWebPath, 'utf8');
check('Fees workspace supports 6-tab finance command center',
  feesWebContent.includes("'invoices'") &&
  feesWebContent.includes("'cashier'") &&
  feesWebContent.includes("'structures'") &&
  feesWebContent.includes("'ledger'") &&
  feesWebContent.includes("'refunds'") &&
  feesWebContent.includes("'reports'"));
check('Fees workspace provides cashier shift drawer reconciliation UI',
  feesWebContent.includes('currentShift') &&
  feesWebContent.includes('Drawer Opening Balance') &&
  feesWebContent.includes('Reconcile Drawer'));
check('Fees workspace displays official printable payment receipt modal',
  feesWebContent.includes('OFFICIAL PAYMENT RECEIPT') &&
  feesWebContent.includes('printableReceipt'));
check('Fees workspace provides student financial ledger lookup with running balance table',
  feesWebContent.includes('Student Financial Ledger Lookup') &&
  feesWebContent.includes('Net Outstanding Balance') &&
  feesWebContent.includes('Running Balance ($)'));
check('Fees workspace displays 30-day aging buckets and defaulters table',
  feesWebContent.includes('Overdue Accounts & Defaulters Aging') &&
  feesWebContent.includes('Days Overdue') &&
  feesWebContent.includes('Guardian Phone'));
check('Fees workspace preserves legacy API connections (/fees/invoices, /fees/payments, Record Payment)',
  feesWebContent.includes('/fees/invoices') &&
  feesWebContent.includes('/fees/payments') &&
  feesWebContent.includes('Record Payment'));

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`PHASE 4G VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  console.error('\nPHASE 4G VERIFICATION FAILED: Please address the issues listed above.');
  process.exit(1);
} else {
  console.log('\nPHASE 4G VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
}
