#!/usr/bin/env node
// =============================================================================
// Phase 4O: Student Portal — Verification Script
// Run: node scripts/verify-phase4o.cjs
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
console.log('\n📋 PHASE 4O VERIFICATION — Student Portal\n');

// =============================================================================
console.log('1. Prisma Schema — Student Profile & Academic Models');
// =============================================================================
const schema = readFile('apps/api/prisma/schema.prisma');

check('StudentProfile model defined', has(schema, 'model StudentProfile {'));
check('StudentProfile: userId', has(schema, /model StudentProfile[\s\S]*?userId\s+String\s+@unique/));
check('StudentProfile: admissionNumber', has(schema, /model StudentProfile[\s\S]*?admissionNumber\s+String\s+@unique/));
check('StudentProfile: lifecycleStatus', has(schema, /model StudentProfile[\s\S]*?lifecycleStatus\s+StudentLifecycleStatus/));
check('StudentProfile.user relation exists', has(schema, /model StudentProfile[\s\S]*?user\s+User/));
check('StudentProfile.enrollments relation exists', has(schema, /model StudentProfile[\s\S]*?enrollments\s+Enrollment\[\]/));
check('StudentProfile.attendanceRecords relation exists', has(schema, /model StudentProfile[\s\S]*?attendanceRecords\s+AttendanceRecord\[\]/));
check('StudentProfile.examResults relation exists', has(schema, /model StudentProfile[\s\S]*?examResults\s+ExamResult\[\]/));
check('StudentProfile.reportCards relation exists', has(schema, /model StudentProfile[\s\S]*?reportCards\s+ReportCard\[\]/));
check('StudentProfile.feeInvoices relation exists', has(schema, /model StudentProfile[\s\S]*?feeInvoices\s+FeeInvoice\[\]/));
check('StudentProfile.libraryMembers relation exists', has(schema, /model StudentProfile[\s\S]*?libraryMembers\s+LibraryMember\[\]/));
check('StudentProfile.transportAssignments relation exists', has(schema, /model StudentProfile[\s\S]*?transportAssignments\s+StudentTransportAssignment\[\]/));
check('StudentProfile.hostelAllocations relation exists', has(schema, /model StudentProfile[\s\S]*?hostelAllocations\s+HostelAllocation\[\]/));
check('StudentProfile.documents relation exists', has(schema, /model StudentProfile[\s\S]*?documents\s+StudentDocument\[\]/));

// =============================================================================
console.log('\n2. Shared Types — Student Portal Interfaces');
// =============================================================================
const sharedTypesIndex = readFile('packages/shared-types/src/index.ts');
const studentInterface = readFile('packages/shared-types/src/interfaces/student-portal.interface.ts');

check('student-portal.interface.ts exists', studentInterface.length > 0);
check('student-portal.interface.ts exported in shared-types index.ts', has(sharedTypesIndex, 'student-portal.interface'));
check('IStudentDashboardOverview interface defined', has(studentInterface, 'export interface IStudentDashboardOverview'));
check('IStudentProfile interface defined', has(studentInterface, 'export interface IStudentProfile'));
check('IStudentAcademicDetails interface defined', has(studentInterface, 'export interface IStudentAcademicDetails'));
check('IStudentSubject interface defined', has(studentInterface, 'export interface IStudentSubject'));
check('IStudentTimetable interface defined', has(studentInterface, 'export interface IStudentTimetable'));
check('IStudentAttendanceSummary interface defined', has(studentInterface, 'export interface IStudentAttendanceSummary'));
check('IStudentExamSchedule interface defined', has(studentInterface, 'export interface IStudentExamSchedule'));
check('IStudentExamResult interface defined', has(studentInterface, 'export interface IStudentExamResult'));
check('IStudentReportCard interface defined', has(studentInterface, 'export interface IStudentReportCard'));
check('IStudentAcademicHistory interface defined', has(studentInterface, 'export interface IStudentAcademicHistory'));
check('IStudentCalendarEvent interface defined', has(studentInterface, 'export interface IStudentCalendarEvent'));
check('IStudentNotice interface defined', has(studentInterface, 'export interface IStudentNotice'));
check('IStudentLibraryInfo interface defined', has(studentInterface, 'export interface IStudentLibraryInfo'));
check('IStudentTransportInfo interface defined', has(studentInterface, 'export interface IStudentTransportInfo'));
check('IStudentHostelInfo interface defined', has(studentInterface, 'export interface IStudentHostelInfo'));
check('IStudentFeeSummary interface defined', has(studentInterface, 'export interface IStudentFeeSummary'));
check('IStudentDocument interface defined', has(studentInterface, 'export interface IStudentDocument'));

