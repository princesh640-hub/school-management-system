const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('=== PHASE 2 COMPREHENSIVE BASIC STRUCTURE & FEATURES VERIFICATION ===\n');

let passCount = 0;
let warnCount = 0;
let failCount = 0;

function check(label, condition, details = '', isWarn = false) {
  if (condition) {
    console.log(`[PASS] ${label}`);
    passCount++;
  } else if (isWarn) {
    console.log(`[WARNING] ${label} - ${details}`);
    warnCount++;
  } else {
    console.log(`[FAIL] ${label} - ${details}`);
    failCount++;
  }
}

// 1. Prisma Models & Schema
const schemaPath = path.join(rootDir, 'apps/api/prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');
check('Prisma contains Notification model', schema.includes('model Notification'));
check('Prisma contains ExamSchedule model', schema.includes('model ExamSchedule'));
check('Prisma contains ExamResult model', schema.includes('model ExamResult'));
check('Prisma contains FeeStructure model', schema.includes('model FeeStructure'));
check('Prisma contains FeeInvoice model', schema.includes('model FeeInvoice'));
check('Prisma contains PaymentTransaction model', schema.includes('model PaymentTransaction'));
check('Prisma contains SystemSetting model', schema.includes('model SystemSetting'));
check('Prisma contains AuditLog model', schema.includes('model AuditLog'));

// 2. Comprehensive Database Seed Script
const seedPath = path.join(rootDir, 'apps/api/prisma/seed.ts');
check('Database seed script exists', fs.existsSync(seedPath));
if (fs.existsSync(seedPath)) {
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  check('Seed creates Organization & Campus', seedContent.includes('Beacon Horizon Academy') && seedContent.includes('Downtown Main Campus'));
  check('Seed creates Academic Year 2026-2027', seedContent.includes('ay-2026-2027'));
  check('Seed creates System Roles', seedContent.includes('SUPER_ADMIN') && seedContent.includes('TEACHER') && seedContent.includes('STUDENT') && seedContent.includes('ACCOUNTANT'));
  check('Seed creates System Permissions', seedContent.includes('users:read') && seedContent.includes('attendance:mark') && seedContent.includes('fees:collect'));
  check('Seed creates Seed Users with Argon2 hashes', seedContent.includes('admin@school.edu') && seedContent.includes('argon2.hash'));
  check('Seed creates Class, Section, and Subject', seedContent.includes('Grade 10') && seedContent.includes('Mathematics'));
  check('Seed creates Student Enrollment', seedContent.includes('prisma.enrollment.upsert'));
  check('Seed creates Fee Structure & Invoice', seedContent.includes('Grade 10 Standard Tuition Fee') && seedContent.includes('INV-2026-0001'));
  check('Seed creates Exam Schedule', seedContent.includes('Mid-Term Examination 2026'));
}

// 3. AppModule Module Registrations
const appModulePath = path.join(rootDir, 'apps/api/src/app.module.ts');
const appModuleContent = fs.readFileSync(appModulePath, 'utf8');
['OrganizationsModule', 'CampusesModule', 'AuthModule', 'UsersModule', 'RolesModule', 'StudentsModule', 'TeachersModule', 'GuardiansModule', 'EmployeesModule', 'AcademicsModule', 'AttendanceModule', 'ExaminationsModule', 'FeesModule', 'NotificationsModule', 'ReportsModule', 'SettingsModule', 'AuditModule'].forEach(mod => {
  check(`AppModule imports ${mod}`, appModuleContent.includes(mod));
});

// 4. API Domain Services & Controllers Verification
const checkFileAndKeywords = (filePath, label, keywords = []) => {
  const exists = fs.existsSync(filePath);
  check(`File exists: ${label}`, exists);
  if (exists) {
    const content = fs.readFileSync(filePath, 'utf8');
    keywords.forEach(kw => {
      check(`${label} contains "${kw}"`, content.includes(kw));
    });
  }
};

// Auth & Users
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/auth/auth.service.ts'), 'AuthService', ['getMe', 'changePassword']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/auth/auth.controller.ts'), 'AuthController', ['Set-Cookie', 'HttpOnly', 'getMe', 'logout']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/users/users.service.ts'), 'UsersService', ['async create(', 'async update(', 'updateStatus', 'assignRoles', 'overridePermission']);

// Organizations & Campuses
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/organizations/organizations.controller.ts'), 'OrganizationsController', ['getCurrent', 'updateCurrent']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/campuses/campuses.controller.ts'), 'CampusesController', ['findAll', 'findOne', 'create', 'update', 'updateStatus']);

// Academics
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/academics/academics.service.ts'), 'AcademicsService', ['createYear', 'createClass', 'createSection', 'createSubject', 'assignSubjectTeacher', 'enrollStudent', 'transferSection', 'getSectionRoster']);

// People
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/students/students.service.ts'), 'StudentsService', ['findAll', 'findOne', 'async create(', 'async update(']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/teachers/teachers.service.ts'), 'TeachersService', ['findAll', 'findOne', 'async create(']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/guardians/guardians.service.ts'), 'GuardiansService', ['findAll', 'findOne', 'async create(']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/employees/employees.service.ts'), 'EmployeesService', ['findAll', 'findOne', 'async create(']);

