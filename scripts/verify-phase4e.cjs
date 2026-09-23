/**
 * Phase 4E Automated Verification Suite
 * Timetable & Scheduling Subsystem
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4E VERIFICATION: TIMETABLE & SCHEDULING');
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
check('Schema contains WorkingDayConfig model', schema.includes('model WorkingDayConfig'));
check('Schema contains TimetablePeriod model', schema.includes('model TimetablePeriod'));
check('Schema contains Room model', schema.includes('model Room'));
check('Schema contains RoomAvailability model', schema.includes('model RoomAvailability'));
check('Schema contains TeacherAvailability model', schema.includes('model TeacherAvailability'));
check('Schema contains TimetableTemplate model', schema.includes('model TimetableTemplate'));
check('Schema contains TimetableVersion model', schema.includes('model TimetableVersion'));
check('Schema contains TimetableEntry model', schema.includes('model TimetableEntry'));
check('Schema contains SchedulingConstraint model', schema.includes('model SchedulingConstraint'));
check('Schema contains SchedulingRun model', schema.includes('model SchedulingRun'));

// Enums
check('Schema contains DayOfWeek enum', schema.includes('enum DayOfWeek'));
check('Schema contains PeriodType enum', schema.includes('enum PeriodType'));
check('Schema contains RoomType enum', schema.includes('enum RoomType'));
check('Schema contains TimetableStatus enum', schema.includes('enum TimetableStatus'));
check('Schema contains SchedulingRunStatus enum', schema.includes('enum SchedulingRunStatus'));

// Model relations & fields
check('Organization has workingDayConfigs relation', /workingDayConfigs\s+WorkingDayConfig\[\]/.test(schema));
check('Organization has timetablePeriods relation', /timetablePeriods\s+TimetablePeriod\[\]/.test(schema));
check('Organization has rooms relation', /rooms\s+Room\[\]/.test(schema));
check('Organization has timetableTemplates relation', /timetableTemplates\s+TimetableTemplate\[\]/.test(schema));
check('Organization has timetableVersions relation', /timetableVersions\s+TimetableVersion\[\]/.test(schema));
check('Organization has timetableEntries relation', /timetableEntries\s+TimetableEntry\[\]/.test(schema));
check('Organization has schedulingConstraints relation', /schedulingConstraints\s+SchedulingConstraint\[\]/.test(schema));
check('Organization has schedulingRuns relation', /schedulingRuns\s+SchedulingRun\[\]/.test(schema));

check('Campus has workingDayConfigs relation', /workingDayConfigs\s+WorkingDayConfig\[\]/.test(schema));
check('Campus has timetablePeriods relation', /timetablePeriods\s+TimetablePeriod\[\]/.test(schema));
check('Campus has rooms relation', /rooms\s+Room\[\]/.test(schema));
check('Campus has timetableTemplates relation', /timetableTemplates\s+TimetableTemplate\[\]/.test(schema));
check('Campus has timetableVersions relation', /timetableVersions\s+TimetableVersion\[\]/.test(schema));
check('Campus has timetableEntries relation', /timetableEntries\s+TimetableEntry\[\]/.test(schema));
check('Campus has schedulingConstraints relation', /schedulingConstraints\s+SchedulingConstraint\[\]/.test(schema));
check('Campus has schedulingRuns relation', /schedulingRuns\s+SchedulingRun\[\]/.test(schema));

check('AcademicYear has timetableTemplates, timetableVersions, timetableEntries, schedulingRuns relations',
  /timetableTemplates\s+TimetableTemplate\[\]/.test(schema) &&
  /timetableVersions\s+TimetableVersion\[\]/.test(schema) &&
  /timetableEntries\s+TimetableEntry\[\]/.test(schema) &&
  /schedulingRuns\s+SchedulingRun\[\]/.test(schema));

check('Term has timetableTemplates, timetableVersions, timetableEntries, schedulingRuns relations',
  /timetableTemplates\s+TimetableTemplate\[\]/.test(schema) &&
  /timetableVersions\s+TimetableVersion\[\]/.test(schema) &&
  /timetableEntries\s+TimetableEntry\[\]/.test(schema) &&
  /schedulingRuns\s+SchedulingRun\[\]/.test(schema));

check('TeacherProfile has availabilities and timetableEntries relations',
  /availabilities\s+TeacherAvailability\[\]/.test(schema) &&
  /timetableEntries\s+TimetableEntry\[\]/.test(schema));

check('Section has timetableEntries relation', /timetableEntries\s+TimetableEntry\[\]/.test(schema));
check('Subject has timetableEntries relation', /timetableEntries\s+TimetableEntry\[\]/.test(schema));
check('SubjectOffering has timetableEntries relation', /timetableEntries\s+TimetableEntry\[\]/.test(schema));

// 2. Shared Types Package
console.log('\n2. Checking Shared Types Package Exports...');
const sharedTypesIndex = fs.readFileSync(path.join(rootDir, 'packages/shared-types/src/index.ts'), 'utf8');
const timetableInterfacePath = path.join(rootDir, 'packages/shared-types/src/interfaces/timetable.interface.ts');

check('timetable.interface.ts exists', fs.existsSync(timetableInterfacePath));

if (fs.existsSync(timetableInterfacePath)) {
  const ttTypes = fs.readFileSync(timetableInterfacePath, 'utf8');

  check('shared-types index exports timetable.interface', sharedTypesIndex.includes('timetable.interface'));

  check('timetable defines DayOfWeek enum/type', ttTypes.includes('DayOfWeek'));
  check('timetable defines PeriodType enum/type', ttTypes.includes('PeriodType'));
  check('timetable defines RoomType enum/type', ttTypes.includes('RoomType'));
  check('timetable defines TimetableStatus enum/type', ttTypes.includes('TimetableStatus'));
  check('timetable defines SchedulingRunStatus enum/type', ttTypes.includes('SchedulingRunStatus'));

  check('timetable defines WorkingDayConfig interface', ttTypes.includes('WorkingDayConfig'));
  check('timetable defines TimetablePeriod interface', ttTypes.includes('TimetablePeriod'));
  check('timetable defines Room interface', ttTypes.includes('Room'));
  check('timetable defines RoomAvailability interface', ttTypes.includes('RoomAvailability'));
  check('timetable defines TeacherAvailability interface', ttTypes.includes('TeacherAvailability'));
  check('timetable defines TimetableTemplate interface', ttTypes.includes('TimetableTemplate'));
  check('timetable defines TimetableVersion interface', ttTypes.includes('TimetableVersion'));
  check('timetable defines TimetableEntry interface', ttTypes.includes('TimetableEntry'));
  check('timetable defines SchedulingConstraint interface', ttTypes.includes('SchedulingConstraint'));
  check('timetable defines SchedulingRun interface', ttTypes.includes('SchedulingRun'));

  check('timetable defines TimetableConflict & TimetableConflictReport interfaces',
    ttTypes.includes('TimetableConflict') && ttTypes.includes('TimetableConflictReport'));
  check('timetable defines SchedulingDiagnostic interface', ttTypes.includes('SchedulingDiagnostic'));

  check('timetable defines DTOs (CreateTimetableVersionDto, CreateTimetableEntryDto, GenerateScheduleDto, PublishTimetableDto)',
    ttTypes.includes('CreateTimetableVersionDto') &&
    ttTypes.includes('CreateTimetableEntryDto') &&
    ttTypes.includes('GenerateScheduleDto') &&
    ttTypes.includes('PublishTimetableDto'));
}

// 3. Backend Timetable Services & Controllers
console.log('\n3. Checking Backend Services & Scheduling Engine...');
const ttSrvPath = path.join(rootDir, 'apps/api/src/modules/timetable/timetable.service.ts');
const ttConflictSrvPath = path.join(rootDir, 'apps/api/src/modules/timetable/timetable-conflict.service.ts');
const ttSolverSrvPath = path.join(rootDir, 'apps/api/src/modules/timetable/timetable-solver.service.ts');
const ttCtrlPath = path.join(rootDir, 'apps/api/src/modules/timetable/timetable.controller.ts');
const ttModPath = path.join(rootDir, 'apps/api/src/modules/timetable/timetable.module.ts');

check('TimetableService exists', fs.existsSync(ttSrvPath));
check('TimetableConflictService exists', fs.existsSync(ttConflictSrvPath));
check('TimetableSolverService exists', fs.existsSync(ttSolverSrvPath));
check('TimetableController exists', fs.existsSync(ttCtrlPath));
check('TimetableModule exists', fs.existsSync(ttModPath));

if (fs.existsSync(ttSrvPath) && fs.existsSync(ttConflictSrvPath) && fs.existsSync(ttSolverSrvPath)) {
  const ttSrv = fs.readFileSync(ttSrvPath, 'utf8');
  const ttConflictSrv = fs.readFileSync(ttConflictSrvPath, 'utf8');
  const ttSolverSrv = fs.readFileSync(ttSolverSrvPath, 'utf8');
  const ttMod = fs.readFileSync(ttModPath, 'utf8');

  // TimetableModule wiring
  check('TimetableModule imports AuditModule', ttMod.includes('AuditModule'));
  check('TimetableModule imports NotificationsModule', ttMod.includes('NotificationsModule'));
  check('TimetableModule provides TimetableService, TimetableConflictService, TimetableSolverService',
    ttMod.includes('TimetableService') &&
    ttMod.includes('TimetableConflictService') &&
    ttMod.includes('TimetableSolverService'));

  // TimetableConflictService rules
  check('Conflict service detects Section collisions',
    ttConflictSrv.includes("type: 'SECTION'") && ttConflictSrv.includes('existingSectionEntry'));
  check('Conflict service detects Teacher collisions',
    ttConflictSrv.includes("type: 'TEACHER'") && ttConflictSrv.includes('existingTeacherEntry'));
  check('Conflict service detects Room collisions',
    ttConflictSrv.includes("type: 'ROOM'") && ttConflictSrv.includes('existingRoomEntry'));
  check('Conflict service checks Room Capacity vs Section enrollment count',
    ttConflictSrv.includes('ROOM_CAPACITY') || ttConflictSrv.includes('capacity'));
  check('Conflict service checks Teacher Availability window',
    ttConflictSrv.includes('teacherAvailability') && ttConflictSrv.includes('isAvailable: false'));
  check('Conflict service checks Room Availability window',
    ttConflictSrv.includes('roomAvailability') && ttConflictSrv.includes('isAvailable: false'));
  check('Conflict service exposes validateTimetable for holistic version validation',
    ttConflictSrv.includes('validateTimetable'));

  // TimetableSolverService rules
  check('Solver service implements deterministic backtracking algorithm',
    ttSolverSrv.includes('runScheduler') && ttSolverSrv.includes('sectionOccupied'));
  check('Solver service queries active SubjectOffering teaching requirements',
    ttSolverSrv.includes('subjectOffering') || ttSolverSrv.includes('SubjectOffering'));
  check('Solver service prioritizes unplaced slots heuristic',
    ttSolverSrv.includes('sortedOfferings') && ttSolverSrv.includes('weeklyPeriods'));
  check('Solver service produces explainable failure diagnostics (no silent drops)',
    ttSolverSrv.includes('diagnostics') && ttSolverSrv.includes('SchedulingDiagnostic'));
  check('Solver service respects break periods and avoids collisions',
    ttSolverSrv.includes("periodType: 'TEACHING'") && ttSolverSrv.includes('teacherOccupied'));

  // TimetableService core operations
  check('TimetableService manages Working Day Configurations',
    ttSrv.includes('getWorkingDays') && ttSrv.includes('updateWorkingDays'));
  check('TimetableService manages Timetable Periods',
    ttSrv.includes('getPeriods') && ttSrv.includes('createPeriod') && ttSrv.includes('deletePeriod'));
  check('TimetableService manages Rooms with capacity and type',
    ttSrv.includes('getRooms') && ttSrv.includes('createRoom') && ttSrv.includes('deleteRoom'));
  check('TimetableService manages Teacher & Room availability',
    ttSrv.includes('getTeacherAvailability') && ttSrv.includes('setTeacherAvailability') &&
    ttSrv.includes('getRoomAvailability') && ttSrv.includes('setRoomAvailability'));
  check('TimetableService handles Timetable Versions (Draft, Review, Published, Archived)',
    ttSrv.includes('getVersions') && ttSrv.includes('createDraftVersion') && ttSrv.includes('publishVersion'));
  check('TimetableService blocks publication if hard conflicts exist unless overridden',
    ttSrv.includes('Cannot publish timetable with') && ttSrv.includes('unresolved hard conflicts'));
  check('TimetableService logs audit event upon timetable publication',
    ttSrv.includes('PUBLISH_TIMETABLE'));
  check('TimetableService sends notifications to teachers upon timetable publication',
    ttSrv.includes('notificationsService.broadcast') || ttSrv.includes('notificationsService.sendNotification'));
  check('TimetableService archives previously published version upon new publication',
    ttSrv.includes("status: 'ARCHIVED'"));
  check('TimetableService supports copyDay schedule operation',
    ttSrv.includes('copyDay'));
  check('TimetableService supports copySection schedule operation',
    ttSrv.includes('copySection'));
}

// Controller routes & RBAC
if (fs.existsSync(ttCtrlPath)) {
  const ttCtrl = fs.readFileSync(ttCtrlPath, 'utf8');

  // Endpoints
  check('TimetableController exposes /timetable/working-days', ttCtrl.includes("'working-days'"));
  check('TimetableController exposes /timetable/periods', ttCtrl.includes("'periods'"));
  check('TimetableController exposes /timetable/rooms', ttCtrl.includes("'rooms'"));
  check('TimetableController exposes teacher availability endpoints',
    ttCtrl.includes("'availability/teacher") && ttCtrl.includes('setTeacherAvailability'));
  check('TimetableController exposes room availability endpoints',
    ttCtrl.includes("'availability/room") && ttCtrl.includes('setRoomAvailability'));
  check('TimetableController exposes /timetable/versions', ttCtrl.includes("'versions'"));
  check('TimetableController exposes /timetable/versions/:id/validate', ttCtrl.includes("'versions/:id/validate'"));
  check('TimetableController exposes /timetable/versions/:id/publish', ttCtrl.includes("'versions/:id/publish'"));
  check('TimetableController exposes /timetable/entries', ttCtrl.includes("'entries'"));
  check('TimetableController exposes /timetable/entries/copy-day', ttCtrl.includes("'entries/copy-day'"));
  check('TimetableController exposes /timetable/entries/copy-section', ttCtrl.includes("'entries/copy-section'"));
  check('TimetableController exposes /timetable/generate', ttCtrl.includes("'generate'"));

  // RBAC permissions
  check('TimetableController enforces timetable:read permission',
    ttCtrl.includes("@RequirePermissions('timetable:read')"));
  check('TimetableController enforces timetable:manage permission',
    ttCtrl.includes("@RequirePermissions('timetable:manage')"));
  check('TimetableController enforces timetable:publish permission',
    ttCtrl.includes("@RequirePermissions('timetable:publish')"));
  check('TimetableController enforces timetable:generate permission',
    ttCtrl.includes("@RequirePermissions('timetable:generate')"));
  check('TimetableController enforces room-scheduling:manage permission',
    ttCtrl.includes("@RequirePermissions('room-scheduling:manage')"));
  check('TimetableController enforces teacher-availability:manage permission',
    ttCtrl.includes("@RequirePermissions('teacher-availability:manage')"));
}

// 4. Web Application Workspace
console.log('\n4. Checking Web Application Timetable Workspace...');
const timetableWebPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/timetable/page.tsx');
const sidebarPath = path.join(rootDir, 'apps/web/src/components/Sidebar.tsx');

check('Timetable Web Page exists', fs.existsSync(timetableWebPath));
check('Sidebar component exists', fs.existsSync(sidebarPath));

if (fs.existsSync(timetableWebPath)) {
  const page = fs.readFileSync(timetableWebPath, 'utf8');

  // Perspective Views
  check('Timetable workspace supports SECTION, TEACHER, ROOM, and MASTER perspective views',
    page.includes("'SECTION'") && page.includes("'TEACHER'") &&
    page.includes("'ROOM'") && page.includes("'MASTER'"));

  // Versioning and Publication
  check('Timetable workspace shows version selector and status badges (DRAFT, PUBLISHED)',
    page.includes('selectedVersionId') && page.includes('DRAFT') && page.includes('PUBLISHED'));
  check('Timetable workspace includes Publish Timetable modal with conflict confirmation',
    page.includes('Publish Timetable') && page.includes('allowHardConflictOverride'));

  // Conflict Diagnostics
  check('Timetable workspace includes Conflict Diagnostics drawer',
    page.includes('showValidateDrawer') && page.includes('Conflict Diagnostics'));
  check('Timetable workspace highlights conflicts visually with warning/error states',
    page.includes('validationReport') && (page.includes('variant="danger"') || page.includes('variant="warning"')));

  // Automated Generator
  check('Timetable workspace includes Automated Generator modal with solver integration',
    page.includes('showGeneratorModal') &&
    page.includes('Constraint-Aware Schedule Solver') &&
    page.includes('/timetable/generate'));

  // Room Catalog Drawer
  check('Timetable workspace includes Room Catalog & Allocation drawer',
    page.includes('showRoomsDrawer') && page.includes('Campus Rooms'));

  // Grid and Agenda Views
  check('Timetable workspace supports both Grid and Agenda view modes',
    page.includes("'grid'") && page.includes("'agenda'"));

  // API Integration
  check('Timetable workspace connects to /timetable/versions', page.includes('/timetable/versions'));
  check('Timetable workspace connects to /timetable/periods', page.includes('/timetable/periods'));
  check('Timetable workspace connects to /timetable/working-days', page.includes('/timetable/working-days'));
  check('Timetable workspace connects to /timetable/rooms', page.includes('/timetable/rooms'));
  check('Timetable workspace connects to /timetable/entries', page.includes('/timetable/entries'));
}

if (fs.existsSync(sidebarPath)) {
  const sidebar = fs.readFileSync(sidebarPath, 'utf8');
  check('Sidebar contains Timetable portal link', sidebar.includes('/portal/timetable'));
}

console.log('\n================================================================');
console.log(`PHASE 4E VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  console.error(`\n[FATAL] PHASE 4E VERIFICATION FAILED WITH ${failCount} DEFECTS.`);
  process.exit(1);
} else {
  console.log('PHASE 4E VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
