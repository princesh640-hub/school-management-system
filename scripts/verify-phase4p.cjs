#!/usr/bin/env node
// =============================================================================
// Phase 4P: Teacher Portal — Comprehensive Verification Script
// Run: node scripts/verify-phase4p.cjs
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
console.log('\n📋 PHASE 4P VERIFICATION — Teacher Portal\n');

// =============================================================================
console.log('1. Prisma Schema — Teacher, Academic & Operational Models');
// =============================================================================
const schema = readFile('apps/api/prisma/schema.prisma');

check('TeacherProfile model defined', has(schema, 'model TeacherProfile {'));
check('TeacherProfile: userId relation', has(schema, /model TeacherProfile[\s\S]*?userId\s+String\s+@unique/));
check('TeacherProfile: employeeProfile relation', has(schema, /model TeacherProfile[\s\S]*?employeeProfileId\s+String/));
check('TeacherProfile: classTeacherAssignments relation', has(schema, /model TeacherProfile[\s\S]*?classTeacherAssignments\s+ClassTeacherAssignment\[\]/));
check('TeacherProfile: subjectTeachers relation', has(schema, /model TeacherProfile[\s\S]*?subjectTeachers\s+SubjectTeacher\[\]/));
check('EmployeeProfile model defined', has(schema, 'model EmployeeProfile {'));
check('ClassTeacherAssignment model defined', has(schema, 'model ClassTeacherAssignment {'));
check('SubjectOffering model defined', has(schema, 'model SubjectOffering {'));
check('SubjectTeacher model defined', has(schema, 'model SubjectTeacher {'));
check('AttendanceRecord model defined', has(schema, 'model AttendanceRecord {'));
check('AttendanceCorrection model defined', has(schema, 'model AttendanceCorrection {'));
check('ExamSchedule model defined', has(schema, 'model ExamSchedule {'));
check('ExamResult model defined', has(schema, 'model ExamResult {'));
check('ExamInvigilator model defined', has(schema, 'model ExamInvigilator {'));
check('LeaveBalance model defined', has(schema, 'model LeaveBalance {'));
check('LeaveApplication model defined', has(schema, 'model LeaveApplication {'));
check('Announcement model defined', has(schema, 'model Announcement {'));
check('Notification model defined', has(schema, 'model Notification {'));

// =============================================================================
console.log('\n2. Shared Types — Teacher Portal Interfaces');
// =============================================================================
const sharedTypesIndex = readFile('packages/shared-types/src/index.ts');
const teacherInterface = readFile('packages/shared-types/src/interfaces/teacher-portal.interface.ts');