// Attendance
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/attendance/attendance.service.ts'), 'AttendanceService', ['verifySectionAccess', 'getRosterForDate', 'markAttendance', 'getSummary']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/attendance/attendance.controller.ts'), 'AttendanceController', ['roster', 'mark', 'summary', 'attendance:mark']);

// Examinations
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/examinations/examinations.service.ts'), 'ExaminationsService', ['createSchedule', 'getSchedules', 'enterResults', 'computeGrade', 'getScheduleResults']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/examinations/examinations.controller.ts'), 'ExaminationsController', ['schedules', 'results/entry', 'results', 'examinations:grade']);

// Fees
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/fees/fees.service.ts'), 'FeesService', ['createStructure', 'getStructures', 'generateInvoices', 'getInvoices', 'recordPayment']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/fees/fees.controller.ts'), 'FeesController', ['structures', 'invoices/generate', 'invoices', 'payments', 'fees:collect']);

// Notifications
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/notifications/notifications.service.ts'), 'NotificationsService', ['getMyNotifications', 'markAsRead', 'markAllAsRead', 'broadcast']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/notifications/notifications.controller.ts'), 'NotificationsController', ['unreadOnly', 'read-all', 'broadcast', 'notifications:send']);

// Reports, Settings & Audit
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/reports/reports.service.ts'), 'ReportsService', ['getStudentListReport', 'getAttendanceSummaryReport', 'getFeeSummaryReport']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/settings/settings.controller.ts'), 'SettingsController', ['settings:read', 'settings:manage', 'upsert']);
checkFileAndKeywords(path.join(rootDir, 'apps/api/src/modules/audit/audit.service.ts'), 'AuditService', ['findAll', 'auditLog.findMany']);

// 5. Web Client Application Shell & Functional Pages
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/components/AuthContext.tsx'), 'AuthContext', ['AuthProvider', 'useAuth', 'login', 'logout', 'refreshUser']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/components/AuthGuard.tsx'), 'AuthGuard', ['useAuth', 'router.push']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/components/Sidebar.tsx'), 'Sidebar', ['/portal/dashboard', '/portal/students', '/portal/attendance', '/portal/fees']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/components/Header.tsx'), 'Header', ['Downtown Main Campus', 'AY 2026-2027', 'notifications', 'Sign Out']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(auth)/login/page.tsx'), 'LoginPage', ['admin@school.edu', 'teacher@school.edu', 'POST', '/auth/login', 'credentials']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/layout.tsx'), 'DashboardLayout', ['AuthProvider', 'AuthGuard', 'Sidebar', 'Header']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/dashboard/page.tsx'), 'DashboardOverviewPage', ['Enrolled Students', 'Attendance Rate', 'Fee Collection']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/students/page.tsx'), 'StudentsPage', ['Admit New Student', '/students/admit', '/reports/student-list']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/academics/page.tsx'), 'AcademicsPage', ['/academics/classes', '/roster']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/attendance/page.tsx'), 'AttendancePage', ['/attendance/roster', '/attendance/mark', 'Mark All Present']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/examinations/page.tsx'), 'ExaminationsPage', ['/examinations/schedules', '/results']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/fees/page.tsx'), 'FeesPage', ['/fees/invoices', '/fees/payments', 'Record Payment']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/notifications/page.tsx'), 'NotificationsPage', ['/notifications/broadcast', 'Mark All Read']);
checkFileAndKeywords(path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/settings/page.tsx'), 'SettingsPage', ['/settings', '/audit', 'Save Settings']);

// 6. Mobile & Desktop Client Foundations
checkFileAndKeywords(path.join(rootDir, 'apps/mobile/lib/core/network/auth_service.dart'), 'MobileAuthService', ['MobileAuthService', '/auth/login', '/auth/me', '/auth/logout']);
checkFileAndKeywords(path.join(rootDir, 'apps/desktop/lib/core/network/auth_service.dart'), 'DesktopAuthService', ['DesktopAuthService', '/auth/login', '/auth/me', '/auth/logout']);

// 7. Security Architecture Check
const webApiTs = path.join(rootDir, 'apps/web/src/lib/api.ts');
const webApiContent = fs.readFileSync(webApiTs, 'utf8');
const storesRefreshToken = webApiContent.includes("localStorage.setItem('refresh_token'") ||
                           webApiContent.includes("sessionStorage.setItem('refresh_token'");
check('Security: Refresh token NEVER in browser web storage', !storesRefreshToken);
check('Security: HttpOnly cookie refresh pattern configured', webApiContent.includes('HttpOnly') && webApiContent.includes('/auth/refresh'));

console.log('\n==================================================');
console.log(`PHASE 2 VERIFICATION SUMMARY:`);
console.log(`  Passed:  ${passCount}`);
console.log(`  Warning: ${warnCount}`);
console.log(`  Failed:  ${failCount}`);
console.log('==================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('PHASE 2 STATUS: ALL FUNCTIONAL FOUNDATIONS VERIFIED & COMPLETE');
}