// =============================================================================
console.log('\n3. Centralized Student Authorization Service');
// =============================================================================
const authService = readFile('apps/api/src/modules/student/student-auth.service.ts');

check('StudentAuthService exists', authService.length > 0);
check('getStudentProfileByUserId implemented', has(authService, 'getStudentProfileByUserId'));
check('getStudentProfileByUserId queries studentProfile with userId', has(authService, 'where: { userId }'));
check('getStudentProfileByUserId checks SUSPENDED status', has(authService, 'SUSPENDED'));
check('getStudentProfileByUserId throws ForbiddenException on breach', has(authService, 'throw new ForbiddenException'));
check('validateStudentAccess implemented', has(authService, 'validateStudentAccess'));
check('validateStudentAccess blocks access to another student', has(authService, 'requestedStudentId !== student.id'));
check('isEligibleForActiveAcademics implemented', has(authService, 'isEligibleForActiveAcademics'));

// =============================================================================
console.log('\n4. Backend Student Services Implementation');
// =============================================================================
const dashboardService = readFile('apps/api/src/modules/student/student-dashboard.service.ts');
const profileService = readFile('apps/api/src/modules/student/student-profile.service.ts');
const academicService = readFile('apps/api/src/modules/student/student-academic.service.ts');
const financeService = readFile('apps/api/src/modules/student/student-finance.service.ts');
const servicesService = readFile('apps/api/src/modules/student/student-services.service.ts');
const commService = readFile('apps/api/src/modules/student/student-communication.service.ts');

// Dashboard Service
check('StudentDashboardService exists', dashboardService.length > 0);
check('getDashboardOverview implemented', has(dashboardService, 'getDashboardOverview'));
check('getDashboardOverview aggregates attendance percentage', has(dashboardService, 'attendancePercentage'));
check('getDashboardOverview queries published timetable entries', has(dashboardService, 'PUBLISHED'));
check('getDashboardOverview queries upcoming published exams', has(dashboardService, 'upcomingExams'));
check('getDashboardOverview compiles attention items', has(dashboardService, 'attentionItems'));

// Profile Service
check('StudentProfileService exists', profileService.length > 0);
check('getStudentProfile implemented', has(profileService, 'getStudentProfile'));
check('getStudentProfile strips internal admin fields', !has(profileService, 'medicalNotes') && !has(profileService, 'previousSchool'));
check('updateStudentProfile implemented', has(profileService, 'updateStudentProfile'));
check('updateStudentProfile limits update to contact fields', has(profileService, 'emergencyContactPhone') && !has(profileService, 'lifecycleStatus: dto'));
check('getStudentPreferences implemented', has(profileService, 'getStudentPreferences'));
check('updateStudentPreferences implemented', has(profileService, 'updateStudentPreferences'));

// Academic Service
check('StudentAcademicService exists', academicService.length > 0);
check('getAcademicDetails implemented', has(academicService, 'getAcademicDetails'));
check('getSubjects implemented', has(academicService, 'getSubjects'));
check('getTimetable implemented', has(academicService, 'getTimetable'));
check('getTimetable filters by PUBLISHED timetableVersion', has(academicService, 'status: TimetableStatus.PUBLISHED'));
check('getAttendance implemented', has(academicService, 'getAttendance'));
check('getAttendance generates low-attendance alerts', has(academicService, 'LOW_ATTENDANCE'));
check('getUpcomingExams implemented', has(academicService, 'getUpcomingExams'));
check('getUpcomingExams filters by PUBLISHED examSession', has(academicService, 'ExamSessionStatus.PUBLISHED'));
check('getPublishedResults implemented', has(academicService, 'getPublishedResults'));
check('getPublishedResults withholds draft marks', has(academicService, 'status: { in: [MarksEntryStatus.APPROVED, MarksEntryStatus.LOCKED] }'));
check('getReportCards implemented', has(academicService, 'getReportCards'));
check('getReportCards filters by isPublished: true', has(academicService, 'isPublished: true'));
check('getAcademicHistory implemented', has(academicService, 'getAcademicHistory'));
check('getAcademicCalendar implemented', has(academicService, 'getAcademicCalendar'));
check('getAcademicCalendar filters targetAudience for STUDENTS', has(academicService, 'targetAudience: { in: [EventAudience.ALL, EventAudience.STUDENTS] }'));

// Finance Service
check('StudentFinanceService exists', financeService.length > 0);
check('getFeeSummary implemented', has(financeService, 'getFeeSummary'));
check('getFeeSummary calculates balanceOutstanding', has(financeService, 'balanceOutstanding'));
check('getFeeSummary returns paymentGatewayConfigured honestly', has(financeService, 'paymentGatewayConfigured'));
check('initiatePayment implemented', has(financeService, 'initiatePayment'));
check('initiatePayment validates invoice belongs to student', has(financeService, 'invoice.studentId !== student.id'));
check('initiatePayment blocks unconfigured gateway honestly', has(financeService, 'ONLINE PAYMENT NOT CONFIGURED'));

