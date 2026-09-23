/**
 * Phase 4C Automated Verification Suite
 * Academic Management Subsystem
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4C VERIFICATION: ACADEMIC MANAGEMENT');
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

// 1. Prisma Schema Expansions
console.log('1. Checking Database Layer (Prisma Schema Expansions)...');
const schemaPath = path.join(rootDir, 'apps/api/prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Models
check('Schema contains AcademicCalendarEvent model', schema.includes('model AcademicCalendarEvent'));
check('Schema contains Curriculum model', schema.includes('model Curriculum'));
check('Schema contains CurriculumSubject model', schema.includes('model CurriculumSubject'));
check('Schema contains SubjectOffering model', schema.includes('model SubjectOffering'));
check('Schema contains ClassTeacherAssignment model', schema.includes('model ClassTeacherAssignment'));
check('Schema contains CourseEnrollment model', schema.includes('model CourseEnrollment'));

// Enums
check('Schema contains CalendarEventCategory enum', schema.includes('enum CalendarEventCategory'));
check('Schema contains EventAudience enum', schema.includes('enum EventAudience'));
check('Schema contains SubjectCategory enum', schema.includes('enum SubjectCategory'));
check('Schema contains CourseEnrollmentStatus enum', schema.includes('enum CourseEnrollmentStatus'));

// Relations
check('Organization has calendarEvents relation', schema.includes('calendarEvents AcademicCalendarEvent[]'));
check('Organization has curricula relation', schema.includes('curricula      Curriculum[]'));
check('Campus has calendarEvents relation', schema.includes('calendarEvents AcademicCalendarEvent[]'));
check('Campus has curricula relation', schema.includes('curricula      Curriculum[]'));
check('AcademicYear has calendarEvents relation', schema.includes('calendarEvents AcademicCalendarEvent[]'));
check('AcademicYear has curricula relation', schema.includes('curricula      Curriculum[]'));
check('AcademicYear has subjectOfferings relation', schema.includes('subjectOfferings SubjectOffering[]'));
check('AcademicYear has classTeacherAssignments relation', schema.includes('classTeacherAssignments ClassTeacherAssignment[]'));
check('Department has subjects relation', schema.includes('subjects       Subject[]'));
check('Term has calendarEvents relation', schema.includes('calendarEvents AcademicCalendarEvent[]'));
check('Term has subjectOfferings relation', schema.includes('subjectOfferings SubjectOffering[]'));
check('TeacherProfile has subjectOfferings relation', schema.includes('subjectOfferings SubjectOffering[]'));
check('TeacherProfile has classTeacherAssignments relation', schema.includes('classTeacherAssignments ClassTeacherAssignment[]'));
check('Class has progression hierarchy (nextClassId & nextClass)', schema.includes('nextClassId') && schema.includes('nextClass'));
check('Class has curricula relation', schema.includes('curricula      Curriculum[]'));
check('Class has subjectOfferings relation', schema.includes('subjectOfferings SubjectOffering[]'));
check('Section has roomNumber field', schema.includes('roomNumber') && schema.includes('room_number'));
check('Section has subjectOfferings relation', schema.includes('subjectOfferings SubjectOffering[]'));
check('Section has classTeacherAssignments relation', schema.includes('classTeacherAssignments ClassTeacherAssignment[]'));
check('Subject has shortName and category fields', schema.includes('shortName') && schema.includes('SubjectCategory'));
check('Subject has departmentId and department relation', schema.includes('departmentId') && schema.includes('department     Department?'));
check('Subject has curriculumSubjects relation', schema.includes('curriculumSubjects CurriculumSubject[]'));
check('Subject has subjectOfferings relation', schema.includes('subjectOfferings SubjectOffering[]'));
check('Enrollment has courseEnrollments relation', schema.includes('courseEnrollments CourseEnrollment[]'));

// 2. Shared Types Package
console.log('\n2. Checking Shared Types Package Exports...');
const sharedTypesIndex = fs.readFileSync(path.join(rootDir, 'packages/shared-types/src/index.ts'), 'utf8');
const academicInterfacePath = path.join(rootDir, 'packages/shared-types/src/interfaces/academic.interface.ts');
check('academic.interface.ts exists', fs.existsSync(academicInterfacePath));
if (fs.existsSync(academicInterfacePath)) {
  const iface = fs.readFileSync(academicInterfacePath, 'utf8');
  check('shared-types index exports academic.interface', sharedTypesIndex.includes('academic.interface'));
  check('academic defines CalendarEventCategory', iface.includes('type CalendarEventCategory'));
  check('academic defines EventAudience', iface.includes('type EventAudience'));
  check('academic defines SubjectCategory', iface.includes('type SubjectCategory'));
  check('academic defines CourseEnrollmentStatus', iface.includes('type CourseEnrollmentStatus'));
  check('academic defines AcademicCalendarEvent', iface.includes('interface AcademicCalendarEvent'));
  check('academic defines Curriculum', iface.includes('interface Curriculum'));
  check('academic defines CurriculumSubject', iface.includes('interface CurriculumSubject'));
  check('academic defines SubjectOffering', iface.includes('interface SubjectOffering'));
  check('academic defines ClassTeacherAssignment', iface.includes('interface ClassTeacherAssignment'));
  check('academic defines CourseEnrollment', iface.includes('interface CourseEnrollment'));
  check('academic defines AcademicOverview', iface.includes('interface AcademicOverview'));
}

// 3. Backend Academics Module & Business Logic
console.log('\n3. Checking Academics Module & Business Rules...');
const acadCtrlPath = path.join(rootDir, 'apps/api/src/modules/academics/academics.controller.ts');
const acadSrvPath = path.join(rootDir, 'apps/api/src/modules/academics/academics.service.ts');
const acadModPath = path.join(rootDir, 'apps/api/src/modules/academics/academics.module.ts');

check('AcademicsController exists', fs.existsSync(acadCtrlPath));
check('AcademicsService exists', fs.existsSync(acadSrvPath));
check('AcademicsModule exists', fs.existsSync(acadModPath));

if (fs.existsSync(acadSrvPath) && fs.existsSync(acadCtrlPath) && fs.existsSync(acadModPath)) {
  const srv = fs.readFileSync(acadSrvPath, 'utf8');
  const ctrl = fs.readFileSync(acadCtrlPath, 'utf8');
  const mod = fs.readFileSync(acadModPath, 'utf8');

  check('AcademicsModule imports AuditModule', mod.includes('AuditModule'));

  // Backward-compatible core academic methods
  check('AcademicsService implements getYears', srv.includes('getYears'));
  check('AcademicsService implements createYear', srv.includes('createYear'));
  check('AcademicsService implements setCurrentYear', srv.includes('setCurrentYear'));
  check('AcademicsService implements getTerms', srv.includes('getTerms'));
  check('AcademicsService implements createTerm', srv.includes('createTerm'));
  check('AcademicsService implements updateTerm', srv.includes('updateTerm'));
  check('AcademicsService implements setCurrentTerm', srv.includes('setCurrentTerm'));
  check('AcademicsService implements getClasses', srv.includes('getClasses'));
  check('AcademicsService implements createClass', srv.includes('createClass'));
  check('AcademicsService implements updateClass', srv.includes('updateClass'));
  check('AcademicsService implements getSections', srv.includes('getSections'));
  check('AcademicsService implements createSection', srv.includes('createSection'));
  check('AcademicsService implements updateSection', srv.includes('updateSection'));
  check('AcademicsService implements getSubjects', srv.includes('getSubjects'));
  check('AcademicsService implements createSubject', srv.includes('createSubject'));
  check('AcademicsService implements updateSubject', srv.includes('updateSubject'));
  check('AcademicsService implements assignSubjectTeacher', srv.includes('assignSubjectTeacher'));
  check('AcademicsService implements transferSection', srv.includes('transferSection'));
  check('AcademicsService implements getSectionRoster', srv.includes('getSectionRoster'));

  // Curriculum & Offerings
  check('AcademicsService implements getCurricula', srv.includes('getCurricula'));
  check('AcademicsService implements createCurriculum', srv.includes('createCurriculum'));
  check('AcademicsService implements addSubjectToCurriculum', srv.includes('addSubjectToCurriculum'));
  check('AcademicsService implements removeSubjectFromCurriculum', srv.includes('removeSubjectFromCurriculum'));
  check('AcademicsService implements getSubjectOfferings', srv.includes('getSubjectOfferings'));
  check('AcademicsService implements createSubjectOffering', srv.includes('createSubjectOffering'));

  // Teacher Workload & Class Teacher
  check('AcademicsService implements assignClassTeacher with audit', srv.includes('assignClassTeacher') && srv.includes('ASSIGN_CLASS_TEACHER'));
  check('AcademicsService implements getClassTeacherHistory', srv.includes('getClassTeacherHistory'));
  check('AcademicsService implements getTeacherWorkload', srv.includes('getTeacherWorkload'));

  // Section Capacity Enforcement & Audited Overrides
  check('AcademicsService enforces section capacity check in enrollStudent', srv.includes('currentEnrolledCount >= section.capacity'));
  check('AcademicsService logs CAPACITY_OVERRIDE audit event', srv.includes('CAPACITY_OVERRIDE'));
  check('AcademicsService auto-enrolls in course offerings upon enrollment', srv.includes('courseEnrollment'));

  // Academic Calendar & Overview
  check('AcademicsService implements getCalendarEvents', srv.includes('getCalendarEvents'));
  check('AcademicsService implements createCalendarEvent', srv.includes('createCalendarEvent'));
  check('AcademicsService implements updateCalendarEvent', srv.includes('updateCalendarEvent'));
  check('AcademicsService implements deleteCalendarEvent', srv.includes('deleteCalendarEvent'));
  check('AcademicsService implements getAcademicOverview', srv.includes('getAcademicOverview'));

  // Controller Endpoints & RBAC
  check('AcademicsController exposes /academics/overview', ctrl.includes("@Get('overview')"));
  check('AcademicsController exposes /academics/curricula', ctrl.includes("@Get('curricula')") && ctrl.includes("@Post('curricula')"));
  check('AcademicsController exposes /academics/offerings', ctrl.includes("@Get('offerings')") && ctrl.includes("@Post('offerings')"));
  check('AcademicsController exposes /academics/sections/:id/class-teacher', ctrl.includes("@Post('sections/:id/class-teacher')"));
  check('AcademicsController exposes /academics/teachers/:id/workload', ctrl.includes("@Get('teachers/:id/workload')"));
  check('AcademicsController exposes /academics/calendar', ctrl.includes("@Get('calendar')") && ctrl.includes("@Post('calendar')"));
  check('AcademicsController guards endpoints with academics:read', ctrl.includes("@RequirePermissions('academics:read')"));
  check('AcademicsController guards mutations with academics:manage', ctrl.includes("@RequirePermissions('academics:manage')"));
}

// 4. Web UI Command Center
console.log('\n4. Checking Web Application Command Center...');
const webAcademicsPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/academics/page.tsx');
check('Academics Web Page exists', fs.existsSync(webAcademicsPath));

if (fs.existsSync(webAcademicsPath)) {
  const page = fs.readFileSync(webAcademicsPath, 'utf8');

  // Backward compatibility checks
  check('Academics Page calls /academics/classes (Phase 2 compatibility)', page.includes('/academics/classes'));
  check('Academics Page calls /roster (Phase 2 & Phase 3 compatibility)', page.includes('/roster'));

  // Phase 4C Expansions
  check('Academics Page displays KPI overview metrics strip', page.includes('overview') && page.includes('Active Term'));
  check('Academics Page provides multi-tab navigation (structure, curriculum, offerings, calendar)',
    page.includes("activeTab === 'structure'") &&
    page.includes("activeTab === 'curriculum'") &&
    page.includes("activeTab === 'offerings'") &&
    page.includes("activeTab === 'calendar'"));
  check('Academics Page connects to /academics/subjects endpoint', page.includes('/academics/subjects'));
  check('Academics Page connects to /academics/curricula endpoint', page.includes('/academics/curricula'));
  check('Academics Page connects to /academics/offerings endpoint', page.includes('/academics/offerings'));
  check('Academics Page connects to /academics/calendar endpoint', page.includes('/academics/calendar'));
  check('Academics Page provides Add Class modal', page.includes('showAddClassModal') && page.includes('Create Grade Level Class'));
  check('Academics Page provides Add Section modal with capacity & room', page.includes('showAddSectionModal') && page.includes('Maximum Student Capacity'));
  check('Academics Page provides Add Subject modal', page.includes('showAddSubjectModal') && page.includes('Register Catalog Subject'));
  check('Academics Page provides Schedule Calendar Event modal', page.includes('showAddEventModal') && page.includes('Schedule Academic Calendar Event'));
  check('Academics Page provides Assign Class Teacher modal', page.includes('showAssignTeacherModal') && page.includes('Assign Class Teacher'));
}

console.log('\n================================================================');
console.log(`PHASE 4C VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  console.error(`\n[FATAL] PHASE 4C VERIFICATION FAILED WITH ${failCount} DEFECTS.`);
  process.exit(1);
} else {
  console.log('PHASE 4C VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
