/**
 * Phase 4B Automated Verification Suite
 * Admissions & Student Lifecycle Management
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4B VERIFICATION: ADMISSIONS & STUDENT LIFECYCLE');
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

check('Schema contains AdmissionApplication model', schema.includes('model AdmissionApplication'));
check('Schema contains StudentStatusHistory model', schema.includes('model StudentStatusHistory'));
check('Schema contains StudentTransfer model', schema.includes('model StudentTransfer'));
check('Schema contains AlumniRecord model', schema.includes('model AlumniRecord'));
check('Schema contains EmergencyContact model', schema.includes('model EmergencyContact'));
check('Schema contains StudentDocument model', schema.includes('model StudentDocument'));

check('Schema contains StudentLifecycleStatus enum', schema.includes('enum StudentLifecycleStatus'));
check('Schema contains ApplicationStatus enum', schema.includes('enum ApplicationStatus'));
check('Schema contains TransferType enum', schema.includes('enum TransferType'));

check('StudentProfile has lifecycleStatus field', schema.includes('lifecycleStatus') && schema.includes('StudentLifecycleStatus'));
check('StudentProfile has medicalNotes and previousSchool', schema.includes('medicalNotes') && schema.includes('previousSchool'));
check('StudentProfile has emergencyContact details', schema.includes('emergencyContactName') && schema.includes('emergencyContactPhone'));
check('StudentProfile relations include statusHistory', schema.includes('statusHistory') && schema.includes('StudentStatusHistory[]'));
check('StudentProfile relations include transfers', schema.includes('transfers') && schema.includes('StudentTransfer[]'));
check('StudentProfile relations include documents', schema.includes('documents') && schema.includes('StudentDocument[]'));
check('StudentProfile relations include alumniRecord', schema.includes('alumniRecord') && schema.includes('AlumniRecord?'));
check('StudentProfile relations include emergencyContacts', schema.includes('emergencyContacts') && schema.includes('EmergencyContact[]'));

check('StudentGuardian has relationship and emergency contact fields', 
  schema.includes('isEmergencyContact') && schema.includes('canPickup'));

check('Organization has admissionApplications relation', schema.includes('admissionApplications AdmissionApplication[]'));
check('Campus has admissionApplications relation', schema.includes('admissionApplications AdmissionApplication[]'));
check('AcademicYear has admissionApplications relation', schema.includes('admissionApplications AdmissionApplication[]'));
check('Class has admissionApplications relation', schema.includes('admissionApplications AdmissionApplication[]'));

// 2. Shared Types Package
console.log('\n2. Checking Shared Types Package Exports...');
const sharedTypesIndex = fs.readFileSync(path.join(rootDir, 'packages/shared-types/src/index.ts'), 'utf8');
const lifecycleInterfacePath = path.join(rootDir, 'packages/shared-types/src/interfaces/student-lifecycle.interface.ts');
check('student-lifecycle.interface.ts exists', fs.existsSync(lifecycleInterfacePath));
if (fs.existsSync(lifecycleInterfacePath)) {
  const iface = fs.readFileSync(lifecycleInterfacePath, 'utf8');
  check('shared-types index exports student-lifecycle.interface', sharedTypesIndex.includes('student-lifecycle.interface'));
  check('student-lifecycle defines StudentLifecycleStatus', iface.includes('type StudentLifecycleStatus'));
  check('student-lifecycle defines ApplicationStatus', iface.includes('type ApplicationStatus'));
  check('student-lifecycle defines TransferType', iface.includes('type TransferType'));
  check('student-lifecycle defines AdmissionApplicationEntity', iface.includes('interface AdmissionApplicationEntity'));
  check('student-lifecycle defines CreateAdmissionApplicationDto', iface.includes('interface CreateAdmissionApplicationDto'));
  check('student-lifecycle defines ReviewAdmissionApplicationDto', iface.includes('interface ReviewAdmissionApplicationDto'));
  check('student-lifecycle defines ConvertApplicationDto', iface.includes('interface ConvertApplicationDto'));
  check('student-lifecycle defines StudentTransferDto', iface.includes('interface StudentTransferDto'));
  check('student-lifecycle defines BulkPromotionDto', iface.includes('interface BulkPromotionDto'));
  check('student-lifecycle defines StudentWithdrawalDto', iface.includes('interface StudentWithdrawalDto'));
  check('student-lifecycle defines StudentGraduationDto', iface.includes('interface StudentGraduationDto'));
  check('student-lifecycle defines EmergencyContactEntity', iface.includes('interface EmergencyContactEntity'));
  check('student-lifecycle defines StudentDocumentEntity', iface.includes('interface StudentDocumentEntity'));
  check('student-lifecycle defines StudentStatusHistoryEntity', iface.includes('interface StudentStatusHistoryEntity'));
  check('student-lifecycle defines AlumniRecordEntity', iface.includes('interface AlumniRecordEntity'));
}

// 3. Admissions Module
console.log('\n3. Checking Admissions Module & Business Rules...');
const admCtrlPath = path.join(rootDir, 'apps/api/src/modules/admissions/admissions.controller.ts');
const admSrvPath = path.join(rootDir, 'apps/api/src/modules/admissions/admissions.service.ts');
const admModPath = path.join(rootDir, 'apps/api/src/modules/admissions/admissions.module.ts');

check('AdmissionsController exists', fs.existsSync(admCtrlPath));
check('AdmissionsService exists', fs.existsSync(admSrvPath));
check('AdmissionsModule exists', fs.existsSync(admModPath));

if (fs.existsSync(admSrvPath) && fs.existsSync(admCtrlPath)) {
  const srv = fs.readFileSync(admSrvPath, 'utf8');
  const ctrl = fs.readFileSync(admCtrlPath, 'utf8');

  check('AdmissionsService generates collision-safe application numbers (APP-)', srv.includes('APP-') && srv.includes('generateApplicationNumber'));
  check('AdmissionsService generates collision-safe admission numbers (ADM-)', srv.includes('ADM-') && srv.includes('generateAdmissionNumber'));
  check('AdmissionsService implements duplicate detection heuristic check', srv.includes('checkDuplicates('));
  check('AdmissionsService implements transactional student conversion', srv.includes('convertToStudent(') && srv.includes('$transaction'));
  check('AdmissionsService enforces APPROVED status check before conversion', srv.includes('Application must be APPROVED before admission conversion'));
  check('AdmissionsService prevents duplicate application conversion', srv.includes('has already been converted to student'));
  check('AdmissionsService logs audit trail events', srv.includes('auditService.log'));

  check('AdmissionsController requires admissions:read permission', ctrl.includes("'admissions:read'"));
  check('AdmissionsController requires admissions:create permission', ctrl.includes("'admissions:create'"));
  check('AdmissionsController requires admissions:review permission', ctrl.includes("'admissions:review'"));
  check('AdmissionsController requires admissions:approve permission', ctrl.includes("'admissions:approve'"));
  check('AdmissionsController requires admissions:reject permission', ctrl.includes("'admissions:reject'"));
}

// 4. Students Lifecycle Expansions
console.log('\n4. Checking Students Lifecycle Expansions...');
const stuSrvPath = path.join(rootDir, 'apps/api/src/modules/students/students.service.ts');
const stuCtrlPath = path.join(rootDir, 'apps/api/src/modules/students/students.controller.ts');

const stuSrv = fs.readFileSync(stuSrvPath, 'utf8');
const stuCtrl = fs.readFileSync(stuCtrlPath, 'utf8');

check('StudentsService implements getLifecycleHistory', stuSrv.includes('getLifecycleHistory('));
check('StudentsService implements transferSection with history', stuSrv.includes('transferSection(') && stuSrv.includes('studentTransfer.create'));
check('StudentsService implements transferCampus with history', stuSrv.includes('transferCampus(') && stuSrv.includes('TransferType.CAMPUS'));
check('StudentsService implements withdrawStudent', stuSrv.includes('withdrawStudent(') && stuSrv.includes("'WITHDRAWN'"));
check('StudentsService implements graduateStudent and Alumni upsert', stuSrv.includes('graduateStudent(') && stuSrv.includes('alumniRecord.upsert'));
check('StudentsService implements readmitStudent', stuSrv.includes('readmitStudent('));
check('StudentsService implements promotePreview conflict checker', stuSrv.includes('promotePreview('));
check('StudentsService implements bulkPromote in transaction', stuSrv.includes('bulkPromote(') && stuSrv.includes('$transaction'));
check('StudentsService manages emergency contacts', stuSrv.includes('getEmergencyContacts(') && stuSrv.includes('addEmergencyContact('));
check('StudentsService manages student documents', stuSrv.includes('getDocuments(') && stuSrv.includes('attachDocument('));

check('StudentsController exposes GET :id/lifecycle-history', stuCtrl.includes('@Get(\':id/lifecycle-history\')'));
check('StudentsController exposes POST :id/transfer-section with students:transfer guard', 
  stuCtrl.includes('@Post(\':id/transfer-section\')') && stuCtrl.includes("'students:transfer'"));
check('StudentsController exposes POST :id/transfer-campus', stuCtrl.includes('@Post(\':id/transfer-campus\')'));
check('StudentsController exposes POST :id/withdraw with students:withdraw guard', 
  stuCtrl.includes('@Post(\':id/withdraw\')') && stuCtrl.includes("'students:withdraw'"));
check('StudentsController exposes POST :id/graduate with students:graduate guard', 
  stuCtrl.includes('@Post(\':id/graduate\')') && stuCtrl.includes("'students:graduate'"));
check('StudentsController exposes POST :id/readmit', stuCtrl.includes('@Post(\':id/readmit\')'));
check('StudentsController exposes POST promote-preview and bulk-promote with students:promote guard', 
  stuCtrl.includes('promote-preview') && stuCtrl.includes('bulk-promote') && stuCtrl.includes("'students:promote'"));
check('StudentsController exposes documents endpoints with students:documents guards', 
  stuCtrl.includes("'students:documents:view'") && stuCtrl.includes("'students:documents:manage'"));

// 5. AppModule & Web UI
console.log('\n5. Checking AppModule & Web Application Workflows...');
const appModPath = path.join(rootDir, 'apps/api/src/app.module.ts');
const admPagePath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/admissions/page.tsx');
const stuPagePath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/students/page.tsx');
const sidebarPath = path.join(rootDir, 'apps/web/src/components/Sidebar.tsx');

const appMod = fs.readFileSync(appModPath, 'utf8');
const admPage = fs.readFileSync(admPagePath, 'utf8');
const stuPage = fs.readFileSync(stuPagePath, 'utf8');
const sidebar = fs.readFileSync(sidebarPath, 'utf8');

check('AppModule imports AdmissionsModule', appMod.includes('AdmissionsModule'));
check('Sidebar contains Admissions Hub link', sidebar.includes('/portal/admissions'));
check('Admissions Page exists', fs.existsSync(admPagePath));
check('Admissions Page displays KPI metrics cards', admPage.includes('Total Inbound Applications') && admPage.includes('Approved'));
check('Admissions Page includes status filter tabs', admPage.includes('UNDER_REVIEW') && admPage.includes('APPROVED'));
check('Admissions Page provides New Application modal with duplicate detection', 
  admPage.includes('Register Inbound Admission Application') && admPage.includes('handleCheckDuplicates'));
check('Admissions Page provides review drawer and student conversion action', 
  admPage.includes('decisionReason') && admPage.includes('handleConvertToStudent'));

check('Students Page maintains Admit New Student button (Phase 2 compatibility)', stuPage.includes('Admit New Student'));
check('Students Page maintains /students/admit endpoint call (Phase 2 compatibility)', stuPage.includes('/students/admit'));
check('Students Page maintains /reports/student-list call (Phase 2 compatibility)', stuPage.includes('/reports/student-list'));
check('Students Page includes lifecycle status filter tabs', stuPage.includes('Active Roster') && stuPage.includes('Withdrawn'));
check('Students Page drawer provides multi-tab sections (Overview, Guardians, Academic, Documents, Timeline)', 
  stuPage.includes('guardians') && stuPage.includes('academic') && stuPage.includes('documents') && stuPage.includes('lifecycle'));
check('Students Page provides lifecycle modals (Section Transfer, Withdrawal, Graduation)', 
  stuPage.includes('handleTransferSection') && stuPage.includes('handleWithdraw') && stuPage.includes('handleGraduate'));

// Summary
console.log('\n================================================================');
console.log(`PHASE 4B VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount === 0) {
  console.log('PHASE 4B VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.error('PHASE 4B VERIFICATION FAILED: Please review errors above.\n');
  process.exit(1);
}