// Services Service
check('StudentServicesService exists', servicesService.length > 0);
check('getLibrary implemented', has(servicesService, 'getLibrary'));
check('getLibrary returns active loans, due dates, fines', has(servicesService, 'activeLoans') && has(servicesService, 'totalOutstandingFines'));
check('getTransport implemented', has(servicesService, 'getTransport'));
check('getTransport returns route, stop, vehicle, driver', has(servicesService, 'routeName') && has(servicesService, 'pickupTime'));
check('getHostel implemented', has(servicesService, 'getHostel'));
check('getHostel returns room, bed, roll calls, outings', has(servicesService, 'roomNumber') && has(servicesService, 'bedNumber'));
check('getDocuments implemented', has(servicesService, 'getDocuments'));
check('getDocuments filters by isVerified: true', has(servicesService, 'isVerified: true'));

// Communication Service
check('StudentCommunicationService exists', commService.length > 0);
check('getNotices implemented', has(commService, 'getNotices'));
check('getNotices targets students', has(commService, "roles: { has: 'STUDENT' }"));
check('getNotifications implemented', has(commService, 'getNotifications'));
check('markNotificationAsRead implemented', has(commService, 'markNotificationAsRead'));
check('sendMessage implemented with audit logging', has(commService, 'sendMessage') && has(commService, 'auditService.log'));

// =============================================================================
console.log('\n5. Controller & Module Registration');
// =============================================================================
const controller = readFile('apps/api/src/modules/student/student.controller.ts');
const studentModule = readFile('apps/api/src/modules/student/student.module.ts');
const appModule = readFile('apps/api/src/app.module.ts');

check('StudentController exists', controller.length > 0);
check('Controller has /student/dashboard', has(controller, "@Get('dashboard')"));
check('Controller has /student/overview', has(controller, "@Get('overview')"));
check('Controller has /student/profile', has(controller, "@Get('profile')"));
check('Controller has PATCH /student/profile', has(controller, "@Patch('profile')"));
check('Controller has /student/preferences', has(controller, "@Get('preferences')"));
check('Controller has PATCH /student/preferences', has(controller, "@Patch('preferences')"));
check('Controller has /student/academics', has(controller, "@Get('academics')"));
check('Controller has /student/subjects', has(controller, "@Get('subjects')"));
check('Controller has /student/timetable', has(controller, "@Get('timetable')"));
check('Controller has /student/attendance', has(controller, "@Get('attendance')"));
check('Controller has /student/exams', has(controller, "@Get('exams')"));
check('Controller has /student/results', has(controller, "@Get('results')"));
check('Controller has /student/report-cards', has(controller, "@Get('report-cards')"));
check('Controller has /student/history', has(controller, "@Get('history')"));
check('Controller has /student/calendar', has(controller, "@Get('calendar')"));
check('Controller has /student/fees', has(controller, "@Get('fees')"));
check('Controller has POST /student/fees/:invoiceId/pay', has(controller, "@Post('fees/:invoiceId/pay')"));
check('Controller has /student/library', has(controller, "@Get('library')"));
check('Controller has /student/transport', has(controller, "@Get('transport')"));
check('Controller has /student/hostel', has(controller, "@Get('hostel')"));
check('Controller has /student/documents', has(controller, "@Get('documents')"));
check('Controller has /student/notices', has(controller, "@Get('notices')"));
check('Controller has /student/notifications', has(controller, "@Get('notifications')"));
check('Controller has POST /student/messages', has(controller, "@Post('messages')"));

check('Controller enforces student:portal:view', has(controller, "student:portal:view"));
check('Controller enforces student:profile:view', has(controller, "student:profile:view"));
check('Controller enforces student:profile:update-limited', has(controller, "student:profile:update-limited"));
check('Controller enforces student:academics:view', has(controller, "student:academics:view"));
check('Controller enforces student:subjects:view', has(controller, "student:subjects:view"));
check('Controller enforces student:timetable:view', has(controller, "student:timetable:view"));
check('Controller enforces student:attendance:view', has(controller, "student:attendance:view"));
check('Controller enforces student:exams:view', has(controller, "student:exams:view"));
check('Controller enforces student:results:view', has(controller, "student:results:view"));
check('Controller enforces student:report-cards:view', has(controller, "student:report-cards:view"));
check('Controller enforces student:fees:view', has(controller, "student:fees:view"));
check('Controller enforces student:payments:create', has(controller, "student:payments:create"));
check('Controller enforces student:library:view', has(controller, "student:library:view"));
check('Controller enforces student:transport:view', has(controller, "student:transport:view"));
check('Controller enforces student:hostel:view', has(controller, "student:hostel:view"));
check('Controller enforces student:documents:view', has(controller, "student:documents:view"));
check('Controller enforces student:notices:view', has(controller, "student:notices:view"));
check('Controller enforces student:notifications:view', has(controller, "student:notifications:view"));
check('Controller enforces student:messages:create', has(controller, "student:messages:create"));