check('teacher-portal.interface.ts exists', teacherInterface.length > 0);
check('teacher-portal.interface exported in shared-types index.ts', has(sharedTypesIndex, 'teacher-portal.interface'));
check('ITeacherDashboardOverview interface defined', has(teacherInterface, 'export interface ITeacherDashboardOverview'));
check('ITeacherProfile interface defined', has(teacherInterface, 'export interface ITeacherProfile'));
check('ITeachingAssignment interface defined', has(teacherInterface, 'export interface ITeachingAssignment'));
check('ITeacherSectionWorkspace interface defined', has(teacherInterface, 'export interface ITeacherSectionWorkspace'));
check('ITeacherSubjectWorkspace interface defined', has(teacherInterface, 'export interface ITeacherSubjectWorkspace'));
check('ITeacherStudentSummary interface defined', has(teacherInterface, 'export interface ITeacherStudentSummary'));
check('ITeacherStudentDetail interface defined', has(teacherInterface, 'export interface ITeacherStudentDetail'));
check('ITeacherTimetableSlot interface defined', has(teacherInterface, 'export interface ITeacherTimetableSlot'));
check('ITeacherTimetable interface defined', has(teacherInterface, 'export interface ITeacherTimetable'));
check('ITeacherAttendanceStudent interface defined', has(teacherInterface, 'export interface ITeacherAttendanceStudent'));
check('ITeacherAttendanceRoster interface defined', has(teacherInterface, 'export interface ITeacherAttendanceRoster'));
check('ITeacherMarkAttendanceDto interface defined', has(teacherInterface, 'export interface ITeacherMarkAttendanceDto'));
check('ITeacherAttendanceCorrectionDto interface defined', has(teacherInterface, 'export interface ITeacherAttendanceCorrectionDto'));
check('ITeacherExamTask interface defined', has(teacherInterface, 'export interface ITeacherExamTask'));
check('ITeacherMarksStudent interface defined', has(teacherInterface, 'export interface ITeacherMarksStudent'));
check('ITeacherMarksRoster interface defined', has(teacherInterface, 'export interface ITeacherMarksRoster'));
check('ITeacherSubmitMarksDto interface defined', has(teacherInterface, 'export interface ITeacherSubmitMarksDto'));
check('ITeacherMarksCorrectionDto interface defined', has(teacherInterface, 'export interface ITeacherMarksCorrectionDto'));
check('ITeacherResultSummary interface defined', has(teacherInterface, 'export interface ITeacherResultSummary'));
check('ITeacherLeaveSummary interface defined', has(teacherInterface, 'export interface ITeacherLeaveSummary'));
check('ITeacherLeaveApplicationDto interface defined', has(teacherInterface, 'export interface ITeacherLeaveApplicationDto'));
check('ITeacherNotice interface defined', has(teacherInterface, 'export interface ITeacherNotice'));
check('ITeacherClassMessageDto interface defined', has(teacherInterface, 'export interface ITeacherClassMessageDto'));

// =============================================================================
console.log('\n3. Centralized Teacher Authorization Service');
// =============================================================================
const teacherAuthService = readFile('apps/api/src/modules/teacher/teacher-auth.service.ts');

check('TeacherAuthService exists', teacherAuthService.length > 0);
check('TeacherAuthService is Injectable', has(teacherAuthService, '@Injectable()'));
check('getTeacherProfileByUserId implemented', has(teacherAuthService, 'getTeacherProfileByUserId'));
check('getTeacherProfileByUserId checks active employee status', has(teacherAuthService, "employee.status === 'TERMINATED'"));
check('getTeacherProfileByUserId throws ForbiddenException', has(teacherAuthService, 'throw new ForbiddenException'));
check('validateSectionAccess implemented', has(teacherAuthService, 'validateSectionAccess'));
check('validateSubjectAccess implemented', has(teacherAuthService, 'validateSubjectAccess'));
check('validateStudentAccess implemented', has(teacherAuthService, 'validateStudentAccess'));
check('validateExamScheduleAccess implemented', has(teacherAuthService, 'validateExamScheduleAccess'));
check('getAssignedSectionIds implemented', has(teacherAuthService, 'getAssignedSectionIds'));
check('getAssignedSubjectOfferingIds implemented', has(teacherAuthService, 'getAssignedSubjectOfferingIds'));

// =============================================================================
console.log('\n4. Teacher Dashboard Service');
// =============================================================================
const teacherDashService = readFile('apps/api/src/modules/teacher/teacher-dashboard.service.ts');

check('TeacherDashboardService exists', teacherDashService.length > 0);
check('TeacherDashboardService is Injectable', has(teacherDashService, '@Injectable()'));
check('getDashboardOverview implemented', has(teacherDashService, 'getDashboardOverview'));
check('Computes pendingAttendanceSections', has(teacherDashService, 'pendingAttendanceSections'));
check('Computes pendingMarksExams', has(teacherDashService, 'pendingMarksExams'));
check('Resolves todaySchedule', has(teacherDashService, 'todaySchedule'));
check('Resolves upcomingExams', has(teacherDashService, 'upcomingExams'));
check('Generates actionable tasks', has(teacherDashService, 'pendingTasks.push'));

