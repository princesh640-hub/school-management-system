#!/usr/bin/env node
// =============================================================================
// Phase 4K: Hostel Management — Verification Script
// Run: node scripts/verify-phase4k.cjs
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
console.log('\n📋 PHASE 4K VERIFICATION — Hostel Management\n');

// =============================================================================
console.log('1. Prisma Schema — Hostel Enums');
// =============================================================================
const schema = readFile('apps/api/prisma/schema.prisma');

check('HostelStatus enum defined', has(schema, 'enum HostelStatus'));
check('HostelStatus: ACTIVE', has(schema, /enum HostelStatus[\s\S]*?ACTIVE/));
check('HostelStatus: INACTIVE', has(schema, /enum HostelStatus[\s\S]*?INACTIVE/));
check('HostelStatus: UNDER_MAINTENANCE', has(schema, /enum HostelStatus[\s\S]*?UNDER_MAINTENANCE/));
check('HostelStatus: CLOSED', has(schema, /enum HostelStatus[\s\S]*?CLOSED/));

check('HostelType enum defined', has(schema, 'enum HostelType'));
check('HostelType: BOYS', has(schema, /enum HostelType[\s\S]*?BOYS/));
check('HostelType: GIRLS', has(schema, /enum HostelType[\s\S]*?GIRLS/));
check('HostelType: COED', has(schema, /enum HostelType[\s\S]*?COED/));
check('HostelType: STAFF', has(schema, /enum HostelType[\s\S]*?STAFF/));

check('HostelRoomType enum defined', has(schema, 'enum HostelRoomType'));
check('HostelRoomType: DORMITORY', has(schema, /enum HostelRoomType[\s\S]*?DORMITORY/));
check('HostelRoomType: SHARED_ROOM', has(schema, /enum HostelRoomType[\s\S]*?SHARED_ROOM/));
check('HostelRoomType: SINGLE_ROOM', has(schema, /enum HostelRoomType[\s\S]*?SINGLE_ROOM/));
check('HostelRoomType: SPECIAL', has(schema, /enum HostelRoomType[\s\S]*?SPECIAL/));

check('HostelGenderEligibility enum defined', has(schema, 'enum HostelGenderEligibility'));
check('HostelGenderEligibility: MALE', has(schema, /enum HostelGenderEligibility[\s\S]*?MALE/));
check('HostelGenderEligibility: FEMALE', has(schema, /enum HostelGenderEligibility[\s\S]*?FEMALE/));
check('HostelGenderEligibility: ANY', has(schema, /enum HostelGenderEligibility[\s\S]*?ANY/));

check('HostelRoomStatus enum defined', has(schema, 'enum HostelRoomStatus'));
check('HostelRoomStatus: AVAILABLE', has(schema, /enum HostelRoomStatus[\s\S]*?AVAILABLE/));
check('HostelRoomStatus: FULL', has(schema, /enum HostelRoomStatus[\s\S]*?FULL/));
check('HostelRoomStatus: MAINTENANCE', has(schema, /enum HostelRoomStatus[\s\S]*?MAINTENANCE/));

check('HostelBedStatus enum defined', has(schema, 'enum HostelBedStatus'));
check('HostelBedStatus: AVAILABLE', has(schema, /enum HostelBedStatus[\s\S]*?AVAILABLE/));
check('HostelBedStatus: OCCUPIED', has(schema, /enum HostelBedStatus[\s\S]*?OCCUPIED/));
check('HostelBedStatus: RESERVED', has(schema, /enum HostelBedStatus[\s\S]*?RESERVED/));
check('HostelBedStatus: MAINTENANCE', has(schema, /enum HostelBedStatus[\s\S]*?MAINTENANCE/));
check('HostelBedStatus: BLOCKED', has(schema, /enum HostelBedStatus[\s\S]*?BLOCKED/));
check('HostelBedStatus: RETIRED', has(schema, /enum HostelBedStatus[\s\S]*?RETIRED/));

check('HostelAllocationStatus enum defined', has(schema, 'enum HostelAllocationStatus'));
check('HostelAllocationStatus: RESERVED', has(schema, /enum HostelAllocationStatus[\s\S]*?RESERVED/));
check('HostelAllocationStatus: ACTIVE', has(schema, /enum HostelAllocationStatus[\s\S]*?ACTIVE/));
check('HostelAllocationStatus: TRANSFERRED', has(schema, /enum HostelAllocationStatus[\s\S]*?TRANSFERRED/));
check('HostelAllocationStatus: CHECKED_OUT', has(schema, /enum HostelAllocationStatus[\s\S]*?CHECKED_OUT/));
check('HostelAllocationStatus: CANCELLED', has(schema, /enum HostelAllocationStatus[\s\S]*?CANCELLED/));

check('HostelAttendanceStatus enum defined', has(schema, 'enum HostelAttendanceStatus'));
check('HostelAttendanceStatus: PRESENT', has(schema, /enum HostelAttendanceStatus[\s\S]*?PRESENT/));
check('HostelAttendanceStatus: ABSENT', has(schema, /enum HostelAttendanceStatus[\s\S]*?ABSENT/));
check('HostelAttendanceStatus: OUT', has(schema, /enum HostelAttendanceStatus[\s\S]*?OUT/));
check('HostelAttendanceStatus: LATE', has(schema, /enum HostelAttendanceStatus[\s\S]*?LATE/));
check('HostelAttendanceStatus: EXCUSED', has(schema, /enum HostelAttendanceStatus[\s\S]*?EXCUSED/));