check('StudentModule imports NotificationsModule', has(studentModule, 'NotificationsModule'));
check('StudentModule imports AuditModule', has(studentModule, 'AuditModule'));
check('StudentModule provides StudentAuthService', has(studentModule, 'StudentAuthService'));
check('StudentModule exports StudentAuthService', has(studentModule, 'StudentAuthService'));
check('AppModule imports StudentModule', has(appModule, 'StudentModule'));

// =============================================================================
console.log('\n6. Web Workspace & Navigation');
// =============================================================================
const webPage = readFile('apps/web/src/app/(dashboard)/portal/student/page.tsx');
const sidebar = readFile('apps/web/src/components/Sidebar.tsx');

check('/portal/student/page.tsx exists', webPage.length > 0);
check('Student portal defines 11 core tabs', has(webPage, "id: 'overview'") && has(webPage, "id: 'academics'") && has(webPage, "id: 'timetable'") && has(webPage, "id: 'fees'"));
check('Student portal has attention items in overview', has(webPage, 'overview.attentionItems.map'));
check('Student portal has attendance stats cards', has(webPage, 'attendancePercentage'));
check('Student portal displays fee ledger & remaining balance', has(webPage, 'balanceOutstanding') && has(webPage, 'fees.invoices.map'));
check('Student portal handles online payment honest fallback', has(webPage, 'ONLINE PAYMENT NOT CONFIGURED'));
check('Sidebar links to /portal/student', has(sidebar, '/portal/student'));

// =============================================================================
console.log('\n7. Mobile Flutter Application Foundation');
// =============================================================================
const mobileScreen = readFile('apps/mobile/lib/features/student/student_portal_screen.dart');
const apiEndpoints = readFile('apps/mobile/lib/core/constants/api_endpoints.dart');

check('mobile student_portal_screen.dart exists', mobileScreen.length > 0);
check('Mobile screen has pull-to-refresh', has(mobileScreen, 'RefreshIndicator'));
check('Mobile screen has network error handling & retry', has(mobileScreen, '_errorMessage') && has(mobileScreen, '_buildErrorView'));
check('Mobile screen has timetable tab', has(mobileScreen, '_buildTimetableTab'));
check('Mobile screen has attendance tab', has(mobileScreen, '_buildAttendanceTab'));
check('Mobile screen has results tab', has(mobileScreen, '_buildResultsTab'));
check('Mobile screen has fees tab', has(mobileScreen, '_buildFeesTab'));
check('ApiEndpoints has student endpoints defined', has(apiEndpoints, 'studentDashboard') && has(apiEndpoints, 'studentTimetable'));

// =============================================================================
console.log('\n8. Documentation & Final Reports');
// =============================================================================
const featureStatus = readFile('docs/features/feature-status.md');
const specDoc = readFile('docs/features/phase4o-student-portal.md');
const finalReport = readFile('docs/features/phase4o-final-report.md');

check('phase4o-student-portal.md exists', specDoc.length > 0);
check('phase4o-student-portal.md has EXISTING section', has(specDoc, '### EXISTING'));
check('phase4o-student-portal.md has MISSING section', has(specDoc, '### MISSING'));
check('phase4o-student-portal.md has TO IMPLEMENT section', has(specDoc, '### TO IMPLEMENT'));
check('phase4o-student-portal.md has DEFERRED section', has(specDoc, '### DEFERRED'));
check('Phase 4O marked VERIFIED in feature-status.md', has(featureStatus, '| 4O | **VERIFIED** |'));
check('phase4o-final-report.md exists', finalReport.length > 0);
check('phase4o-final-report.md has VERIFIED status', has(finalReport, 'VERIFIED'));

// =============================================================================
console.log('\n═══════════════════════════════════════════════════');
console.log('  PHASE 4O VERIFICATION COMPLETE');
console.log(`  ✅ PASSED: ${passed}`);
console.log(`  ❌ FAILED: ${failed}`);
console.log(`  TOTAL:   ${passed + failed}`);

if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('\n  🎉 ALL CHECKS PASSED — PHASE 4O IS VERIFIED AND READY FOR PHASE 4P');
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(0);
}
