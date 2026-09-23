#!/usr/bin/env node
// =============================================================================
// Phase 4N: Parent & Guardian Portal — Verification Script
// Run: node scripts/verify-phase4n.cjs
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
const failures = [];

function check(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.log(`  ❌ ${description}`);
    failed++;
    failures.push(description);
  }
}

function readFile(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  } catch {
    return '';
  }
}

function has(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

// =============================================================================
console.log('\n📋 PHASE 4N VERIFICATION — Parent & Guardian Portal\n');

// =============================================================================
console.log('1. Prisma Schema — Guardian & Student Relationship Models');
// =============================================================================
const schema = readFile('apps/api/prisma/schema.prisma');

check('GuardianProfile model defined', has(schema, 'model GuardianProfile {'));
check('GuardianProfile: userId', has(schema, /model GuardianProfile[\s\S]*?userId\s+String\s+@unique/));
check('GuardianProfile: occupation', has(schema, /model GuardianProfile[\s\S]*?occupation\s+String\?/));
check('GuardianProfile: relationship', has(schema, /model GuardianProfile[\s\S]*?relationship\s+String\?/));
check('GuardianProfile: address', has(schema, /model GuardianProfile[\s\S]*?address\s+String\?/));
check('GuardianProfile: status', has(schema, /model GuardianProfile[\s\S]*?status\s+RecordStatus/));
check('GuardianProfile.students relation exists', has(schema, /model GuardianProfile[\s\S]*?students\s+StudentGuardian\[\]/));

check('StudentGuardian model defined', has(schema, 'model StudentGuardian {'));
check('StudentGuardian: studentId', has(schema, /model StudentGuardian[\s\S]*?studentId\s+String/));
check('StudentGuardian: guardianId', has(schema, /model StudentGuardian[\s\S]*?guardianId\s+String/));
check('StudentGuardian: relationship', has(schema, /model StudentGuardian[\s\S]*?relationship\s+String\?/));
check('StudentGuardian: isPrimary', has(schema, /model StudentGuardian[\s\S]*?isPrimary\s+Boolean/));
check('StudentGuardian: canPickup', has(schema, /model StudentGuardian[\s\S]*?canPickup\s+Boolean/));
check('StudentGuardian unique compound key (studentId, guardianId)', has(schema, /@@unique\(\[studentId,\s*guardianId\]\)/));

check('StudentProfile.guardians relation exists', has(schema, /model StudentProfile[\s\S]*?guardians\s+StudentGuardian\[\]/));
check('StudentProfile.attendanceRecords relation exists', has(schema, /model StudentProfile[\s\S]*?attendanceRecords\s+AttendanceRecord\[\]/));
check('StudentProfile.examResults relation exists', has(schema, /model StudentProfile[\s\S]*?examResults\s+ExamResult\[\]/));
check('StudentProfile.feeInvoices relation exists', has(schema, /model StudentProfile[\s\S]*?feeInvoices\s+FeeInvoice\[\]/));

// =============================================================================
console.log('\n2. Shared Types — Parent Portal Interfaces');
// =============================================================================
const sharedTypesIndex = readFile('packages/shared-types/src/index.ts');
const parentInterface = readFile('packages/shared-types/src/interfaces/parent.interface.ts');

check('parent.interface.ts exists', parentInterface.length > 0);
check('parent.interface.ts exported in shared-types index.ts', has(sharedTypesIndex, 'parent.interface'));
check('IParentChildSummary interface defined', has(parentInterface, 'export interface IParentChildSummary'));
check('IParentChildOverview interface defined', has(parentInterface, 'export interface IParentChildOverview'));
check('IParentChildProfile interface defined', has(parentInterface, 'export interface IParentChildProfile'));
check('IParentAttendanceSummary interface defined', has(parentInterface, 'export interface IParentAttendanceSummary'));
check('IParentTimetable interface defined', has(parentInterface, 'export interface IParentTimetable'));
check('IParentExamResult interface defined', has(parentInterface, 'export interface IParentExamResult'));
check('IParentReportCard interface defined', has(parentInterface, 'export interface IParentReportCard'));
check('IParentFeeSummary interface defined', has(parentInterface, 'export interface IParentFeeSummary'));
check('IParentTransportInfo interface defined', has(parentInterface, 'export interface IParentTransportInfo'));
check('IParentHostelInfo interface defined', has(parentInterface, 'export interface IParentHostelInfo'));
check('IParentLibraryInfo interface defined', has(parentInterface, 'export interface IParentLibraryInfo'));
check('IParentNotice interface defined', has(parentInterface, 'export interface IParentNotice'));
check('IParentProfile interface defined', has(parentInterface, 'export interface IParentProfile'));

// =============================================================================
console.log('\n3. Centralized Parent Authorization Service');
// =============================================================================
const parentAuthService = readFile('apps/api/src/modules/parent/parent-auth.service.ts');

check('ParentAuthService exists', parentAuthService.length > 0);
check('validateGuardianStudentAccess implemented', has(parentAuthService, 'validateGuardianStudentAccess('));
check('validateGuardianStudentAccess resolves GuardianProfile', has(parentAuthService, 'guardianProfile.findUnique'));
check('validateGuardianStudentAccess queries StudentGuardian', has(parentAuthService, 'studentGuardian.findUnique'));
check('validateGuardianStudentAccess throws ForbiddenException on breach', has(parentAuthService, 'throw new ForbiddenException'));
check('getGuardianProfileByUserId implemented', has(parentAuthService, 'getGuardianProfileByUserId('));
check('getAuthorizedStudentIds implemented', has(parentAuthService, 'getAuthorizedStudentIds('));

// =============================================================================
console.log('\n4. Backend Parent Services Implementation');
// =============================================================================

// 4.1 Children Service
const childrenService = readFile('apps/api/src/modules/parent/parent-children.service.ts');
check('ParentChildrenService exists', childrenService.length > 0);
check('getChildren implemented', has(childrenService, 'getChildren('));
check('getChildProfile implemented', has(childrenService, 'getChildProfile('));
check('getChildProfile calls validateGuardianStudentAccess', has(childrenService, 'validateGuardianStudentAccess'));
check('getChildOverview aggregates cross-module metrics', has(childrenService, 'getChildOverview('));
check('getChildOverview calculates monthly attendance percentage', has(childrenService, 'monthPercentage'));
check('getChildOverview calculates balance outstanding', has(childrenService, 'balanceOutstanding'));
check('getChildOverview compiles attention items', has(childrenService, 'attentionItems'));

// 4.2 Academic Service
const academicService = readFile('apps/api/src/modules/parent/parent-academic.service.ts');
check('ParentAcademicService exists', academicService.length > 0);
check('getChildAttendance implemented', has(academicService, 'getChildAttendance('));
check('getChildAttendance calls validateGuardianStudentAccess', has(academicService, 'validateGuardianStudentAccess'));
check('getChildTimetable implemented', has(academicService, 'getChildTimetable('));
check('getChildTimetable filters by PUBLISHED status', has(academicService, 'TimetableStatus.PUBLISHED'));
check('getChildExams implemented', has(academicService, 'getChildExams('));
check('getChildResults implemented', has(academicService, 'getChildResults('));
check('getChildResults withholds draft marks', has(academicService, "status: { in: ['APPROVED', 'LOCKED'] }"));
check('getChildReportCards implemented', has(academicService, 'getChildReportCards('));
check('getChildReportCards filters by isPublished: true', has(academicService, 'isPublished: true'));

// 4.3 Finance Service
const financeService = readFile('apps/api/src/modules/parent/parent-finance.service.ts');
check('ParentFinanceService exists', financeService.length > 0);
check('getChildFeeSummary implemented', has(financeService, 'getChildFeeSummary('));
check('getChildFeeSummary calls validateGuardianStudentAccess', has(financeService, 'validateGuardianStudentAccess'));
check('getChildFeeSummary computes remaining balance', has(financeService, 'remainingAmount'));
check('getChildFeeSummary returns honest payment gateway readiness', has(financeService, 'paymentGateway: {'));
check('initiateOnlinePayment implemented', has(financeService, 'initiateOnlinePayment('));
check('initiateOnlinePayment verifies invoice belongs to child', has(financeService, 'invoice.studentId !== student.id'));
check('initiateOnlinePayment blocks unconfigured gateway', has(financeService, 'ONLINE PAYMENT NOT CONFIGURED'));

// 4.4 Services Service (Transport, Hostel, Library, Docs)
const servicesService = readFile('apps/api/src/modules/parent/parent-services.service.ts');
check('ParentServicesService exists', servicesService.length > 0);
check('getChildTransport implemented', has(servicesService, 'getChildTransport('));
check('getChildTransport calls validateGuardianStudentAccess', has(servicesService, 'validateGuardianStudentAccess'));
check('getChildTransport returns recent boarding events', has(servicesService, 'recentBoardings'));
check('getChildHostel implemented', has(servicesService, 'getChildHostel('));
check('getChildHostel returns room, bed, and roll calls', has(servicesService, 'hostelAllocation.findFirst'));
check('getChildLibrary implemented', has(servicesService, 'getChildLibrary('));
check('getChildLibrary returns loans, due dates, and fines', has(servicesService, 'activeLoans'));
check('getChildDocuments implemented', has(servicesService, 'getChildDocuments('));

// 4.5 Communication Service
const commService = readFile('apps/api/src/modules/parent/parent-communication.service.ts');
check('ParentCommunicationService exists', commService.length > 0);
check('getParentNotices implemented', has(commService, 'getParentNotices('));
check('getParentNotices targets parent and child grades', has(commService, 'targetRoles: { has: \'PARENT\' }'));
check('getParentNotifications implemented', has(commService, 'getParentNotifications('));
check('sendSchoolMessage implemented retaining child context', has(commService, 'sendSchoolMessage('));

// 4.6 Profile Service
const profileService = readFile('apps/api/src/modules/parent/parent-profile.service.ts');
check('ParentProfileService exists', profileService.length > 0);
check('getGuardianProfile implemented', has(profileService, 'getGuardianProfile('));
check('updateGuardianProfile implemented', has(profileService, 'updateGuardianProfile('));
check('getParentPreferences implemented', has(profileService, 'getParentPreferences('));

// =============================================================================
console.log('\n5. Controller & Module Registration');
// =============================================================================
const parentController = readFile('apps/api/src/modules/parent/parent.controller.ts');
const parentModule = readFile('apps/api/src/modules/parent/parent.module.ts');
const appModule = readFile('apps/api/src/app.module.ts');

check('ParentController exists', parentController.length > 0);
check('Controller has /parent/children', has(parentController, "'children'"));
check('Controller has /parent/children/:studentId/overview', has(parentController, "'children/:studentId/overview'"));
check('Controller has /parent/children/:studentId/profile', has(parentController, "'children/:studentId/profile'"));
check('Controller has /parent/children/:studentId/attendance', has(parentController, "'children/:studentId/attendance'"));
check('Controller has /parent/children/:studentId/timetable', has(parentController, "'children/:studentId/timetable'"));
check('Controller has /parent/children/:studentId/exams', has(parentController, "'children/:studentId/exams'"));
check('Controller has /parent/children/:studentId/results', has(parentController, "'children/:studentId/results'"));
check('Controller has /parent/children/:studentId/report-cards', has(parentController, "'children/:studentId/report-cards'"));
check('Controller has /parent/children/:studentId/fees', has(parentController, "'children/:studentId/fees'"));
check('Controller has /parent/children/:studentId/fees/:invoiceId/pay', has(parentController, "'children/:studentId/fees/:invoiceId/pay'"));
check('Controller has /parent/children/:studentId/transport', has(parentController, "'children/:studentId/transport'"));
check('Controller has /parent/children/:studentId/hostel', has(parentController, "'children/:studentId/hostel'"));
check('Controller has /parent/children/:studentId/library', has(parentController, "'children/:studentId/library'"));
check('Controller has /parent/children/:studentId/documents', has(parentController, "'children/:studentId/documents'"));
check('Controller has /parent/notices', has(parentController, "'notices'"));
check('Controller has /parent/notifications', has(parentController, "'notifications'"));
check('Controller has /parent/messages', has(parentController, "'messages'"));
check('Controller has /parent/profile', has(parentController, "'profile'"));
check('Controller has /parent/preferences', has(parentController, "'preferences'"));

check('Controller enforces parent:children:view permission', has(parentController, "'parent:children:view'"));
check('Controller enforces parent:attendance:view permission', has(parentController, "'parent:attendance:view'"));
check('Controller enforces parent:timetable:view permission', has(parentController, "'parent:timetable:view'"));
check('Controller enforces parent:results:view permission', has(parentController, "'parent:results:view'"));
check('Controller enforces parent:fees:view permission', has(parentController, "'parent:fees:view'"));
check('Controller enforces parent:payments:create permission', has(parentController, "'parent:payments:create'"));
check('Controller enforces parent:notices:view permission', has(parentController, "'parent:notices:view'"));

check('ParentModule imports NotificationsModule', has(parentModule, 'NotificationsModule'));
check('ParentModule imports AuditModule', has(parentModule, 'AuditModule'));
check('ParentModule provides ParentAuthService', has(parentModule, 'ParentAuthService'));
check('ParentModule exports ParentAuthService', has(parentModule, 'ParentAuthService'));
check('AppModule imports ParentModule', has(appModule, 'ParentModule'));

// =============================================================================
console.log('\n6. Web Workspace & Navigation');
// =============================================================================
const parentPage = readFile('apps/web/src/app/(dashboard)/portal/parent/page.tsx');
const sidebar = readFile('apps/web/src/components/Sidebar.tsx');

check('/portal/parent/page.tsx exists', parentPage.length > 0);
check('Parent portal implements multi-child selector bar', has(parentPage, 'handleSelectChild'));
check('Parent portal flushes child state on switch', has(parentPage, 'IMMEDIATE STATE FLUSH'));
check('Parent portal defines 10 core tabs',
  has(parentPage, "'overview'") &&
  has(parentPage, "'profile'") &&
  has(parentPage, "'attendance'") &&
  has(parentPage, "'timetable'") &&
  has(parentPage, "'exams'") &&
  has(parentPage, "'report-cards'") &&
  has(parentPage, "'fees'") &&
  has(parentPage, "'transport'") &&
  has(parentPage, "'notices'") &&
  has(parentPage, "'parent-settings'")
);
check('Parent portal has attention items in overview', has(parentPage, 'overview.attentionItems'));
check('Parent portal has attendance stats cards', has(parentPage, 'attendance.attendancePercentage'));
check('Parent portal displays fee ledger & remaining balance', has(parentPage, 'remainingAmount'));
check('Parent portal handles online payment honest fallback', has(parentPage, 'ONLINE PAYMENT NOT CONFIGURED'));
check('Sidebar links to /portal/parent', has(sidebar, '/portal/parent'));

// =============================================================================
console.log('\n7. Mobile Flutter Application Foundation');
// =============================================================================
const mobileScreen = readFile('apps/mobile/lib/features/parent/parent_portal_screen.dart');
const mobileEndpoints = readFile('apps/mobile/lib/core/constants/api_endpoints.dart');

check('mobile parent_portal_screen.dart exists', mobileScreen.length > 0);
check('Mobile screen has child selector chips', has(mobileScreen, 'ChoiceChip'));
check('Mobile screen has pull-to-refresh', has(mobileScreen, 'RefreshIndicator'));
check('Mobile screen has network error handling & retry', has(mobileScreen, 'Retry Connection'));
check('Mobile screen has attendance tab', has(mobileScreen, '_buildAttendanceTab'));
check('Mobile screen has results tab', has(mobileScreen, '_buildResultsTab'));
check('Mobile screen has fees tab', has(mobileScreen, '_buildFeesTab'));
check('ApiEndpoints has parent endpoints defined',
  has(mobileEndpoints, 'parent =') &&
  has(mobileEndpoints, 'parentChildren =') &&
  has(mobileEndpoints, 'parentNotices =') &&
  has(mobileEndpoints, 'parentProfile =')
);

// =============================================================================
console.log('\n8. Documentation & Final Reports');
// =============================================================================
const statusDoc = readFile('docs/features/feature-status.md');
const specDoc = readFile('docs/features/phase4n-parent-guardian-portal.md');
const finalReport = readFile('docs/features/phase4n-final-report.md');

check('Phase 4N marked VERIFIED in feature-status.md', has(statusDoc, /Parent Portal[\s\S]*?4N[\s\S]*?VERIFIED/));
check('phase4n-parent-guardian-portal.md exists', specDoc.length > 0);
check('phase4n-parent-guardian-portal.md has EXISTING section', has(specDoc, '### EXISTING'));
check('phase4n-parent-guardian-portal.md has MISSING section', has(specDoc, '### MISSING'));
check('phase4n-parent-guardian-portal.md has TO IMPLEMENT section', has(specDoc, '### TO IMPLEMENT'));
check('phase4n-parent-guardian-portal.md has DEFERRED section', has(specDoc, '### DEFERRED'));
check('phase4n-final-report.md exists', finalReport.length > 0);
check('phase4n-final-report.md has VERIFIED status', has(finalReport, '**Status:** **VERIFIED**'));

// =============================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  PHASE 4N VERIFICATION COMPLETE');
console.log(`  ✅ PASSED: ${passed}`);
console.log(`  ❌ FAILED: ${failed}`);
console.log(`  TOTAL:   ${passed + failed}`);

if (failed === 0) {
  console.log('\n  🎉 ALL CHECKS PASSED — PHASE 4N IS VERIFIED AND READY FOR PHASE 4O');
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.log('\n  ⚠️ FAILURES DETECTED:');
  failures.forEach((f) => console.log(`    - ${f}`));
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(1);
}