check('HostelStaffRole enum defined', has(schema, 'enum HostelStaffRole'));
check('HostelStaffRole: WARDEN', has(schema, /enum HostelStaffRole[\s\S]*?WARDEN/));
check('HostelStaffRole: ASSISTANT_WARDEN', has(schema, /enum HostelStaffRole[\s\S]*?ASSISTANT_WARDEN/));
check('HostelStaffRole: CARETAKER', has(schema, /enum HostelStaffRole[\s\S]*?CARETAKER/));
check('HostelStaffRole: SUPERVISOR', has(schema, /enum HostelStaffRole[\s\S]*?SUPERVISOR/));

check('HostelOutingStatus enum defined', has(schema, 'enum HostelOutingStatus'));
check('HostelOutingStatus: SUBMITTED', has(schema, /enum HostelOutingStatus[\s\S]*?SUBMITTED/));
check('HostelOutingStatus: APPROVED', has(schema, /enum HostelOutingStatus[\s\S]*?APPROVED/));
check('HostelOutingStatus: REJECTED', has(schema, /enum HostelOutingStatus[\s\S]*?REJECTED/));
check('HostelOutingStatus: OUT', has(schema, /enum HostelOutingStatus[\s\S]*?OUT/));
check('HostelOutingStatus: RETURNED', has(schema, /enum HostelOutingStatus[\s\S]*?RETURNED/));
check('HostelOutingStatus: LATE_RETURN', has(schema, /enum HostelOutingStatus[\s\S]*?LATE_RETURN/));

check('HostelOutingType enum defined', has(schema, 'enum HostelOutingType'));
check('HostelOutingType: DAY_OUTING', has(schema, /enum HostelOutingType[\s\S]*?DAY_OUTING/));
check('HostelOutingType: OVERNIGHT', has(schema, /enum HostelOutingType[\s\S]*?OVERNIGHT/));
check('HostelOutingType: WEEKEND', has(schema, /enum HostelOutingType[\s\S]*?WEEKEND/));
check('HostelOutingType: EMERGENCY', has(schema, /enum HostelOutingType[\s\S]*?EMERGENCY/));

check('HostelMaintenancePriority enum defined', has(schema, 'enum HostelMaintenancePriority'));
check('HostelMaintenancePriority: URGENT', has(schema, /enum HostelMaintenancePriority[\s\S]*?URGENT/));

check('HostelMaintenanceStatus enum defined', has(schema, 'enum HostelMaintenanceStatus'));
check('HostelMaintenanceStatus: OPEN', has(schema, /enum HostelMaintenanceStatus[\s\S]*?OPEN/));
check('HostelMaintenanceStatus: RESOLVED', has(schema, /enum HostelMaintenanceStatus[\s\S]*?RESOLVED/));

check('HostelVisitorStatus enum defined', has(schema, 'enum HostelVisitorStatus'));
check('HostelVisitorStatus: CHECKED_IN', has(schema, /enum HostelVisitorStatus[\s\S]*?CHECKED_IN/));

check('HostelIncidentStatus enum defined', has(schema, 'enum HostelIncidentStatus'));
check('HostelIncidentStatus: OPEN', has(schema, /enum HostelIncidentStatus[\s\S]*?OPEN/));
check('HostelIncidentStatus: RESOLVED', has(schema, /enum HostelIncidentStatus[\s\S]*?RESOLVED/));

// =============================================================================
console.log('\n2. Prisma Schema — Hostel Models');
// =============================================================================