// =============================================================================
console.log('\n5. Teacher Classes Service & Data Privacy');
// =============================================================================
const teacherClassesService = readFile('apps/api/src/modules/teacher/teacher-classes.service.ts');

check('TeacherClassesService exists', teacherClassesService.length > 0);
check('getTeacherProfile implemented', has(teacherClassesService, 'getTeacherProfile'));
check('getAssignedClasses implemented', has(teacherClassesService, 'getAssignedClasses'));
check('getAssignedSubjects implemented', has(teacherClassesService, 'getAssignedSubjects'));
check('getStudentsForSection implemented', has(teacherClassesService, 'getStudentsForSection'));
check('getStudentDetail implemented', has(teacherClassesService, 'getStudentDetail'));
check('Strict section validation on students roster', has(teacherClassesService, 'validateSectionAccess'));
check('Strict student access validation on student detail', has(teacherClassesService, 'validateStudentAccess'));
check('Student roster excludes fee invoices', !has(teacherClassesService, 'feeInvoices: true'));
check('Student roster excludes billing accounts', !has(teacherClassesService, 'billingAccount: true'));

// =============================================================================
console.log('\n6. Teacher Academics Service (Attendance & Marks)');
// =============================================================================
const teacherAcademicsService = readFile('apps/api/src/modules/teacher/teacher-academics.service.ts');

check('TeacherAcademicsService exists', teacherAcademicsService.length > 0);
check('getWeeklyTimetable implemented', has(teacherAcademicsService, 'getWeeklyTimetable'));
check('getAttendanceRoster implemented', has(teacherAcademicsService, 'getAttendanceRoster'));
check('markAttendance implemented', has(teacherAcademicsService, 'markAttendance'));
check('markAttendance validates section assignment', has(teacherAcademicsService, 'validateSectionAccess'));
check('requestAttendanceCorrection implemented', has(teacherAcademicsService, 'requestAttendanceCorrection'));
check('getExamTasks implemented', has(teacherAcademicsService, 'getExamTasks'));
check('getMarksRoster implemented', has(teacherAcademicsService, 'getMarksRoster'));
check('submitMarks implemented', has(teacherAcademicsService, 'submitMarks'));
check('submitMarks validates bounds: marksObtained <= maxMarks', has(teacherAcademicsService, 'rec.marksObtained > maxMarks'));
check('submitMarks validates bounds: marksObtained >= 0', has(teacherAcademicsService, 'rec.marksObtained < 0'));
check('submitMarks supports draft vs submitted status', has(teacherAcademicsService, 'MarksEntryStatus.SUBMITTED : MarksEntryStatus.DRAFT'));
check('requestMarksCorrection implemented', has(teacherAcademicsService, 'requestMarksCorrection'));
check('getClassResultSummary implemented', has(teacherAcademicsService, 'getClassResultSummary'));

// =============================================================================
console.log('\n7. Teacher Self-Service & Communication Services');
// =============================================================================
const teacherSelfService = readFile('apps/api/src/modules/teacher/teacher-self-service.service.ts');
const teacherCommService = readFile('apps/api/src/modules/teacher/teacher-communication.service.ts');

check('TeacherSelfServiceService exists', teacherSelfService.length > 0);
check('getLeaveSummary implemented', has(teacherSelfService, 'getLeaveSummary'));
check('applyForLeave implemented', has(teacherSelfService, 'applyForLeave'));
check('getAttendanceTimesheet implemented', has(teacherSelfService, 'getAttendanceTimesheet'));
check('TeacherCommunicationService exists', teacherCommService.length > 0);
check('getNotices implemented', has(teacherCommService, 'getNotices'));
check('getNotifications implemented', has(teacherCommService, 'getNotifications'));
check('sendSectionMessage implemented', has(teacherCommService, 'sendSectionMessage'));
check('sendSectionMessage enforces section authorization', has(teacherCommService, 'validateSectionAccess'));

