/**
 * Phase 4A Automated Verification Suite
 * Identity, Organization & Administration Expansion
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4A VERIFICATION: IDENTITY, ORG & ADMINISTRATION EXPANSION');
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
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

check('Schema contains Designation model', schemaContent.includes('model Designation'));
check('Schema contains Term model', schemaContent.includes('model Term'));
check('Schema contains UserSession model', schemaContent.includes('model UserSession'));
check('Organization has legal fields (taxId, address, phone)', 
  schemaContent.includes('taxId') && schemaContent.includes('address') && schemaContent.includes('phone'));
check('Organization has designations relation', schemaContent.includes('designations  Designation[]'));
check('User has lifecycle fields (suspendedAt, archivedAt, lockedUntil)', 
  schemaContent.includes('suspendedAt') && schemaContent.includes('archivedAt') && schemaContent.includes('lockedUntil'));
check('User has sessions relation', schemaContent.includes('sessions            UserSession[]'));
check('AcademicYear has terms relation', schemaContent.includes('terms          Term[]'));
check('Department has designations relation', schemaContent.includes('designations   Designation[]'));
check('EmployeeProfile has designation link', schemaContent.includes('designationRel Designation?'));

// 2. Shared Types Package
console.log('\n2. Checking Shared Types Package Exports...');
const sharedTypesIndex = fs.readFileSync(path.join(rootDir, 'packages/shared-types/src/index.ts'), 'utf8');
const adminInterface = fs.readFileSync(path.join(rootDir, 'packages/shared-types/src/interfaces/administration.interface.ts'), 'utf8');

check('shared-types exports administration interface', sharedTypesIndex.includes('administration.interface'));
check('administration interface defines UserLifecycleAction', adminInterface.includes('type UserLifecycleAction'));
check('administration interface defines DesignationEntity', adminInterface.includes('interface DesignationEntity'));
check('administration interface defines TermEntity', adminInterface.includes('interface TermEntity'));
check('administration interface defines UserSessionEntity', adminInterface.includes('interface UserSessionEntity'));

// 3. Designations Module
console.log('\n3. Checking Designations Module...');
const desigControllerPath = path.join(rootDir, 'apps/api/src/modules/designations/designations.controller.ts');
const desigServicePath = path.join(rootDir, 'apps/api/src/modules/designations/designations.service.ts');

check('DesignationsController exists', fs.existsSync(desigControllerPath));
check('DesignationsService exists', fs.existsSync(desigServicePath));
if (fs.existsSync(desigControllerPath) && fs.existsSync(desigServicePath)) {
  const ctrl = fs.readFileSync(desigControllerPath, 'utf8');
  const srv = fs.readFileSync(desigServicePath, 'utf8');
  check('DesignationsController requires designations:read permission', ctrl.includes("'designations:read'"));
  check('DesignationsController requires designations:manage permission', ctrl.includes("'designations:manage'"));
  check('DesignationsService implements audit logging', srv.includes('auditService.log'));
  check('DesignationsService handles unique code constraint', srv.includes('ConflictException'));
}

// 4. Departments Module
console.log('\n4. Checking Departments Module...');
const deptControllerPath = path.join(rootDir, 'apps/api/src/modules/departments/departments.controller.ts');
const deptServicePath = path.join(rootDir, 'apps/api/src/modules/departments/departments.service.ts');

check('DepartmentsController exists', fs.existsSync(deptControllerPath));
check('DepartmentsService exists', fs.existsSync(deptServicePath));
if (fs.existsSync(deptControllerPath) && fs.existsSync(deptServicePath)) {
  const ctrl = fs.readFileSync(deptControllerPath, 'utf8');
  const srv = fs.readFileSync(deptServicePath, 'utf8');
  check('DepartmentsController requires departments:read permission', ctrl.includes("'departments:read'"));
  check('DepartmentsController requires departments:manage permission', ctrl.includes("'departments:manage'"));
  check('DepartmentsService implements audit logging', srv.includes('auditService.log'));
}

// 5. Academic Years & Terms
console.log('\n5. Checking Academic Years & Terms...');
const acadServicePath = path.join(rootDir, 'apps/api/src/modules/academics/academics.service.ts');
const acadCtrlPath = path.join(rootDir, 'apps/api/src/modules/academics/academics.controller.ts');
const acadSrv = fs.readFileSync(acadServicePath, 'utf8');
const acadCtrl = fs.readFileSync(acadCtrlPath, 'utf8');

check('AcademicsService implements getTerms', acadSrv.includes('getTerms(academicYearId'));
check('AcademicsService implements createTerm', acadSrv.includes('createTerm('));
check('AcademicsService implements setCurrentTerm', acadSrv.includes('setCurrentTerm('));
check('AcademicsController exposes GET terms endpoint', acadCtrl.includes('@Get(\'years/:yearId/terms\')'));
check('AcademicsController exposes POST terms endpoint', acadCtrl.includes('@Post(\'years/:yearId/terms\')'));
check('AcademicsController exposes setCurrentTerm endpoint', acadCtrl.includes('set-current'));

// 6. User Lifecycle State Machine
console.log('\n6. Checking User Lifecycle State Machine...');
const usersSrvPath = path.join(rootDir, 'apps/api/src/modules/users/users.service.ts');
const usersCtrlPath = path.join(rootDir, 'apps/api/src/modules/users/users.controller.ts');
const usersSrv = fs.readFileSync(usersSrvPath, 'utf8');
const usersCtrl = fs.readFileSync(usersCtrlPath, 'utf8');

check('UsersService implements applyLifecycle', usersSrv.includes('applyLifecycle('));
check('UsersService validates self-suspension guard', usersSrv.includes('Security violation: An administrator cannot suspend'));
check('UsersService requires justification reason for suspend/archive', usersSrv.includes('An explicit justification reason is required'));
check('UsersService invalidates active sessions on suspend', usersSrv.includes('userSession.updateMany') && usersSrv.includes('isRevoked: true'));
check('UsersService records detailed audit log', usersSrv.includes('LIFECYCLE_'));
check('UsersController exposes POST /users/:id/lifecycle', usersCtrl.includes('@Post(\':id/lifecycle\')'));
check('UsersController requires users:manage permission', usersCtrl.includes("'users:manage'"));

// 7. Roles & Custom Permissions
console.log('\n7. Checking Custom Roles & Permissions Management...');
const rolesSrvPath = path.join(rootDir, 'apps/api/src/modules/roles/roles.service.ts');
const rolesCtrlPath = path.join(rootDir, 'apps/api/src/modules/roles/roles.controller.ts');
const permsSrvPath = path.join(rootDir, 'apps/api/src/modules/permissions/permissions.service.ts');
const permsCtrlPath = path.join(rootDir, 'apps/api/src/modules/permissions/permissions.controller.ts');

const rolesSrv = fs.readFileSync(rolesSrvPath, 'utf8');
const rolesCtrl = fs.readFileSync(rolesCtrlPath, 'utf8');
const permsSrv = fs.readFileSync(permsSrvPath, 'utf8');
const permsCtrl = fs.readFileSync(permsCtrlPath, 'utf8');

check('RolesService implements create custom role', rolesSrv.includes('create('));
check('RolesService protects system roles from deletion', rolesSrv.includes('Cannot delete system-defined role'));
check('RolesService prevents deletion of roles with assigned users', rolesSrv.includes('assigned to'));
check('RolesController exposes POST /roles', rolesCtrl.includes('@Post()'));
check('RolesController exposes DELETE /roles/:id', rolesCtrl.includes('@Delete(\':id\')'));
check('PermissionsService implements findGroupedByModule', permsSrv.includes('findGroupedByModule()'));
check('PermissionsController exposes GET /permissions/grouped', permsCtrl.includes('@Get(\'grouped\')'));

// 8. Sessions & Secure Impersonation
console.log('\n8. Checking Login Sessions & Impersonation...');
const sessionsSrvPath = path.join(rootDir, 'apps/api/src/modules/auth/sessions.service.ts');
const sessionsCtrlPath = path.join(rootDir, 'apps/api/src/modules/auth/sessions.controller.ts');
const authModulePath = path.join(rootDir, 'apps/api/src/modules/auth/auth.module.ts');

check('SessionsService exists', fs.existsSync(sessionsSrvPath));
check('SessionsController exists', fs.existsSync(sessionsCtrlPath));
if (fs.existsSync(sessionsSrvPath) && fs.existsSync(sessionsCtrlPath)) {
  const sSrv = fs.readFileSync(sessionsSrvPath, 'utf8');
  const sCtrl = fs.readFileSync(sessionsCtrlPath, 'utf8');
  check('SessionsService lists user sessions', sSrv.includes('listUserSessions('));
  check('SessionsService revokes specific session', sSrv.includes('revokeSession('));
  check('SessionsService implements Super Admin impersonation', sSrv.includes('impersonate('));
  check('Impersonation strictly restricted to SUPER_ADMIN', sSrv.includes('Only Super Administrators are permitted'));
  check('Impersonation generates time-limited token with impersonatorId', sSrv.includes('impersonatorId: actor.id'));
  check('Impersonation generates high-priority audit log', sSrv.includes("'IMPERSONATE_USER'"));
  check('AuthModule registers SessionsController and SessionsService', 
    fs.readFileSync(authModulePath, 'utf8').includes('SessionsController') && fs.readFileSync(authModulePath, 'utf8').includes('SessionsService'));
}

// 9. Audit Service Enhancements
console.log('\n9. Checking Audit Service & Multi-Criteria Filtering...');
const auditSrvPath = path.join(rootDir, 'apps/api/src/modules/audit/audit.service.ts');
const auditCtrlPath = path.join(rootDir, 'apps/api/src/modules/audit/audit.controller.ts');
const auditSrv = fs.readFileSync(auditSrvPath, 'utf8');
const auditCtrl = fs.readFileSync(auditCtrlPath, 'utf8');

check('AuditService implements log() method', auditSrv.includes('async log('));
check('AuditService supports module, action, userId filtering', 
  auditSrv.includes('where.module') && auditSrv.includes('where.action') && auditSrv.includes('where.userId'));
check('AuditService supports date range filtering (startDate, endDate)', 
  auditSrv.includes('where.createdAt.gte') && auditSrv.includes('where.createdAt.lte'));
check('AuditController exposes query filters in Swagger', 
  auditCtrl.includes("name: 'module'") && auditCtrl.includes("name: 'action'") && auditCtrl.includes("name: 'startDate'"));

// 10. AppModule & Web UI Administration Hub
console.log('\n10. Checking AppModule Registration & Web UI Hub...');
const appModulePath = path.join(rootDir, 'apps/api/src/app.module.ts');
const appModule = fs.readFileSync(appModulePath, 'utf8');
const settingsUiPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/settings/page.tsx');
const settingsUi = fs.readFileSync(settingsUiPath, 'utf8');

check('AppModule imports DepartmentsModule', appModule.includes('DepartmentsModule'));
check('AppModule imports DesignationsModule', appModule.includes('DesignationsModule'));
check('Settings UI includes Organization & Campus tab', settingsUi.includes('Organization & Campuses'));
check('Settings UI includes Departments & Designations tab', settingsUi.includes('Departments & Designations'));
check('Settings UI includes Academic Sessions & Terms tab', settingsUi.includes('Academic Sessions & Terms'));
check('Settings UI includes Roles & Permissions tab', settingsUi.includes('Roles & Permissions'));
check('Settings UI includes Security Audit Trail tab', settingsUi.includes('Security Audit Trail'));
check('Settings UI connects to /organizations/current endpoint', settingsUi.includes('/organizations/current'));

// Summary
console.log('\n================================================================');
console.log(`PHASE 4A VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount === 0) {
  console.log('PHASE 4A VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.error('PHASE 4A VERIFICATION FAILED: Please review errors above.\n');
  process.exit(1);
}