check('model Hostel defined', has(schema, 'model Hostel {'));
check('Hostel: organizationId', has(schema, /model Hostel \{[\s\S]*?organizationId\s+String/));
check('Hostel: campusId', has(schema, /model Hostel \{[\s\S]*?campusId\s+String\?/));
check('Hostel: code unique', has(schema, /model Hostel \{[\s\S]*?code\s+String\s+@unique/));
check('Hostel: hostelType HostelType', has(schema, /model Hostel \{[\s\S]*?hostelType\s+HostelType/));
check('Hostel: status HostelStatus', has(schema, /model Hostel \{[\s\S]*?status\s+HostelStatus/));
check('Hostel: capacity Int', has(schema, /model Hostel \{[\s\S]*?capacity\s+Int/));
check('Hostel: @@map hostels', has(schema, '"hostels"'));

check('model HostelBuilding defined', has(schema, 'model HostelBuilding {'));
check('HostelBuilding: hostelId FK', has(schema, /model HostelBuilding \{[\s\S]*?hostelId\s+String/));
check('HostelBuilding: @@map hostel_buildings', has(schema, '"hostel_buildings"'));

check('model HostelFloor defined', has(schema, 'model HostelFloor {'));
check('HostelFloor: floorNumber Int', has(schema, /model HostelFloor \{[\s\S]*?floorNumber\s+Int/));
check('HostelFloor: @@map hostel_floors', has(schema, '"hostel_floors"'));

check('model HostelRoom defined', has(schema, 'model HostelRoom {'));
check('HostelRoom: roomNumber', has(schema, /model HostelRoom \{[\s\S]*?roomNumber\s+String/));
check('HostelRoom: roomType HostelRoomType', has(schema, /model HostelRoom \{[\s\S]*?roomType\s+HostelRoomType/));
check('HostelRoom: genderEligibility HostelGenderEligibility', has(schema, /model HostelRoom \{[\s\S]*?genderEligibility\s+HostelGenderEligibility/));
check('HostelRoom: capacity Int', has(schema, /model HostelRoom \{[\s\S]*?capacity\s+Int/));
check('HostelRoom: status HostelRoomStatus', has(schema, /model HostelRoom \{[\s\S]*?status\s+HostelRoomStatus/));
check('HostelRoom: facilities String[]', has(schema, /model HostelRoom \{[\s\S]*?facilities\s+String\[\]/));
check('HostelRoom: feeAmount Decimal?', has(schema, /model HostelRoom \{[\s\S]*?feeAmount\s+Decimal\?/));
check('HostelRoom: @@map hostel_rooms', has(schema, '"hostel_rooms"'));

check('model HostelBed defined', has(schema, 'model HostelBed {'));
check('HostelBed: bedNumber', has(schema, /model HostelBed \{[\s\S]*?bedNumber\s+String/));
check('HostelBed: status HostelBedStatus', has(schema, /model HostelBed \{[\s\S]*?status\s+HostelBedStatus/));
check('HostelBed: condition CopyCondition', has(schema, /model HostelBed \{[\s\S]*?condition\s+CopyCondition/));
check('HostelBed: @@map hostel_beds', has(schema, '"hostel_beds"'));

check('model HostelAllocation defined', has(schema, 'model HostelAllocation {'));
check('HostelAllocation: allocationNumber unique', has(schema, /allocationNumber\s+String\s+@unique/));
check('HostelAllocation: studentId FK', has(schema, /model HostelAllocation \{[\s\S]*?studentId\s+String/));
check('HostelAllocation: roomId FK', has(schema, /model HostelAllocation \{[\s\S]*?roomId\s+String/));
check('HostelAllocation: bedId FK', has(schema, /model HostelAllocation \{[\s\S]*?bedId\s+String\?/));
check('HostelAllocation: status HostelAllocationStatus', has(schema, /model HostelAllocation \{[\s\S]*?status\s+HostelAllocationStatus/));
check('HostelAllocation: isOverride Boolean', has(schema, /model HostelAllocation \{[\s\S]*?isOverride\s+Boolean/));
check('HostelAllocation: @@map hostel_allocations', has(schema, '"hostel_allocations"'));

check('model HostelAttendance defined', has(schema, 'model HostelAttendance {'));
check('HostelAttendance: status HostelAttendanceStatus', has(schema, /model HostelAttendance \{[\s\S]*?status\s+HostelAttendanceStatus/));
check('HostelAttendance: session String', has(schema, /model HostelAttendance \{[\s\S]*?session\s+String/));
check('HostelAttendance: @@unique studentId+date+session', has(schema, /@@unique\(\[studentId, date, session\]\)/));
check('HostelAttendance: @@map hostel_attendances', has(schema, '"hostel_attendances"'));

check('model HostelWarden defined', has(schema, 'model HostelWarden {'));
check('HostelWarden: role HostelStaffRole', has(schema, /model HostelWarden \{[\s\S]*?role\s+HostelStaffRole/));
check('HostelWarden: employeeId FK', has(schema, /model HostelWarden \{[\s\S]*?employeeId\s+String/));
check('HostelWarden: @@map hostel_wardens', has(schema, '"hostel_wardens"'));

check('model HostelOuting defined', has(schema, 'model HostelOuting {'));
check('HostelOuting: outingNumber unique', has(schema, /outingNumber\s+String\s+@unique/));
check('HostelOuting: outingType HostelOutingType', has(schema, /model HostelOuting \{[\s\S]*?outingType\s+HostelOutingType/));
check('HostelOuting: status HostelOutingStatus', has(schema, /model HostelOuting \{[\s\S]*?status\s+HostelOutingStatus/));
check('HostelOuting: @@map hostel_outings', has(schema, '"hostel_outings"'));

check('model HostelVisitor defined', has(schema, 'model HostelVisitor {'));
check('HostelVisitor: visitorNumber unique', has(schema, /visitorNumber\s+String\s+@unique/));
check('HostelVisitor: status HostelVisitorStatus', has(schema, /model HostelVisitor \{[\s\S]*?status\s+HostelVisitorStatus/));
check('HostelVisitor: @@map hostel_visitors', has(schema, '"hostel_visitors"'));

check('model HostelIncident defined', has(schema, 'model HostelIncident {'));
check('HostelIncident: incidentNumber unique', has(schema, /incidentNumber\s+String\s+@unique/));
check('HostelIncident: severity IncidentSeverity', has(schema, /model HostelIncident \{[\s\S]*?severity\s+IncidentSeverity/));
check('HostelIncident: status HostelIncidentStatus', has(schema, /model HostelIncident \{[\s\S]*?status\s+HostelIncidentStatus/));
check('HostelIncident: @@map hostel_incidents', has(schema, '"hostel_incidents"'));

check('model HostelIncidentStudent defined', has(schema, 'model HostelIncidentStudent {'));
check('HostelIncidentStudent: @@unique incidentId+studentId', has(schema, /model HostelIncidentStudent[\s\S]*?@@unique\(\[incidentId, studentId\]\)/));
check('HostelIncidentStudent: @@map hostel_incident_students', has(schema, '"hostel_incident_students"'));

check('model HostelMaintenanceRequest defined', has(schema, 'model HostelMaintenanceRequest {'));
check('HostelMaintenanceRequest: requestNumber unique', has(schema, /requestNumber\s+String\s+@unique/));
check('HostelMaintenanceRequest: priority HostelMaintenancePriority', has(schema, /model HostelMaintenanceRequest \{[\s\S]*?priority\s+HostelMaintenancePriority/));
check('HostelMaintenanceRequest: status HostelMaintenanceStatus', has(schema, /model HostelMaintenanceRequest \{[\s\S]*?status\s+HostelMaintenanceStatus/));
check('HostelMaintenanceRequest: @@map hostel_maintenance_requests', has(schema, '"hostel_maintenance_requests"'));

// =============================================================================
console.log('\n3. Prisma Schema — Back-References on Existing Models');
// =============================================================================

check('Organization: hostels back-ref', has(schema, /model Organization \{[\s\S]*?hostels\s+Hostel\[\]/));
check('Organization: hostelAllocations back-ref', has(schema, /model Organization \{[\s\S]*?hostelAllocations\s+HostelAllocation\[\]/));
check('Organization: hostelAttendances back-ref', has(schema, /model Organization \{[\s\S]*?hostelAttendances\s+HostelAttendance\[\]/));
check('Organization: hostelWardens back-ref', has(schema, /model Organization \{[\s\S]*?hostelWardens\s+HostelWarden\[\]/));
check('Organization: hostelOutings back-ref', has(schema, /model Organization \{[\s\S]*?hostelOutings\s+HostelOuting\[\]/));
check('Organization: hostelVisitors back-ref', has(schema, /model Organization \{[\s\S]*?hostelVisitors\s+HostelVisitor\[\]/));
check('Organization: hostelIncidents back-ref', has(schema, /model Organization \{[\s\S]*?hostelIncidents\s+HostelIncident\[\]/));
check('Organization: hostelMaintenanceRequests back-ref', has(schema, /model Organization \{[\s\S]*?hostelMaintenanceRequests\s+HostelMaintenanceRequest\[\]/));

check('Campus: hostels back-ref', has(schema, /model Campus \{[\s\S]*?hostels\s+Hostel\[\]/));

check('StudentProfile: hostelAllocations back-ref', has(schema, /model StudentProfile \{[\s\S]*?hostelAllocations\s+HostelAllocation\[\]/));
check('StudentProfile: hostelAttendances back-ref', has(schema, /model StudentProfile \{[\s\S]*?hostelAttendances\s+HostelAttendance\[\]/));
check('StudentProfile: hostelOutings back-ref', has(schema, /model StudentProfile \{[\s\S]*?hostelOutings\s+HostelOuting\[\]/));
check('StudentProfile: hostelVisitors back-ref', has(schema, /model StudentProfile \{[\s\S]*?hostelVisitors\s+HostelVisitor\[\]/));
check('StudentProfile: hostelIncidentStudents back-ref', has(schema, /model StudentProfile \{[\s\S]*?hostelIncidentStudents\s+HostelIncidentStudent\[\]/));

check('EmployeeProfile: hostelWardens back-ref', has(schema, /model EmployeeProfile \{[\s\S]*?hostelWardens\s+HostelWarden\[\]/));
check('EmployeeProfile: hostelMaintenanceAssignments back-ref', has(schema, /model EmployeeProfile \{[\s\S]*?hostelMaintenanceAssignments\s+HostelMaintenanceRequest\[\]/));

check('AcademicYear: hostelAllocations back-ref', has(schema, /model AcademicYear \{[\s\S]*?hostelAllocations\s+HostelAllocation\[\]/));

// =============================================================================
console.log('\n4. Shared Types — Hostel Interface');
// =============================================================================

const idx = readFile('packages/shared-types/src/index.ts');
check('index.ts exports hostel.interface.js', has(idx, "hostel.interface.js'"));

const hostelIface = readFile('packages/shared-types/src/interfaces/hostel.interface.ts');
check('HostelStatus type exported', has(hostelIface, 'HostelStatus'));
check('HostelType type exported', has(hostelIface, 'HostelType'));
check('HostelRoomType type exported', has(hostelIface, 'HostelRoomType'));
check('HostelGenderEligibility type exported', has(hostelIface, 'HostelGenderEligibility'));
check('HostelRoomStatus type exported', has(hostelIface, 'HostelRoomStatus'));
check('HostelBedStatus type exported', has(hostelIface, 'HostelBedStatus'));
check('HostelAllocationStatus type exported', has(hostelIface, 'HostelAllocationStatus'));
check('HostelAttendanceStatus type exported', has(hostelIface, 'HostelAttendanceStatus'));
check('HostelStaffRole type exported', has(hostelIface, 'HostelStaffRole'));
check('HostelOutingStatus type exported', has(hostelIface, 'HostelOutingStatus'));
check('HostelOutingType type exported', has(hostelIface, 'HostelOutingType'));
check('HostelMaintenancePriority type exported', has(hostelIface, 'HostelMaintenancePriority'));
check('HostelMaintenanceStatus type exported', has(hostelIface, 'HostelMaintenanceStatus'));
check('HostelVisitorStatus type exported', has(hostelIface, 'HostelVisitorStatus'));
check('HostelIncidentStatus type exported', has(hostelIface, 'HostelIncidentStatus'));

check('Hostel interface exported', has(hostelIface, 'interface Hostel {'));
check('HostelBuilding interface exported', has(hostelIface, 'interface HostelBuilding {'));
check('HostelFloor interface exported', has(hostelIface, 'interface HostelFloor {'));
check('HostelRoom interface exported', has(hostelIface, 'interface HostelRoom {'));
check('HostelBed interface exported', has(hostelIface, 'interface HostelBed {'));
check('HostelAllocation interface exported', has(hostelIface, 'interface HostelAllocation {'));
check('HostelAttendance interface exported', has(hostelIface, 'interface HostelAttendance {'));
check('HostelWarden interface exported', has(hostelIface, 'interface HostelWarden {'));
check('HostelOuting interface exported', has(hostelIface, 'interface HostelOuting {'));
check('HostelVisitor interface exported', has(hostelIface, 'interface HostelVisitor {'));
check('HostelIncident interface exported', has(hostelIface, 'interface HostelIncident {'));
check('HostelMaintenanceRequest interface exported', has(hostelIface, 'interface HostelMaintenanceRequest {'));
check('HostelDashboardSummary interface exported', has(hostelIface, 'interface HostelDashboardSummary {'));
check('RoomOccupancySummary interface exported', has(hostelIface, 'interface RoomOccupancySummary {'));
check('HostelAttendanceRosterItem interface exported', has(hostelIface, 'interface HostelAttendanceRosterItem {'));

// =============================================================================
console.log('\n5. API — Hostel Structure Service');
// =============================================================================

const structSvc = readFile('apps/api/src/modules/hostel/hostel-structure.service.ts');
check('HostelStructureService defined', has(structSvc, 'class HostelStructureService'));
check('createHostel method', has(structSvc, 'createHostel('));
check('listHostels method', has(structSvc, 'listHostels('));
check('getHostel method', has(structSvc, 'getHostel('));
check('updateHostel method', has(structSvc, 'updateHostel('));
check('createBuilding method', has(structSvc, 'createBuilding('));
check('listBuildings method', has(structSvc, 'listBuildings('));
check('createFloor method', has(structSvc, 'createFloor('));
check('createRoom method', has(structSvc, 'createRoom('));
check('listRooms method', has(structSvc, 'listRooms('));
check('getRoom method', has(structSvc, 'getRoom('));
check('updateRoom method', has(structSvc, 'updateRoom('));
check('createBed method', has(structSvc, 'createBed('));
check('listBeds method', has(structSvc, 'listBeds('));
check('updateBedStatus method', has(structSvc, 'updateBedStatus('));
check('Hostel code duplicate check', has(structSvc, 'code: dto.code'));
check('Room number duplicate check', has(structSvc, 'roomNumber: dto.roomNumber'));
check('Bed auto-create logic', has(structSvc, 'autoCreateBeds'));
check('AuditService injected', has(structSvc, 'AuditService'));

// =============================================================================
console.log('\n6. API — Hostel Allocation Service');
// =============================================================================

const allocSvc = readFile('apps/api/src/modules/hostel/hostel-allocation.service.ts');
check('HostelAllocationService defined', has(allocSvc, 'class HostelAllocationService'));
check('allocateStudent method', has(allocSvc, 'allocateStudent('));
check('bulkAllocate method', has(allocSvc, 'bulkAllocate('));
check('checkIn method', has(allocSvc, 'checkIn('));
check('checkOut method', has(allocSvc, 'checkOut('));
check('transferAllocation method', has(allocSvc, 'transferAllocation('));
check('listAllocations method', has(allocSvc, 'listAllocations('));
check('getAllocation method', has(allocSvc, 'getAllocation('));
check('getStudentHostelHistory method', has(allocSvc, 'getStudentHostelHistory('));
check('ALLOC- code auto-generation', has(allocSvc, 'ALLOC-'));
check('Student existence validation', has(allocSvc, 'Student profile not found'));
check('Duplicate active allocation check', has(allocSvc, 'already has an active or reserved hostel allocation'));
check('Capacity validation check', has(allocSvc, 'Room capacity'));
check('Bed availability check', has(allocSvc, 'is currently'));
check('Transaction-safe allocation', has(allocSvc, 'this.prisma.$transaction'));
check('Release bed on check-out', has(allocSvc, "status: 'AVAILABLE'"));
check('Transfer flags old allocation as TRANSFERRED', has(allocSvc, "status: 'TRANSFERRED'"));

// =============================================================================
console.log('\n7. API — Hostel Attendance Service');
// =============================================================================

const attSvc = readFile('apps/api/src/modules/hostel/hostel-attendance.service.ts');
check('HostelAttendanceService defined', has(attSvc, 'class HostelAttendanceService'));
check('markAttendance method', has(attSvc, 'markAttendance('));
check('bulkMarkAttendance method', has(attSvc, 'bulkMarkAttendance('));
check('getRoster method', has(attSvc, 'getRoster('));
check('listAttendance method', has(attSvc, 'listAttendance('));
check('getTodayAttendanceSummary method', has(attSvc, 'getTodayAttendanceSummary('));
check('NIGHT_ROLL_CALL session support', has(attSvc, 'NIGHT_ROLL_CALL'));
check('Upsert attendance records', has(attSvc, 'hostelAttendance.upsert'));

// =============================================================================
console.log('\n8. API — Hostel Movement Service');
// =============================================================================

const moveSvc = readFile('apps/api/src/modules/hostel/hostel-movement.service.ts');
check('HostelMovementService defined', has(moveSvc, 'class HostelMovementService'));
check('createOuting method', has(moveSvc, 'createOuting('));
check('approveOuting method', has(moveSvc, 'approveOuting('));
check('recordOutingDeparture method', has(moveSvc, 'recordOutingDeparture('));
check('recordOutingReturn method', has(moveSvc, 'recordOutingReturn('));
check('listOutings method', has(moveSvc, 'listOutings('));
check('getOuting method', has(moveSvc, 'getOuting('));
check('createVisitor method', has(moveSvc, 'createVisitor('));
check('updateVisitorStatus method', has(moveSvc, 'updateVisitorStatus('));
check('listVisitors method', has(moveSvc, 'listVisitors('));
check('OUT- outing code generation', has(moveSvc, "'OUT'"));
check('VIS- visitor code generation', has(moveSvc, "'VIS'"));
check('Curfew LATE_RETURN calculation', has(moveSvc, 'LATE_RETURN'));

// =============================================================================
console.log('\n9. API — Hostel Operations Service');
// =============================================================================

const opsSvc = readFile('apps/api/src/modules/hostel/hostel-operations.service.ts');
check('HostelOperationsService defined', has(opsSvc, 'class HostelOperationsService'));
check('assignWarden method', has(opsSvc, 'assignWarden('));
check('listWardens method', has(opsSvc, 'listWardens('));
check('updateWarden method', has(opsSvc, 'updateWarden('));
check('reportIncident method', has(opsSvc, 'reportIncident('));
check('resolveIncident method', has(opsSvc, 'resolveIncident('));
check('listIncidents method', has(opsSvc, 'listIncidents('));
check('getIncident method', has(opsSvc, 'getIncident('));
check('createMaintenance method', has(opsSvc, 'createMaintenance('));
check('updateMaintenanceStatus method', has(opsSvc, 'updateMaintenanceStatus('));
check('listMaintenance method', has(opsSvc, 'listMaintenance('));
check('getMaintenance method', has(opsSvc, 'getMaintenance('));
check('HINC- incident number', has(opsSvc, "'HINC'"));
check('HMNT- maintenance number', has(opsSvc, "'HMNT'"));
check('Incident student linking transaction', has(opsSvc, 'hostelIncidentStudent.createMany'));

// =============================================================================
console.log('\n10. API — Hostel Reports Service');
// =============================================================================

const repSvc = readFile('apps/api/src/modules/hostel/hostel-reports.service.ts');
check('HostelReportsService defined', has(repSvc, 'class HostelReportsService'));
check('getDashboardSummary method', has(repSvc, 'getDashboardSummary('));
check('getOccupancyReport method', has(repSvc, 'getOccupancyReport('));
check('getMaintenanceCostReport method', has(repSvc, 'getMaintenanceCostReport('));
check('getIncidentSummaryReport method', has(repSvc, 'getIncidentSummaryReport('));
check('getDefaultersReport method', has(repSvc, 'getDefaultersReport('));
check('Dashboard summary calculates occupancyRate', has(repSvc, 'occupancyRate'));

// =============================================================================
console.log('\n11. API — Hostel Controller');
// =============================================================================

const controller = readFile('apps/api/src/modules/hostel/hostel.controller.ts');
check('HostelController defined', has(controller, 'class HostelController'));
check('@Controller("hostel")', has(controller, "@Controller('hostel')"));

// Hostels
check('POST /hostel/hostels', has(controller, "Post('hostels')"));
check('GET /hostel/hostels', has(controller, "Get('hostels')"));
check('GET /hostel/hostels/:id', has(controller, "Get('hostels/:id')"));
check('PUT /hostel/hostels/:id', has(controller, "Put('hostels/:id')"));

// Buildings
check('POST /hostel/buildings', has(controller, "Post('buildings')"));
check('GET /hostel/buildings', has(controller, "Get('buildings')"));
check('GET /hostel/buildings/:id', has(controller, "Get('buildings/:id')"));
check('PUT /hostel/buildings/:id', has(controller, "Put('buildings/:id')"));

// Floors
check('POST /hostel/floors', has(controller, "Post('floors')"));
check('GET /hostel/floors', has(controller, "Get('floors')"));

// Rooms
check('POST /hostel/rooms', has(controller, "Post('rooms')"));
check('GET /hostel/rooms', has(controller, "Get('rooms')"));
check('GET /hostel/rooms/:id', has(controller, "Get('rooms/:id')"));
check('PUT /hostel/rooms/:id', has(controller, "Put('rooms/:id')"));

// Beds
check('POST /hostel/beds', has(controller, "Post('beds')"));
check('GET /hostel/beds', has(controller, "Get('beds')"));
check('PATCH /hostel/beds/:id/status', has(controller, "'beds/:id/status'"));

// Allocations
check('POST /hostel/allocations', has(controller, "Post('allocations')"));
check('POST /hostel/allocations/bulk', has(controller, "Post('allocations/bulk')"));
check('GET /hostel/allocations', has(controller, "Get('allocations')"));
check('GET /hostel/allocations/:id', has(controller, "Get('allocations/:id')"));
check('PATCH /hostel/allocations/:id/check-in', has(controller, "'allocations/:id/check-in'"));
check('PATCH /hostel/allocations/:id/check-out', has(controller, "'allocations/:id/check-out'"));
check('POST /hostel/allocations/:id/transfer', has(controller, "'allocations/:id/transfer'"));
check('GET /hostel/residents/:studentId/history', has(controller, "'residents/:studentId/history'"));

// Attendance
check('POST /hostel/attendance/mark', has(controller, "'attendance/mark'"));
check('POST /hostel/attendance/bulk', has(controller, "'attendance/bulk'"));
check('GET /hostel/attendance', has(controller, "Get('attendance')"));
check('GET /hostel/attendance/roster', has(controller, "'attendance/roster'"));
check('GET /hostel/attendance/today-summary', has(controller, "'attendance/today-summary'"));

// Outings
check('POST /hostel/outings', has(controller, "Post('outings')"));
check('GET /hostel/outings', has(controller, "Get('outings')"));
check('GET /hostel/outings/:id', has(controller, "Get('outings/:id')"));
check('PATCH /hostel/outings/:id/approve', has(controller, "'outings/:id/approve'"));
check('PATCH /hostel/outings/:id/depart', has(controller, "'outings/:id/depart'"));
check('PATCH /hostel/outings/:id/return', has(controller, "'outings/:id/return'"));

// Visitors
check('POST /hostel/visitors', has(controller, "Post('visitors')"));
check('GET /hostel/visitors', has(controller, "Get('visitors')"));
check('PATCH /hostel/visitors/:id/status', has(controller, "'visitors/:id/status'"));

// Wardens
check('POST /hostel/wardens', has(controller, "Post('wardens')"));
check('GET /hostel/wardens', has(controller, "Get('wardens')"));
check('PUT /hostel/wardens/:id', has(controller, "Put('wardens/:id')"));

// Incidents
check('POST /hostel/incidents', has(controller, "Post('incidents')"));
check('GET /hostel/incidents', has(controller, "Get('incidents')"));
check('GET /hostel/incidents/:id', has(controller, "Get('incidents/:id')"));
check('PATCH /hostel/incidents/:id/resolve', has(controller, "'incidents/:id/resolve'"));

// Maintenance
check('POST /hostel/maintenance', has(controller, "Post('maintenance')"));
check('GET /hostel/maintenance', has(controller, "Get('maintenance')"));
check('GET /hostel/maintenance/:id', has(controller, "Get('maintenance/:id')"));
check('PATCH /hostel/maintenance/:id/status', has(controller, "'maintenance/:id/status'"));

// Reports
check('GET /hostel/reports/dashboard', has(controller, "'reports/dashboard'"));
check('GET /hostel/reports/occupancy', has(controller, "'reports/occupancy'"));
check('GET /hostel/reports/maintenance-cost', has(controller, "'reports/maintenance-cost'"));
check('GET /hostel/reports/incidents', has(controller, "'reports/incidents'"));
check('GET /hostel/reports/defaulters', has(controller, "'reports/defaulters'"));

// Permissions
check('hostel:manage permission used', has(controller, "'hostel:manage'"));
check('hostel:view permission used', has(controller, "'hostel:view'"));
check('hostel:structure:manage permission used', has(controller, "'hostel:structure:manage'"));
check('hostel:rooms:manage permission used', has(controller, "'hostel:rooms:manage'"));
check('hostel:beds:manage permission used', has(controller, "'hostel:beds:manage'"));
check('hostel:allocation:manage permission used', has(controller, "'hostel:allocation:manage'"));
check('hostel:residents:view permission used', has(controller, "'hostel:residents:view'"));
check('hostel:checkin permission used', has(controller, "'hostel:checkin'"));
check('hostel:checkout permission used', has(controller, "'hostel:checkout'"));
check('hostel:transfer permission used', has(controller, "'hostel:transfer'"));
check('hostel:attendance:mark permission used', has(controller, "'hostel:attendance:mark'"));
check('hostel:attendance:view permission used', has(controller, "'hostel:attendance:view'"));
check('hostel:outings:create permission used', has(controller, "'hostel:outings:create'"));
check('hostel:outings:view permission used', has(controller, "'hostel:outings:view'"));
check('hostel:outings:approve permission used', has(controller, "'hostel:outings:approve'"));
check('hostel:visitors:manage permission used', has(controller, "'hostel:visitors:manage'"));
check('hostel:visitors:view permission used', has(controller, "'hostel:visitors:view'"));
check('hostel:incidents:manage permission used', has(controller, "'hostel:incidents:manage'"));
check('hostel:incidents:view permission used', has(controller, "'hostel:incidents:view'"));
check('hostel:maintenance:manage permission used', has(controller, "'hostel:maintenance:manage'"));
check('hostel:maintenance:view permission used', has(controller, "'hostel:maintenance:view'"));
check('hostel:reports permission used', has(controller, "'hostel:reports'"));

// =============================================================================
console.log('\n12. API — Hostel Module');
// =============================================================================

const mod = readFile('apps/api/src/modules/hostel/hostel.module.ts');
check('HostelModule defined', has(mod, 'class HostelModule'));
check('AuditModule imported', has(mod, 'AuditModule'));
check('HostelStructureService registered', has(mod, 'HostelStructureService'));
check('HostelAllocationService registered', has(mod, 'HostelAllocationService'));
check('HostelAttendanceService registered', has(mod, 'HostelAttendanceService'));
check('HostelMovementService registered', has(mod, 'HostelMovementService'));
check('HostelOperationsService registered', has(mod, 'HostelOperationsService'));
check('HostelReportsService registered', has(mod, 'HostelReportsService'));
check('Services exported from HostelModule', has(mod, 'exports'));

// =============================================================================
console.log('\n13. Web Portal — Hostel Page');
// =============================================================================

const webPage = readFile('apps/web/src/app/(dashboard)/portal/hostel/page.tsx');
check('Hostel page exists and is client component', has(webPage, "'use client'"));
check('10 HOSTEL_TABS defined', has(webPage, 'const HOSTEL_TABS'));
check('Overview tab', has(webPage, "'overview'"));
check('Hostels tab', has(webPage, "'hostels'"));
check('Rooms tab', has(webPage, "'rooms'"));
check('Residents tab', has(webPage, "'residents'"));
check('Attendance tab', has(webPage, "'attendance'"));
check('Outings tab', has(webPage, "'outings'"));
check('Visitors tab', has(webPage, "'visitors'"));
check('Maintenance tab', has(webPage, "'maintenance'"));
check('Incidents tab', has(webPage, "'incidents'"));
check('Wardens tab', has(webPage, "'wardens'"));

check('API calls: /hostel/reports/dashboard', has(webPage, '/hostel/reports/dashboard'));
check('API calls: /hostel/hostels', has(webPage, '/hostel/hostels'));
check('API calls: /hostel/rooms', has(webPage, '/hostel/rooms'));
check('API calls: /hostel/beds', has(webPage, '/hostel/beds'));
check('API calls: /hostel/allocations', has(webPage, '/hostel/allocations'));
check('API calls: /hostel/attendance/roster', has(webPage, '/hostel/attendance/roster'));
check('API calls: /hostel/outings', has(webPage, '/hostel/outings'));
check('API calls: /hostel/visitors', has(webPage, '/hostel/visitors'));
check('API calls: /hostel/maintenance', has(webPage, '/hostel/maintenance'));
check('API calls: /hostel/incidents', has(webPage, '/hostel/incidents'));
check('API calls: /hostel/wardens', has(webPage, '/hostel/wardens'));

check('Hostel modal present', has(webPage, 'showHostelModal'));
check('Room modal present', has(webPage, 'showRoomModal'));
check('Allocate modal present', has(webPage, 'showAllocateModal'));
check('Outing modal present', has(webPage, 'showOutingModal'));
check('Visitor modal present', has(webPage, 'showVisitorModal'));
check('Maintenance modal present', has(webPage, 'showMaintenanceModal'));
check('Incident modal present', has(webPage, 'showIncidentModal'));

check('Dashboard summary KPI cards', has(webPage, 'dashboardSummary'));
check('Night roll-call action', has(webPage, 'handleMarkAllPresent'));
check('Breadcrumbs linked to /portal/operations', has(webPage, '/portal/operations'));
check('DataTable for hostels', has(webPage, 'hostelColumns'));
check('DataTable for rooms', has(webPage, 'roomColumns'));
check('DataTable for residents', has(webPage, 'residentColumns'));
check('DataTable for outings', has(webPage, 'outingColumns'));

// =============================================================================
console.log('\n14. Operations Page — Hostel Tab Updated');
// =============================================================================

const opsPage = readFile('apps/web/src/app/(dashboard)/portal/operations/page.tsx');
check("Hostel tab badge = 'Active'", has(opsPage, "{ id: 'hostel', label: 'Hostel & Housing', badge: 'Active' }"));
check('Link to /portal/hostel', has(opsPage, '/portal/hostel'));
check('Phase 4K Active banner shown', has(opsPage, 'Phase 4K Hostel Management — Active'));

// =============================================================================
console.log('\n15. Feature Status & Documentation');
// =============================================================================

const featureStatus = readFile('docs/features/feature-status.md');
check('Hostel Phase 4K marked VERIFIED in feature-status.md', has(featureStatus, '4K | **VERIFIED**'));

const specDoc = readFile('docs/features/phase4k-hostel-management.md');
check('phase4k-hostel-management.md exists', specDoc.length > 0);
check('phase4k-hostel-management.md has EXISTING', has(specDoc, '### EXISTING'));
check('phase4k-hostel-management.md has MISSING', has(specDoc, '### MISSING'));
check('phase4k-hostel-management.md has TO IMPLEMENT', has(specDoc, '### TO IMPLEMENT'));
check('phase4k-hostel-management.md has DEFERRED', has(specDoc, '### DEFERRED'));

const finalReport = readFile('docs/features/phase4k-final-report.md');
check('phase4k-final-report.md exists', finalReport.length > 0);
check('phase4k-final-report.md has VERIFIED status', has(finalReport, 'VERIFIED & READY FOR PHASE 4L'));

// =============================================================================
// FINAL RESULTS
// =============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log(`  PHASE 4K VERIFICATION COMPLETE`);
console.log(`  ✅ PASSED: ${passed}`);
console.log(`  ❌ FAILED: ${failed}`);
console.log(`  TOTAL:   ${passed + failed}`);

if (failures.length > 0) {
  console.log('\n  FAILED CHECKS:');
  failures.forEach((f) => console.log(`    • ${f}`));
}

if (failed === 0) {
  console.log('\n  🎉 ALL CHECKS PASSED — PHASE 4K IS VERIFIED AND READY FOR PHASE 4L');
} else {
  console.log('\n  ⚠️  Some checks failed. Review and fix before proceeding.');
}

console.log('═══════════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