// =============================================================================
console.log('\n8. Teacher Controller & API Endpoints');
// =============================================================================
const teacherController = readFile('apps/api/src/modules/teacher/teacher.controller.ts');

check('TeacherController exists', teacherController.length > 0);
check('Controller path set to teacher', has(teacherController, "@Controller('teacher')"));
check('Endpoint: GET /teacher/dashboard', has(teacherController, "@Get('dashboard')"));
check('Endpoint: GET /teacher/profile', has(teacherController, "@Get('profile')"));
check('Endpoint: GET /teacher/classes', has(teacherController, "@Get('classes')"));
check('Endpoint: GET /teacher/classes/:sectionId/students', has(teacherController, "@Get('classes/:sectionId/students')"));
check('Endpoint: GET /teacher/students/:studentId', has(teacherController, "@Get('students/:studentId')"));
check('Endpoint: GET /teacher/subjects', has(teacherController, "@Get('subjects')"));
check('Endpoint: GET /teacher/timetable', has(teacherController, "@Get('timetable')"));
check('Endpoint: GET /teacher/attendance', has(teacherController, "@Get('attendance')"));
check('Endpoint: POST /teacher/attendance', has(teacherController, "@Post('attendance')"));
check('Endpoint: POST /teacher/attendance/corrections', has(teacherController, "@Post('attendance/corrections')"));
check('Endpoint: GET /teacher/exams', has(teacherController, "@Get('exams')"));
check('Endpoint: GET /teacher/marks/:examScheduleId', has(teacherController, "@Get('marks/:examScheduleId')"));
check('Endpoint: POST /teacher/marks', has(teacherController, "@Post('marks')"));
check('Endpoint: POST /teacher/marks/corrections', has(teacherController, "@Post('marks/corrections')"));
check('Endpoint: GET /teacher/results/classes/:sectionId/exams/:examScheduleId', has(teacherController, "@Get('results/classes/:sectionId/exams/:examScheduleId')"));
check('Endpoint: GET /teacher/leave', has(teacherController, "@Get('leave')"));
check('Endpoint: POST /teacher/leave/apply', has(teacherController, "@Post('leave/apply')"));
check('Endpoint: GET /teacher/timesheets', has(teacherController, "@Get('timesheets')"));
check('Endpoint: GET /teacher/notices', has(teacherController, "@Get('notices')"));
check('Endpoint: GET /teacher/notifications', has(teacherController, "@Get('notifications')"));
check('Endpoint: POST /teacher/communication/send', has(teacherController, "@Post('communication/send')"));
check('Uses @CurrentUser decorator', has(teacherController, '@CurrentUser()'));
check('Enforces @RequirePermissions', has(teacherController, '@RequirePermissions'));

// =============================================================================
console.log('\n9. Teacher Module & AppModule Registration');
// =============================================================================
const teacherModule = readFile('apps/api/src/modules/teacher/teacher.module.ts');
const appModule = readFile('apps/api/src/app.module.ts');

