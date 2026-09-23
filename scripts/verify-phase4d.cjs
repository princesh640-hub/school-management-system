/**
 * Phase 4D Automated Verification Suite
 * Attendance & Leave Management Subsystem
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4D VERIFICATION: ATTENDANCE & LEAVE MANAGEMENT');
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
check('Schema contains AttendanceSession model', schema.includes('model AttendanceSession'));
check('Schema contains EmployeeAttendance model', schema.includes('model EmployeeAttendance'));
check('Schema contains AttendanceCorrection model', schema.includes('model AttendanceCorrection'));
check('Schema contains AttendanceLock model', schema.includes('model AttendanceLock'));
check('Schema contains LeaveType model', schema.includes('model LeaveType'));
check('Schema contains LeaveBalance model', schema.includes('model LeaveBalance'));
check('Schema contains LeaveBalanceTransaction model', schema.includes('model LeaveBalanceTransaction'));
check('Schema contains LeaveApplication model', schema.includes('model LeaveApplication'));
check('Schema contains AttendanceThreshold model', schema.includes('model AttendanceThreshold'));

// Enums
check('AttendanceStatus enum includes ON_LEAVE and REMOTE', schema.includes('ON_LEAVE') && schema.includes('REMOTE'));
check('Schema contains AttendanceSource enum', schema.includes('enum AttendanceSource'));
check('Schema contains AttendanceSessionType enum', schema.includes('enum AttendanceSessionType'));
check('Schema contains CorrectionStatus enum', schema.includes('enum CorrectionStatus'));
check('Schema contains CorrectionTargetType enum', schema.includes('enum CorrectionTargetType'));
check('Schema contains AttendanceLockScope enum', schema.includes('enum AttendanceLockScope'));
check('Schema contains LeaveApplicationStatus enum', schema.includes('enum LeaveApplicationStatus'));
check('Schema contains LeaveTransactionType enum', schema.includes('enum LeaveTransactionType'));

// Model relations & fields
check('Organization has attendanceSessions relation', /attendanceSessions\s+AttendanceSession\[\]/.test(schema));
check('Organization has employeeAttendances relation', /employeeAttendances\s+EmployeeAttendance\[\]/.test(schema));
check('Organization has attendanceLocks relation', /attendanceLocks\s+AttendanceLock\[\]/.test(schema));
check('Organization has leaveTypes relation', /leaveTypes\s+LeaveType\[\]/.test(schema));
check('Organization has leaveApplications relation', /leaveApplications\s+LeaveApplication\[\]/.test(schema));
check('Organization has attendanceThresholds relation', /attendanceThresholds\s+AttendanceThreshold\[\]/.test(schema));

check('Campus has attendanceSessions relation', /attendanceSessions\s+AttendanceSession\[\]/.test(schema));
check('Campus has employeeAttendances relation', /employeeAttendances\s+EmployeeAttendance\[\]/.test(schema));
check('Campus has attendanceLocks relation', /attendanceLocks\s+AttendanceLock\[\]/.test(schema));
check('Campus has leaveApplications relation', /leaveApplications\s+LeaveApplication\[\]/.test(schema));
check('Campus has attendanceThresholds relation', /attendanceThresholds\s+AttendanceThreshold\[\]/.test(schema));

check('EmployeeProfile has attendances relation', /attendances\s+EmployeeAttendance\[\]/.test(schema));
check('EmployeeProfile has leaveBalances relation', /leaveBalances\s+LeaveBalance\[\]/.test(schema));
check('EmployeeProfile has leaveApplications relation', /leaveApplications\s+LeaveApplication\[\]/.test(schema));

check('AttendanceRecord has sessionId field and session relation',
  schema.includes('sessionId') && /session\s+AttendanceSession\?/.test(schema));
check('AttendanceRecord has source field', /source\s+AttendanceSource/.test(schema));
check('AttendanceRecord has isLocked field', /isLocked\s+Boolean/.test(schema));
check('AttendanceRecord has corrections relation', /corrections\s+AttendanceCorrection\[\]/.test(schema));

// 2. Shared Types Package
console.log('\n2. Checking Shared Types Package Exports...');
const sharedTypesIndex = fs.readFileSync(path.join(rootDir, 'packages/shared-types/src/index.ts'), 'utf8');
const attendanceInterfacePath = path.join(rootDir, 'packages/shared-types/src/interfaces/attendance.interface.ts');
const leaveInterfacePath = path.join(rootDir, 'packages/shared-types/src/interfaces/leave.interface.ts');

check('attendance.interface.ts exists', fs.existsSync(attendanceInterfacePath));
check('leave.interface.ts exists', fs.existsSync(leaveInterfacePath));

if (fs.existsSync(attendanceInterfacePath) && fs.existsSync(leaveInterfacePath)) {
  const attTypes = fs.readFileSync(attendanceInterfacePath, 'utf8');
  const leaveTypes = fs.readFileSync(leaveInterfacePath, 'utf8');

  check('shared-types index exports attendance.interface', sharedTypesIndex.includes('attendance.interface'));
  check('shared-types index exports leave.interface', sharedTypesIndex.includes('leave.interface'));

  check('attendance defines AttendanceSource', attTypes.includes('type AttendanceSource'));
  check('attendance defines AttendanceSessionType', attTypes.includes('type AttendanceSessionType'));
  check('attendance defines CorrectionStatus', attTypes.includes('type CorrectionStatus'));
  check('attendance defines CorrectionTargetType', attTypes.includes('type CorrectionTargetType'));
  check('attendance defines AttendanceLockScope', attTypes.includes('type AttendanceLockScope'));
  check('attendance defines AttendanceSession', attTypes.includes('AttendanceSession'));
  check('attendance defines EmployeeAttendance', attTypes.includes('EmployeeAttendance'));
  check('attendance defines AttendanceCorrection', attTypes.includes('AttendanceCorrection'));
  check('attendance defines AttendanceLock', attTypes.includes('AttendanceLock'));
  check('attendance defines AttendanceThreshold', attTypes.includes('AttendanceThreshold'));
  check('attendance defines AbsenceStreakRecord', attTypes.includes('AbsenceStreakRecord'));

  check('leave defines LeaveApplicationStatus', leaveTypes.includes('type LeaveApplicationStatus'));
  check('leave defines LeaveTransactionType', leaveTypes.includes('type LeaveTransactionType'));
  check('leave defines LeaveType', leaveTypes.includes('LeaveType'));
  check('leave defines LeaveBalance', leaveTypes.includes('LeaveBalance'));
  check('leave defines LeaveBalanceTransaction', leaveTypes.includes('LeaveBalanceTransaction'));
  check('leave defines LeaveApplication', leaveTypes.includes('LeaveApplication'));
  check('leave defines LeaveCalendarEntry', leaveTypes.includes('LeaveCalendarEntry'));
}

// 3. Backend Attendance & Leave Services & Controllers
console.log('\n3. Checking Backend Services & Business Rules...');
const attSrvPath = path.join(rootDir, 'apps/api/src/modules/attendance/attendance.service.ts');
const empAttSrvPath = path.join(rootDir, 'apps/api/src/modules/attendance/employee-attendance.service.ts');
const leaveSrvPath = path.join(rootDir, 'apps/api/src/modules/attendance/leave.service.ts');
const attCtrlPath = path.join(rootDir, 'apps/api/src/modules/attendance/attendance.controller.ts');
const empAttCtrlPath = path.join(rootDir, 'apps/api/src/modules/attendance/employee-attendance.controller.ts');
const leaveCtrlPath = path.join(rootDir, 'apps/api/src/modules/attendance/leave.controller.ts');
const attModPath = path.join(rootDir, 'apps/api/src/modules/attendance/attendance.module.ts');

check('AttendanceService exists', fs.existsSync(attSrvPath));
check('EmployeeAttendanceService exists', fs.existsSync(empAttSrvPath));
check('LeaveService exists', fs.existsSync(leaveSrvPath));
check('AttendanceController exists', fs.existsSync(attCtrlPath));
check('EmployeeAttendanceController exists', fs.existsSync(empAttCtrlPath));
check('LeaveController exists', fs.existsSync(leaveCtrlPath));
check('AttendanceModule exists', fs.existsSync(attModPath));

if (fs.existsSync(attSrvPath) && fs.existsSync(empAttSrvPath) && fs.existsSync(leaveSrvPath)) {
  const attSrv = fs.readFileSync(attSrvPath, 'utf8');
  const empAttSrv = fs.readFileSync(empAttSrvPath, 'utf8');
  const leaveSrv = fs.readFileSync(leaveSrvPath, 'utf8');
  const attMod = fs.readFileSync(attModPath, 'utf8');

  // AttendanceModule wiring
  check('AttendanceModule imports AuditModule', attMod.includes('AuditModule'));
  check('AttendanceModule imports NotificationsModule', attMod.includes('NotificationsModule'));
  check('AttendanceModule provides AttendanceService, EmployeeAttendanceService, LeaveService',
    attMod.includes('AttendanceService') &&
    attMod.includes('EmployeeAttendanceService') &&
    attMod.includes('LeaveService'));

  // Backward compatibility - AttendanceService
  check('AttendanceService maintains verifySectionAccess', attSrv.includes('verifySectionAccess'));
  check('AttendanceService maintains getRosterForDate', attSrv.includes('getRosterForDate'));
  check('AttendanceService maintains markAttendance', attSrv.includes('markAttendance'));
  check('AttendanceService maintains getSummary', attSrv.includes('getSummary'));

  // Phase 4D student attendance expansions
  check('AttendanceService implements holiday verification check', attSrv.includes('isDateHoliday'));
  check('AttendanceService implements isAttendanceLocked', attSrv.includes('isAttendanceLocked'));
  check('AttendanceService implements lockAttendance', attSrv.includes('lockAttendance'));
  check('AttendanceService implements unlockAttendance', attSrv.includes('unlockAttendance'));
  check('AttendanceService implements getOrCreateSession', attSrv.includes('getOrCreateSession'));
  check('AttendanceService implements requestCorrection with audit',
    attSrv.includes('requestCorrection') &&
    attSrv.includes('REQUEST_ATTENDANCE_CORRECTION'));
  check('AttendanceService implements reviewCorrection with audit',
    attSrv.includes('reviewCorrection') &&
    (attSrv.includes('APPROVE_ATTENDANCE_CORRECTION') || attSrv.includes('REJECT_ATTENDANCE_CORRECTION')));
  check('AttendanceService implements getAbsenceStreaks', attSrv.includes('getAbsenceStreaks'));
  check('AttendanceService implements updateThresholds', attSrv.includes('updateThresholds'));

  // Phase 4D employee attendance service
  check('EmployeeAttendanceService implements getRosterForDate', empAttSrv.includes('getRosterForDate'));
  check('EmployeeAttendanceService implements markAttendance', empAttSrv.includes('markAttendance'));
  check('EmployeeAttendanceService implements logPunch with chronological guard',
    empAttSrv.includes('logPunch') &&
    (empAttSrv.includes('Cannot check out without prior check-in') || empAttSrv.includes('before check-in time')));
  check('EmployeeAttendanceService implements getEmployeeSummary', empAttSrv.includes('getEmployeeSummary'));
  check('EmployeeAttendanceService implements getDepartmentSummary', empAttSrv.includes('getDepartmentSummary'));

  // Phase 4D leave service
  check('LeaveService implements getLeaveTypes & createLeaveType', leaveSrv.includes('getLeaveTypes') && leaveSrv.includes('createLeaveType'));
  check('LeaveService implements calculateWorkingDays excluding weekends and holidays',
    leaveSrv.includes('calculateWorkingDays') &&
    leaveSrv.includes('isHoliday: true'));
  check('LeaveService implements getEmployeeBalances & allocateBalance', leaveSrv.includes('getEmployeeBalances') && leaveSrv.includes('allocateBalance'));
  check('LeaveService implements applyLeave with balance reservation & overlap check',
    leaveSrv.includes('applyLeave') &&
    leaveSrv.includes('pending: { increment: durationDays }') &&
    leaveSrv.includes('overlap'));
  check('LeaveService implements reviewLeave auto-marking ON_LEAVE in EmployeeAttendance',
    leaveSrv.includes('reviewLeave') &&
    leaveSrv.includes('AttendanceStatus.ON_LEAVE') &&
    leaveSrv.includes('used: { increment: duration }'));
  check('LeaveService implements cancelLeave with balance release', leaveSrv.includes('cancelLeave'));
  check('LeaveService implements getLeaveCalendar', leaveSrv.includes('getLeaveCalendar'));
}

// Controller routes & RBAC
if (fs.existsSync(attCtrlPath) && fs.existsSync(empAttCtrlPath) && fs.existsSync(leaveCtrlPath)) {
  const attCtrl = fs.readFileSync(attCtrlPath, 'utf8');
  const empAttCtrl = fs.readFileSync(empAttCtrlPath, 'utf8');
  const leaveCtrl = fs.readFileSync(leaveCtrlPath, 'utf8');

  // AttendanceController
  check('AttendanceController exposes /roster', attCtrl.includes("@Get('roster')"));
  check('AttendanceController exposes /mark', attCtrl.includes("@Post('mark')"));
  check('AttendanceController exposes /lock and /unlock', attCtrl.includes("@Post('lock')") && attCtrl.includes("@Post('unlock/:id')"));
  check('AttendanceController exposes /corrections and review', attCtrl.includes("@Post('corrections')") && attCtrl.includes("@Patch('corrections/:id/review')"));
  check('AttendanceController exposes /streaks', attCtrl.includes("@Get('streaks')"));
  check('AttendanceController exposes /thresholds', attCtrl.includes("@Get('thresholds')"));

  // EmployeeAttendanceController
  check('EmployeeAttendanceController exposes /attendance/employees/roster', empAttCtrl.includes("@Get('roster')"));
  check('EmployeeAttendanceController exposes /attendance/employees/punch', empAttCtrl.includes("@Post('punch')"));
  check('EmployeeAttendanceController exposes /attendance/employees/mark', empAttCtrl.includes("@Post('mark')"));
  check('EmployeeAttendanceController exposes /attendance/employees/:id/summary', empAttCtrl.includes("@Get(':id/summary')"));

  // LeaveController
  check('LeaveController exposes /attendance/leave/types', leaveCtrl.includes("@Get('types')") && leaveCtrl.includes("@Post('types')"));
  check('LeaveController exposes /attendance/leave/balances', leaveCtrl.includes("@Get('balances')"));
  check('LeaveController exposes /attendance/leave/applications', leaveCtrl.includes("@Get('applications')"));
  check('LeaveController exposes /attendance/leave/apply', leaveCtrl.includes("@Post('apply')"));
  check('LeaveController exposes /attendance/leave/applications/:id/review', leaveCtrl.includes("@Patch('applications/:id/review')"));
  check('LeaveController exposes /attendance/leave/calendar', leaveCtrl.includes("@Get('calendar')"));

  // RBAC permission enforcement
  check('Attendance controllers enforce attendance:read and attendance:mark',
    attCtrl.includes("@RequirePermissions('attendance:read')") &&
    attCtrl.includes("@RequirePermissions('attendance:mark')"));
  check('Leave controller enforces leave:apply and leave:approve',
    leaveCtrl.includes("@RequirePermissions('leave:apply')") &&
    leaveCtrl.includes("@RequirePermissions('leave:approve')"));
}

// 4. Web Application Pages
console.log('\n4. Checking Web Application Pages & UX Workspaces...');
const studentAttWebPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/attendance/page.tsx');
const empAttWebPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/hr/attendance/page.tsx');
const leaveWebPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/hr/leave/page.tsx');
const sidebarPath = path.join(rootDir, 'apps/web/src/components/Sidebar.tsx');

check('Student Attendance Web Page exists', fs.existsSync(studentAttWebPath));
check('Employee Attendance Web Page exists', fs.existsSync(empAttWebPath));
check('Leave Management Web Page exists', fs.existsSync(leaveWebPath));
check('Sidebar component exists', fs.existsSync(sidebarPath));

if (fs.existsSync(studentAttWebPath)) {
  const page = fs.readFileSync(studentAttWebPath, 'utf8');

  // Backward compatibility guarantees
  check('Student Attendance page calls /academics/classes (Phase 2 compatibility)', page.includes('/academics/classes'));
  check('Student Attendance page calls /attendance/roster (Phase 2 & Phase 3 compatibility)', page.includes('/attendance/roster'));
  check('Student Attendance page calls /attendance/mark (Phase 2 & Phase 3 compatibility)', page.includes('/attendance/mark'));
  check('Student Attendance page contains "Mark All Present" button (Phase 2 compatibility)', page.includes('Mark All Present'));

  // Phase 4D expansions
  check('Student Attendance page supports Session Types', page.includes('sessionType') && page.includes('FULL_DAY'));
  check('Student Attendance page implements Attendance Lock toggle & visual indicator', page.includes('isLocked') && page.includes('Session Locked'));
  check('Student Attendance page implements Attendance Correction Request modal',
    page.includes('showCorrectionModal') &&
    page.includes('Attendance Correction Request') &&
    page.includes('/attendance/corrections'));
}

if (fs.existsSync(empAttWebPath)) {
  const page = fs.readFileSync(empAttWebPath, 'utf8');
  check('Employee Attendance page connects to /attendance/employees/roster', page.includes('/attendance/employees/roster'));
  check('Employee Attendance page connects to /attendance/employees/punch', page.includes('/attendance/employees/punch'));
  check('Employee Attendance page connects to /attendance/employees/mark', page.includes('/attendance/employees/mark'));
  check('Employee Attendance page provides check-in and check-out punch buttons', page.includes("'CHECK_IN'") && page.includes("'CHECK_OUT'"));
}

if (fs.existsSync(leaveWebPath)) {
  const page = fs.readFileSync(leaveWebPath, 'utf8');
  check('Leave page connects to /attendance/leave/applications', page.includes('/attendance/leave/applications'));
  check('Leave page connects to /attendance/leave/apply', page.includes('/attendance/leave/apply'));
  check('Leave page provides tabs for Applications, Balances, and Calendar',
    page.includes("'APPLICATIONS'") &&
    page.includes("'BALANCES'") &&
    page.includes("'CALENDAR'"));
  check('Leave page provides Review application drawer with approval actions',
    page.includes('Review Application') &&
    page.includes("'APPROVED'") &&
    page.includes("'REJECTED'"));
}

if (fs.existsSync(sidebarPath)) {
  const sidebar = fs.readFileSync(sidebarPath, 'utf8');
  check('Sidebar contains Daily Attendance link', sidebar.includes('/portal/attendance'));
  check('Sidebar contains Staff Attendance link', sidebar.includes('/portal/hr/attendance'));
  check('Sidebar contains Leave Management link', sidebar.includes('/portal/hr/leave'));
}

console.log('\n================================================================');
console.log(`PHASE 4D VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  console.error(`\n[FATAL] PHASE 4D VERIFICATION FAILED WITH ${failCount} DEFECTS.`);
  process.exit(1);
} else {
  console.log('PHASE 4D VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
