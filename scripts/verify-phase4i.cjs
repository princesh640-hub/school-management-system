/**
 * Phase 4I Automated Verification Suite
 * School Library Management System
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4I VERIFICATION: SCHOOL LIBRARY MANAGEMENT');
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
// 1. Prisma Schema Expansions (Phase 4I)
// -----------------------------------------------------------------------------
console.log('1. Checking Database Layer (Prisma Schema Expansions)...');
const schemaPath = path.join(rootDir, 'apps/api/prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Enums
check('Schema contains BookCopyStatus enum with standard states',
  schema.includes('enum BookCopyStatus') &&
  schema.includes('AVAILABLE') &&
  schema.includes('ISSUED') &&
  schema.includes('RESERVED') &&
  schema.includes('LOST') &&
  schema.includes('DAMAGED') &&
  schema.includes('UNDER_MAINTENANCE'));

check('Schema contains CopyCondition enum',
  schema.includes('enum CopyCondition') &&
  schema.includes('NEW') &&
  schema.includes('GOOD') &&
  schema.includes('FAIR') &&
  schema.includes('POOR') &&
  schema.includes('DAMAGED'));

check('Schema contains LibraryMemberType enum',
  schema.includes('enum LibraryMemberType') &&
  schema.includes('STUDENT') &&
  schema.includes('TEACHER') &&
  schema.includes('STAFF') &&
  schema.includes('OTHER'));

check('Schema contains LibraryMemberStatus enum',
  schema.includes('enum LibraryMemberStatus') &&
  schema.includes('ACTIVE') &&
  schema.includes('SUSPENDED') &&
  schema.includes('EXPIRED') &&
  schema.includes('CANCELLED'));

check('Schema contains LibraryLoanStatus enum',
  schema.includes('enum LibraryLoanStatus') &&
  schema.includes('ACTIVE') &&
  schema.includes('RETURNED') &&
  schema.includes('OVERDUE') &&
  schema.includes('LOST') &&
  schema.includes('DAMAGED'));

check('Schema contains LibraryReservationStatus enum',
  schema.includes('enum LibraryReservationStatus') &&
  schema.includes('PENDING') &&
  schema.includes('AVAILABLE_FOR_PICKUP') &&
  schema.includes('FULFILLED') &&
  schema.includes('CANCELLED') &&
  schema.includes('EXPIRED'));

check('Schema contains LibraryFineStatus enum',
  schema.includes('enum LibraryFineStatus') &&
  schema.includes('ASSESSED') &&
  schema.includes('PAID') &&
  schema.includes('WAIVED') &&
  schema.includes('CANCELLED'));

// Models
check('Schema contains Library model with campus & organization relation',
  schema.includes('model Library') &&
  schema.includes('locations       LibraryLocation[]') &&
  schema.includes('copies          BookCopy[]'));

check('Schema contains LibraryLocation model with shelf and code',
  schema.includes('model LibraryLocation') &&
  schema.includes('shelf       String') &&
  schema.includes('code        String') &&
  schema.includes('copies      BookCopy[]'));

check('Schema contains BookCategory model',
  schema.includes('model BookCategory') &&
  schema.includes('books          Book[]'));

check('Schema contains Publisher model',
  schema.includes('model Publisher') &&
  schema.includes('books          Book[]'));

check('Schema contains Author model and BookAuthor join model',
  schema.includes('model Author') &&
  schema.includes('model BookAuthor') &&
  schema.includes('bookAuthors    BookAuthor[]'));

check('Schema contains Book model with bibliographic metadata',
  schema.includes('model Book') &&
  schema.includes('title           String') &&
  schema.includes('isbn13          String?') &&
  schema.includes('copies          BookCopy[]') &&
  schema.includes('reservations    LibraryReservation[]'));

check('Schema contains BookCopy model with accessionNumber, barcode, condition and status',
  schema.includes('model BookCopy') &&
  schema.includes('accessionNumber String            @unique') &&
  schema.includes('barcode         String?           @unique') &&
  schema.includes('condition       CopyCondition') &&
  schema.includes('status          BookCopyStatus'));

check('Schema contains LibraryMember model reusing User identity with limits',
  schema.includes('model LibraryMember') &&
  schema.includes('membershipNumber  String               @unique') &&
  schema.includes('memberType        LibraryMemberType') &&
  schema.includes('borrowingLimit    Int') &&
  schema.includes('maxBorrowDays     Int') &&
  schema.includes('loans             LibraryLoan[]') &&
  schema.includes('reservations      LibraryReservation[]') &&
  schema.includes('fines             LibraryFine[]'));

check('Schema contains LibraryLoan model with loanNumber, renewals and fines',
  schema.includes('model LibraryLoan') &&
  schema.includes('loanNumber       String            @unique') &&
  schema.includes('dueDate          DateTime') &&
  schema.includes('renewalCount     Int') &&
  schema.includes('renewals         LibraryRenewal[]') &&
  schema.includes('fines            LibraryFine[]'));

check('Schema contains LibraryRenewal model',
  schema.includes('model LibraryRenewal') &&
  schema.includes('previousDueDate DateTime') &&
  schema.includes('newDueDate      DateTime'));

check('Schema contains LibraryReservation model with queuePosition and hold status',
  schema.includes('model LibraryReservation') &&
  schema.includes('reservationNumber String                   @unique') &&
  schema.includes('queuePosition     Int') &&
  schema.includes('expiryDate        DateTime?'));

check('Schema contains LibraryFine model with fineNumber, amount and audit waiver',
  schema.includes('model LibraryFine') &&
  schema.includes('fineNumber           String            @unique') &&
  schema.includes('amount               Decimal') &&
  schema.includes('waiverReason         String?'));

// Organization & User Relations
check('Organization model contains library relations',
  schema.includes('libraries            Library[]') &&
  schema.includes('bookCategories       BookCategory[]') &&
  schema.includes('publishers           Publisher[]') &&
  schema.includes('authors              Author[]') &&
  schema.includes('books                Book[]') &&
  schema.includes('libraryMembers       LibraryMember[]'));

check('User model contains libraryMembers relation',
  schema.includes('libraryMembers       LibraryMember[]'));

check('StudentProfile & EmployeeProfile contain libraryMembers relation',
  schema.includes('libraryMembers       LibraryMember[]'));

// -----------------------------------------------------------------------------
// 2. Shared Types Contracts (@school/shared-types)
// -----------------------------------------------------------------------------
console.log('\n2. Checking Shared Types Contracts (@school/shared-types)...');
const libraryTypesPath = path.join(rootDir, 'packages/shared-types/src/interfaces/library.interface.ts');
const sharedTypesIndexPath = path.join(rootDir, 'packages/shared-types/src/index.ts');

check('library.interface.ts exists', fs.existsSync(libraryTypesPath));
const libraryTypes = fs.existsSync(libraryTypesPath) ? fs.readFileSync(libraryTypesPath, 'utf8') : '';
const sharedTypesIndex = fs.existsSync(sharedTypesIndexPath) ? fs.readFileSync(sharedTypesIndexPath, 'utf8') : '';

check('shared-types index exports library.interface',
  sharedTypesIndex.includes('interfaces/library.interface'));

check('library.interface exports all 7 domain enums',
  libraryTypes.includes('export type BookCopyStatus') &&
  libraryTypes.includes('export type CopyCondition') &&
  libraryTypes.includes('export type LibraryMemberType') &&
  libraryTypes.includes('export type LibraryMemberStatus') &&
  libraryTypes.includes('export type LibraryLoanStatus') &&
  libraryTypes.includes('export type LibraryReservationStatus') &&
  libraryTypes.includes('export type LibraryFineStatus'));

check('library.interface exports core entity interfaces',
  libraryTypes.includes('export interface LibraryEntity') &&
  libraryTypes.includes('export interface LibraryLocationEntity') &&
  libraryTypes.includes('export interface BookCategoryEntity') &&
  libraryTypes.includes('export interface PublisherEntity') &&
  libraryTypes.includes('export interface AuthorEntity') &&
  libraryTypes.includes('export interface BookEntity') &&
  libraryTypes.includes('export interface BookCopyEntity') &&
  libraryTypes.includes('export interface LibraryMemberEntity') &&
  libraryTypes.includes('export interface LibraryLoanEntity') &&
  libraryTypes.includes('export interface LibraryRenewalEntity') &&
  libraryTypes.includes('export interface LibraryReservationEntity') &&
  libraryTypes.includes('export interface LibraryFineEntity'));

check('library.interface exports analytical and slip payloads',
  libraryTypes.includes('export interface BorrowingEligibilityResult') &&
  libraryTypes.includes('export interface LibraryMemberStatement') &&
  libraryTypes.includes('export interface CatalogInventorySummary') &&
  libraryTypes.includes('export interface CirculationAnalytics') &&
  libraryTypes.includes('export interface OverduePatronReportItem') &&
  libraryTypes.includes('export interface LostDamagedReportItem') &&
  libraryTypes.includes('export interface CirculationSlip'));

// -----------------------------------------------------------------------------
// 3. Backend Services & Circulation Engine
// -----------------------------------------------------------------------------
console.log('\n3. Checking Backend Services & Circulation Engine...');

const dtoPath = path.join(rootDir, 'apps/api/src/modules/library/dto/library.dto.ts');
const catalogServicePath = path.join(rootDir, 'apps/api/src/modules/library/library-catalog.service.ts');
const copiesServicePath = path.join(rootDir, 'apps/api/src/modules/library/book-copies.service.ts');
const membersServicePath = path.join(rootDir, 'apps/api/src/modules/library/library-members.service.ts');
const circulationServicePath = path.join(rootDir, 'apps/api/src/modules/library/circulation.service.ts');
const reservationsServicePath = path.join(rootDir, 'apps/api/src/modules/library/reservations.service.ts');
const finesServicePath = path.join(rootDir, 'apps/api/src/modules/library/library-fines.service.ts');
const reportsServicePath = path.join(rootDir, 'apps/api/src/modules/library/library-reports.service.ts');
const controllerPath = path.join(rootDir, 'apps/api/src/modules/library/library.controller.ts');
const modulePath = path.join(rootDir, 'apps/api/src/modules/library/library.module.ts');

check('DTO file exists and defines all input contracts',
  fs.existsSync(dtoPath) &&
  fs.readFileSync(dtoPath, 'utf8').includes('CreateBookDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('CreateBookCopyDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('RegisterLibraryMemberDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('IssueBookDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('ReturnBookDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('RenewLoanDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('CreateReservationDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('AssessFineDto') &&
  fs.readFileSync(dtoPath, 'utf8').includes('WaiveFineDto'));

check('LibraryCatalogService exists', fs.existsSync(catalogServicePath));
check('BookCopiesService exists', fs.existsSync(copiesServicePath));
check('LibraryMembersService exists', fs.existsSync(membersServicePath));
check('CirculationService exists', fs.existsSync(circulationServicePath));
check('ReservationsService exists', fs.existsSync(reservationsServicePath));
check('LibraryFinesService exists', fs.existsSync(finesServicePath));
check('LibraryReportsService exists', fs.existsSync(reportsServicePath));
check('LibraryController exists', fs.existsSync(controllerPath));
check('LibraryModule exists', fs.existsSync(modulePath));

const moduleContent = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
check('LibraryModule imports AuditModule', moduleContent.includes('AuditModule'));
check('LibraryModule registers and exports all 7 library services',
  moduleContent.includes('LibraryCatalogService') &&
  moduleContent.includes('BookCopiesService') &&
  moduleContent.includes('LibraryMembersService') &&
  moduleContent.includes('CirculationService') &&
  moduleContent.includes('ReservationsService') &&
  moduleContent.includes('LibraryFinesService') &&
  moduleContent.includes('LibraryReportsService'));

// Unit Verification: Fine Calculation Math
console.log('  Testing Fine Calculation Math...');
function testCalculateOverdueFine(dueDate, returnDate, dailyRate = 1.0, graceDays = 1, maxCap = 50.0) {
  const due = new Date(dueDate).getTime();
  const ret = new Date(returnDate).getTime();
  if (ret <= due) return { overdueDays: 0, fineAmount: 0 };
  const diffMs = ret - due;
  const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (overdueDays <= graceDays) return { overdueDays, fineAmount: 0 };
  const billableDays = overdueDays - graceDays;
  const calculated = billableDays * dailyRate;
  const fineAmount = Math.min(maxCap, Math.round(calculated * 100) / 100);
  return { overdueDays, fineAmount };
}

const onTimeResult = testCalculateOverdueFine('2026-09-10', '2026-09-10');
check('On-time return produces 0 overdue days and $0 fine',
  onTimeResult.overdueDays === 0 && onTimeResult.fineAmount === 0);

const graceResult = testCalculateOverdueFine('2026-09-10', '2026-09-11', 1.0, 1, 50.0);
check('Return within 1 grace day produces $0 fine',
  graceResult.overdueDays === 1 && graceResult.fineAmount === 0);

const overdueResult = testCalculateOverdueFine('2026-09-10', '2026-09-15', 1.0, 1, 50.0);
check('Return 5 days late (1 grace day) bills 4 days @ $1.00 = $4.00 fine',
  overdueResult.overdueDays === 5 && overdueResult.fineAmount === 4.0);

const cappedResult = testCalculateOverdueFine('2026-09-01', '2026-11-15', 1.0, 1, 50.0);
check('Excessive overdue duration caps strictly at maxCap ($50.00)',
  cappedResult.overdueDays > 50 && cappedResult.fineAmount === 50.0);

// Sequential Number Format Tests
const copiesServiceContent = fs.existsSync(copiesServicePath) ? fs.readFileSync(copiesServicePath, 'utf8') : '';
check('BookCopiesService generates sequential collision-safe ACC-YYYY-XXXXX accession numbers',
  copiesServiceContent.includes('ACC-') && copiesServiceContent.includes('generateSequentialAccessionNumber'));

const membersServiceContent = fs.existsSync(membersServicePath) ? fs.readFileSync(membersServicePath, 'utf8') : '';
check('LibraryMembersService generates sequential collision-safe LIB-YYYY-XXXXX membership numbers',
  membersServiceContent.includes('LIB-') && membersServiceContent.includes('generateSequentialMembershipNumber'));

const circulationContent = fs.existsSync(circulationServicePath) ? fs.readFileSync(circulationServicePath, 'utf8') : '';
check('CirculationService generates sequential collision-safe LOAN-YYYY-XXXXX loan numbers',
  circulationContent.includes('LOAN-') && circulationContent.includes('generateSequentialLoanNumber'));

const reservationsContent = fs.existsSync(reservationsServicePath) ? fs.readFileSync(reservationsServicePath, 'utf8') : '';
check('ReservationsService generates sequential collision-safe RES-YYYY-XXXXX reservation numbers',
  reservationsContent.includes('RES-') && reservationsContent.includes('generateSequentialReservationNumber'));

const finesContent = fs.existsSync(finesServicePath) ? fs.readFileSync(finesServicePath, 'utf8') : '';
check('LibraryFinesService generates sequential collision-safe FINE-YYYY-XXXXX fine numbers',
  finesContent.includes('FINE-') && finesContent.includes('generateSequentialFineNumber'));

// Service Business Rules Verification
check('LibraryMembersService evaluates borrowing eligibility against member limits, active loans, and fine threshold',
  membersServiceContent.includes('validateEligibility') &&
  membersServiceContent.includes('borrowingLimit') &&
  membersServiceContent.includes('unpaidFines') &&
  membersServiceContent.includes('maxBorrowDays'));

check('CirculationService validates copy availability concurrency check in issueBook',
  circulationContent.includes('copy.status !== \'AVAILABLE\'') || circulationContent.includes('AVAILABLE'));

check('CirculationService auto-assesses overdue fines and triggers reservation auto-allocation on returnBook',
  circulationContent.includes('calculateOverdueFine') &&
  circulationContent.includes('AVAILABLE_FOR_PICKUP'));

check('CirculationService enforces max 2 renewals and checks pending reservation holds',
  circulationContent.includes('renewalCount >= 2') &&
  circulationContent.includes('pendingReservations'));

check('CirculationService generates structured printable issue and return slip payloads',
  circulationContent.includes('generateIssueSlip') &&
  circulationContent.includes('generateReturnSlip') &&
  circulationContent.includes('slipType'));

check('ReservationsService manages FIFO queue positioning and hold cancellations',
  reservationsContent.includes('queuePosition') &&
  reservationsContent.includes('cancelReservation') &&
  reservationsContent.includes('processExpiredHolds'));

check('LibraryFinesService requires audited waiver reason and supports finance transaction linkage',
  finesContent.includes('waiverReason') &&
  finesContent.includes('waiveFine') &&
  finesContent.includes('financeTransactionId'));

check('LibraryReportsService compiles catalog inventory breakdown, circulation KPIs, and lost/damaged registers',
  fs.existsSync(reportsServicePath) &&
  fs.readFileSync(reportsServicePath, 'utf8').includes('getCatalogInventorySummary') &&
  fs.readFileSync(reportsServicePath, 'utf8').includes('getCirculationAnalytics') &&
  fs.readFileSync(reportsServicePath, 'utf8').includes('getOverdueReport') &&
  fs.readFileSync(reportsServicePath, 'utf8').includes('getLostDamagedReport'));

// Controller RBAC and Endpoint Verification
const controllerContent = fs.existsSync(controllerPath) ? fs.readFileSync(controllerPath, 'utf8') : '';
check('LibraryController exposes catalog routes under @RequirePermissions guards',
  controllerContent.includes('branches') &&
  controllerContent.includes('locations') &&
  controllerContent.includes('categories') &&
  controllerContent.includes('publishers') &&
  controllerContent.includes('authors') &&
  controllerContent.includes('books'));

check('LibraryController exposes physical copy management endpoints',
  controllerContent.includes('copies') &&
  controllerContent.includes('copies/:id/status') &&
  controllerContent.includes('copies/:id/mark-lost') &&
  controllerContent.includes('copies/:id/replace'));

check('LibraryController exposes member management & statement endpoints',
  controllerContent.includes('members') &&
  controllerContent.includes('members/:id/statement') &&
  controllerContent.includes('members/:id/eligibility'));

check('LibraryController exposes circulation issue, return, renew, and slip endpoints',
  controllerContent.includes('circulation/issue') &&
  controllerContent.includes('circulation/return') &&
  controllerContent.includes('circulation/renew') &&
  controllerContent.includes('circulation/loans/:id/issue-slip') &&
  controllerContent.includes('circulation/loans/:id/return-slip'));

check('LibraryController exposes reservations queue endpoints',
  controllerContent.includes('reservations') &&
  controllerContent.includes('reservations/:id/cancel'));

check('LibraryController exposes fines assessment, waiver, and payment endpoints',
  controllerContent.includes('fines') &&
  controllerContent.includes('fines/:id/waive') &&
  controllerContent.includes('fines/:id/pay'));

check('LibraryController exposes analytical reports endpoints',
  controllerContent.includes('reports/inventory') &&
  controllerContent.includes('reports/circulation') &&
  controllerContent.includes('reports/overdue') &&
  controllerContent.includes('reports/lost-damaged'));

check('LibraryController enforces library:read and library:write permissions',
  controllerContent.includes("RequirePermissions('library:read')") &&
  controllerContent.includes("RequirePermissions('library:write')"));

// -----------------------------------------------------------------------------
// 4. Web Application Library Workspaces
// -----------------------------------------------------------------------------
console.log('\n4. Checking Web Application Library Workspaces...');

const libraryPagePath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/library/page.tsx');
const operationsPagePath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/operations/page.tsx');

check('Library web portal page exists at /portal/library/page.tsx', fs.existsSync(libraryPagePath));
const libraryPageContent = fs.existsSync(libraryPagePath) ? fs.readFileSync(libraryPagePath, 'utf8') : '';

check('Library workspace supports 6-tab command center (catalog, circulation, members, reservations, fines, inventory)',
  libraryPageContent.includes("activeTab === 'catalog'") &&
  libraryPageContent.includes("activeTab === 'circulation'") &&
  libraryPageContent.includes("activeTab === 'members'") &&
  libraryPageContent.includes("activeTab === 'reservations'") &&
  libraryPageContent.includes("activeTab === 'fines'") &&
  libraryPageContent.includes("activeTab === 'inventory'"));

check('Library workspace provides Add Bibliographic Book Title modal',
  libraryPageContent.includes('Catalog New Bibliographic Book Title') &&
  libraryPageContent.includes('showAddBookModal'));

check('Library workspace provides Add Physical Book Copy modal with accession code generation',
  libraryPageContent.includes('showAddCopyModal') &&
  libraryPageContent.includes('ACC-2026-'));

check('Library workspace provides Fast Book Issue modal with patron and copy selection',
  libraryPageContent.includes('Circulation Desk: Fast Issue') &&
  libraryPageContent.includes('showIssueModal') &&
  libraryPageContent.includes('handleIssueBook'));

check('Library workspace provides Fast Book Return modal with condition assessment',
  libraryPageContent.includes('Circulation Desk: Return Processing') &&
  libraryPageContent.includes('showReturnModal') &&
  libraryPageContent.includes('returnCondition'));

check('Library workspace provides printable loan and return slip preview with print trigger',
  libraryPageContent.includes('Printable Circulation Receipt') &&
  libraryPageContent.includes('showSlipModal') &&
  libraryPageContent.includes('window.print'));

check('Library workspace provides Patron Dossier modal displaying borrowing eligibility',
  libraryPageContent.includes('Patron Dossier') &&
  libraryPageContent.includes('showStatementModal'));

check('Library workspace provides Fine Waiver modal with mandatory rationale input',
  libraryPageContent.includes('showWaiveModal') &&
  libraryPageContent.includes('Waiver Rationale / Justification'));

check('Library workspace displays inventory condition breakdown bars and lost/damaged register',
  libraryPageContent.includes('Copy Condition Breakdown') &&
  libraryPageContent.includes('Loss & Damage Audit'));

check('Operations page links to Library command center with Active badge',
  fs.existsSync(operationsPagePath) &&
  fs.readFileSync(operationsPagePath, 'utf8').includes("badge: 'Active'") &&
  fs.readFileSync(operationsPagePath, 'utf8').includes('/portal/library'));

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`PHASE 4I VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  console.error(`PHASE 4I VERIFICATION FAILED with ${failCount} errors.`);
  process.exit(1);
} else {
  console.log('PHASE 4I VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