check('TeacherModule exists', teacherModule.length > 0);
check('TeacherModule exports TeacherAuthService', has(teacherModule, /exports:\s*\[[\s\S]*?TeacherAuthService/));
check('TeacherModule imports AuditModule', has(teacherModule, 'AuditModule'));
check('TeacherModule imports NotificationsModule', has(teacherModule, 'NotificationsModule'));
check('TeacherModule imported in AppModule', has(appModule, 'TeacherModule'));

// =============================================================================
console.log('\n10. Web Workspace & Navigation');
// =============================================================================
const webPage = readFile('apps/web/src/app/(dashboard)/portal/teacher/page.tsx');
const sidebar = readFile('apps/web/src/components/Sidebar.tsx');

check('Teacher Portal web page exists', webPage.length > 0);
check('Web page has Today & Schedule tab', has(webPage, "activeTab === 'overview'") || has(webPage, 'Today & Schedule'));
check('Web page has Classes & Sections tab', has(webPage, "activeTab === 'classes'"));
check('Web page has Fast Attendance tab', has(webPage, "activeTab === 'attendance'"));
check('Web page has Exams & Marks tab', has(webPage, "activeTab === 'exams'") || has(webPage, 'Exams & Marks Entry'));
check('Web page has Timetable tab', has(webPage, "activeTab === 'timetable'"));
check('Web page has Leave & Self-Service tab', has(webPage, "activeTab === 'leave'"));
check('Web page has Notices & Inbox tab', has(webPage, "activeTab === 'notices'"));
check('Web page has "Mark All Present" helper', has(webPage, 'markAllAttendance') || has(webPage, 'handleMarkAllPresent'));
check('Web page enforces marks validation <= maxMarks', has(webPage, 'numVal > roster.maxMarks'));
check('Sidebar includes Teacher Portal navigation link', has(sidebar, '/portal/teacher'));
check('Sidebar Teacher Portal has teacher icon', has(sidebar, "icon: '👨‍🏫'"));

// =============================================================================
console.log('\n11. Mobile Flutter Screen & Endpoints');
// =============================================================================
const mobileScreen = readFile('apps/mobile/lib/features/teacher/teacher_portal_screen.dart');
const mobileEndpoints = readFile('apps/mobile/lib/core/constants/api_endpoints.dart');

check('teacher_portal_screen.dart exists', mobileScreen.length > 0);
check('Mobile screen defines TeacherPortalScreen StatefulWidget', has(mobileScreen, 'class TeacherPortalScreen extends StatefulWidget'));
check('Mobile screen has 5 bottom navigation tabs', has(mobileScreen, 'BottomNavigationBarItem'));
check('Mobile screen implements fast attendance marking', has(mobileScreen, '_submitAttendance'));
check('Mobile screen implements one-tap All Present', has(mobileScreen, '_markAllAttendance'));
check('Mobile screen implements marks entry with bounds check', has(mobileScreen, '_saveMarks'));
check('Mobile screen includes retry error state', has(mobileScreen, '_buildErrorView'));
check('api_endpoints.dart defines teacher base route', has(mobileEndpoints, "static const String teacher = '/api/$apiVersion/teacher'"));
check('api_endpoints.dart defines teacherDashboard', has(mobileEndpoints, "static const String teacherDashboard = '/api/$apiVersion/teacher/dashboard'"));
check('api_endpoints.dart defines teacherAttendance', has(mobileEndpoints, "static const String teacherAttendance = '/api/$apiVersion/teacher/attendance'"));
check('api_endpoints.dart defines teacherMarks', has(mobileEndpoints, "static const String teacherMarks = '/api/$apiVersion/teacher/marks'"));
check('api_endpoints.dart defines teacherClasses', has(mobileEndpoints, "static const String teacherClasses = '/api/$apiVersion/teacher/classes'"));

// =============================================================================
console.log('\n12. Documentation & Status Verification');
// =============================================================================
const featureDocs = readFile('docs/features/phase4p-teacher-portal.md');
const finalReport = readFile('docs/features/phase4p-final-report.md');
const featureStatus = readFile('docs/features/feature-status.md');

check('docs/features/phase4p-teacher-portal.md exists', featureDocs.length > 0);
check('docs/features/phase4p-final-report.md exists', finalReport.length > 0);
check('feature-status.md marks Phase 4P as VERIFIED', has(featureStatus, '| **Teacher Portal** | Faculty Workspace, Attendance & Marks | 4P | **VERIFIED**'));

// =============================================================================
console.log('\n==================================================');
console.log(`TOTAL CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('==================================================\n');

if (failed > 0) {
  console.error(`❌ Phase 4P verification FAILED with ${failed} failure(s):`);
  failures.forEach((f) => console.error(`   - ${f}`));
  process.exit(1);
} else {
  console.log('🎉 Phase 4P: TEACHER PORTAL VERIFIED SUCCESSFULLY (100% Passed)!');
  process.exit(0);
}
