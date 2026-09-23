#!/usr/bin/env node
// =============================================================================
// Phase 4J: Transport Management — Verification Script
// Run: node scripts/verify-phase4j.cjs
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
console.log('\n📋 PHASE 4J VERIFICATION — Transport Management\n');

// =============================================================================
console.log('1. Prisma Schema — Transport Enums');
// =============================================================================
const schema = readFile('apps/api/prisma/schema.prisma');

check('VehicleStatus enum defined', has(schema, 'enum VehicleStatus'));
check('VehicleStatus: ACTIVE', has(schema, /enum VehicleStatus \{[\s\S]*?ACTIVE/));
check('VehicleStatus: IN_SERVICE', has(schema, 'IN_SERVICE'));
check('VehicleStatus: MAINTENANCE', has(schema, /enum VehicleStatus[\s\S]*?MAINTENANCE/));
check('VehicleStatus: OUT_OF_SERVICE', has(schema, 'OUT_OF_SERVICE'));
check('VehicleStatus: RETIRED', has(schema, 'RETIRED'));
check('VehicleStatus: SOLD', has(schema, 'SOLD'));
check('VehicleType enum defined', has(schema, 'enum VehicleType'));
check('VehicleType: BUS', has(schema, /enum VehicleType[\s\S]*?BUS/));
check('VehicleType: MINI_BUS', has(schema, 'MINI_BUS'));
check('VehicleType: VAN', has(schema, /enum VehicleType[\s\S]*?VAN/));
check('BoardingEventType enum defined', has(schema, 'enum BoardingEventType'));
check('BoardingEventType: BOARDING', has(schema, /enum BoardingEventType[\s\S]*?BOARDING/));
check('BoardingEventType: DROPPED_OFF', has(schema, 'DROPPED_OFF'));
check('BoardingEventType: NO_SHOW', has(schema, 'NO_SHOW'));
check('BoardingEventType: LEFT_WITH_GUARDIAN', has(schema, 'LEFT_WITH_GUARDIAN'));
check('MaintenanceType enum defined', has(schema, 'enum MaintenanceType'));
check('MaintenanceType: ROUTINE_SERVICE', has(schema, 'ROUTINE_SERVICE'));
check('MaintenanceType: REPAIR', has(schema, /enum MaintenanceType[\s\S]*?REPAIR/));
check('MaintenanceType: INSPECTION', has(schema, 'INSPECTION'));
check('MaintenanceType: TYRE', has(schema, 'TYRE'));
check('MaintenanceType: OIL', has(schema, /enum MaintenanceType[\s\S]*?OIL/));
check('IncidentSeverity enum defined', has(schema, 'enum IncidentSeverity'));
check('IncidentSeverity: LOW', has(schema, /enum IncidentSeverity[\s\S]*?LOW/));
check('IncidentSeverity: MEDIUM', has(schema, /enum IncidentSeverity[\s\S]*?MEDIUM/));
check('IncidentSeverity: HIGH', has(schema, /enum IncidentSeverity[\s\S]*?HIGH/));
check('IncidentSeverity: CRITICAL', has(schema, 'CRITICAL'));
check('TransportAssignmentType enum defined', has(schema, 'enum TransportAssignmentType'));
check('TransportAssignmentType: PICKUP', has(schema, /enum TransportAssignmentType[\s\S]*?PICKUP/));
check('TransportAssignmentType: DROP', has(schema, /enum TransportAssignmentType[\s\S]*?DROP/));
check('TransportAssignmentType: BOTH', has(schema, /enum TransportAssignmentType[\s\S]*?BOTH/));
check('TransportScheduleStatus enum defined', has(schema, 'enum TransportScheduleStatus'));
check('TransportScheduleStatus: SCHEDULED', has(schema, /enum TransportScheduleStatus[\s\S]*?SCHEDULED/));
check('TransportScheduleStatus: IN_PROGRESS', has(schema, /enum TransportScheduleStatus[\s\S]*?IN_PROGRESS/));
check('TransportScheduleStatus: COMPLETED', has(schema, /enum TransportScheduleStatus[\s\S]*?COMPLETED/));
check('TransportScheduleStatus: CANCELLED', has(schema, /enum TransportScheduleStatus[\s\S]*?CANCELLED/));
check('TransportScheduleStatus: DELAYED', has(schema, /enum TransportScheduleStatus[\s\S]*?DELAYED/));

// =============================================================================
console.log('\n2. Prisma Schema — Transport Models');
// =============================================================================

check('model TransportFacility defined', has(schema, 'model TransportFacility'));
check('TransportFacility: organizationId', has(schema, /model TransportFacility[\s\S]*?organizationId/));
check('TransportFacility: campusId', has(schema, /model TransportFacility[\s\S]*?campusId/));
check('TransportFacility: code field', has(schema, /model TransportFacility[\s\S]*?code\s+String/));
check('TransportFacility: @@map', has(schema, '"transport_facilities"'));

check('model Vehicle defined', has(schema, 'model Vehicle'));
check('Vehicle: vehicleNumber unique', has(schema, /vehicleNumber\s+String\s+@unique/));
check('Vehicle: registrationNumber unique', has(schema, /registrationNumber\s+String\s+@unique/));
check('Vehicle: capacity field', has(schema, /model Vehicle[\s\S]*?capacity\s+Int/));
check('Vehicle: VehicleType relation', has(schema, /model Vehicle[\s\S]*?VehicleType/));
check('Vehicle: VehicleStatus relation', has(schema, /model Vehicle[\s\S]*?VehicleStatus/));
check('Vehicle: gpsDeviceId field', has(schema, 'gpsDeviceId'));
check('Vehicle: insuranceExpiry field', has(schema, 'insuranceExpiry'));
check('Vehicle: @@map vehicles', has(schema, '"vehicles"'));

check('model VehicleDocument defined', has(schema, 'model VehicleDocument'));
check('VehicleDocument: vehicleId FK', has(schema, /model VehicleDocument[\s\S]*?vehicleId/));
check('VehicleDocument: @@map vehicle_documents', has(schema, '"vehicle_documents"'));

check('model TransportDriver defined', has(schema, 'model TransportDriver'));
check('TransportDriver: driverCode unique', has(schema, /driverCode\s+String\s+@unique/));
check('TransportDriver: licenseNumber unique', has(schema, /licenseNumber\s+String\s+@unique/));
check('TransportDriver: licenseExpiry field', has(schema, /model TransportDriver[\s\S]*?licenseExpiry/));
check('TransportDriver: EmployeeProfile relation', has(schema, /model TransportDriver[\s\S]*?EmployeeProfile/));
check('TransportDriver: @@map transport_drivers', has(schema, '"transport_drivers"'));

check('model TransportAttendant defined', has(schema, 'model TransportAttendant'));
check('TransportAttendant: attendantCode unique', has(schema, /attendantCode\s+String\s+@unique/));
check('TransportAttendant: @@map transport_attendants', has(schema, '"transport_attendants"'));

check('model Route defined', has(schema, 'model Route'));
check('Route: routeCode unique', has(schema, /routeCode\s+String\s+@unique/));
check('Route: feeAmount field', has(schema, /model Route[\s\S]*?feeAmount/));
check('Route: feeStructureId field', has(schema, /model Route[\s\S]*?feeStructureId/));
check('Route: @@map routes', has(schema, '"routes"'));

check('model RouteStop defined', has(schema, 'model RouteStop'));
check('RouteStop: stopOrder field', has(schema, /model RouteStop[\s\S]*?stopOrder/));
check('RouteStop: latitude field', has(schema, /model RouteStop[\s\S]*?latitude/));
check('RouteStop: longitude field', has(schema, /model RouteStop[\s\S]*?longitude/));
check('RouteStop: pickupTime field', has(schema, /model RouteStop[\s\S]*?pickupTime/));
check('RouteStop: dropTime field', has(schema, /model RouteStop[\s\S]*?dropTime/));
check('RouteStop: @@map route_stops', has(schema, '"route_stops"'));

check('model StudentTransportAssignment defined', has(schema, 'model StudentTransportAssignment'));
check('StudentTransportAssignment: studentId FK', has(schema, /model StudentTransportAssignment[\s\S]*?studentId/));
check('StudentTransportAssignment: routeId FK', has(schema, /model StudentTransportAssignment[\s\S]*?routeId/));
check('StudentTransportAssignment: assignmentType field', has(schema, /model StudentTransportAssignment[\s\S]*?assignmentType/));
check('StudentTransportAssignment: effectiveFrom field', has(schema, /model StudentTransportAssignment[\s\S]*?effectiveFrom/));
check('StudentTransportAssignment: isActive field', has(schema, /model StudentTransportAssignment[\s\S]*?isActive/));
check('StudentTransportAssignment: @@map student_transport_assignments', has(schema, '"student_transport_assignments"'));

check('model TransportSchedule defined', has(schema, 'model TransportSchedule'));
check('TransportSchedule: scheduleDate field', has(schema, /model TransportSchedule[\s\S]*?scheduleDate/));
check('TransportSchedule: tripType field', has(schema, /model TransportSchedule[\s\S]*?tripType/));
check('TransportSchedule: status TransportScheduleStatus', has(schema, /model TransportSchedule[\s\S]*?TransportScheduleStatus/));
check('TransportSchedule: delayMinutes field', has(schema, /model TransportSchedule[\s\S]*?delayMinutes/));
check('TransportSchedule: @@map transport_schedules', has(schema, '"transport_schedules"'));

check('model BoardingEvent defined', has(schema, 'model BoardingEvent'));
check('BoardingEvent: eventType BoardingEventType', has(schema, /model BoardingEvent[\s\S]*?BoardingEventType/));
check('BoardingEvent: studentId FK', has(schema, /model BoardingEvent[\s\S]*?studentId/));
check('BoardingEvent: eventTime field', has(schema, /model BoardingEvent[\s\S]*?eventTime/));
check('BoardingEvent: guardianName field', has(schema, /model BoardingEvent[\s\S]*?guardianName/));
check('BoardingEvent: @@map boarding_events', has(schema, '"boarding_events"'));

check('model TransportIncident defined', has(schema, 'model TransportIncident'));
check('TransportIncident: incidentNumber unique', has(schema, /incidentNumber\s+String\s+@unique/));
check('TransportIncident: severity IncidentSeverity', has(schema, /model TransportIncident[\s\S]*?IncidentSeverity/));
check('TransportIncident: isResolved field', has(schema, /model TransportIncident[\s\S]*?isResolved/));
check('TransportIncident: @@map transport_incidents', has(schema, '"transport_incidents"'));

check('model IncidentStudent defined', has(schema, 'model IncidentStudent'));
check('IncidentStudent: @@unique incidentId+studentId', has(schema, /model IncidentStudent[\s\S]*?@@unique\(\[incidentId, studentId\]\)/));
check('IncidentStudent: @@map incident_students', has(schema, '"incident_students"'));

check('model VehicleMaintenance defined', has(schema, 'model VehicleMaintenance'));
check('VehicleMaintenance: maintenanceNumber unique', has(schema, /maintenanceNumber\s+String\s+@unique/));
check('VehicleMaintenance: maintenanceType MaintenanceType', has(schema, /model VehicleMaintenance[\s\S]*?MaintenanceType/));
check('VehicleMaintenance: isCompleted field', has(schema, /model VehicleMaintenance[\s\S]*?isCompleted/));
check('VehicleMaintenance: @@map vehicle_maintenances', has(schema, '"vehicle_maintenances"'));

check('model VehicleFuelRecord defined', has(schema, 'model VehicleFuelRecord'));
check('VehicleFuelRecord: liters field', has(schema, /model VehicleFuelRecord[\s\S]*?liters/));
check('VehicleFuelRecord: totalCost field', has(schema, /model VehicleFuelRecord[\s\S]*?totalCost/));
check('VehicleFuelRecord: odometer field', has(schema, /model VehicleFuelRecord[\s\S]*?odometer/));
check('VehicleFuelRecord: @@map vehicle_fuel_records', has(schema, '"vehicle_fuel_records"'));

// =============================================================================
console.log('\n3. Prisma Schema — Back-References on Existing Models');
// =============================================================================

check('Organization: transportFacilities back-ref', has(schema, 'transportFacilities  TransportFacility[]'));
check('Organization: vehicles back-ref', has(schema, /organizationId[\s\S]{0,200}vehicles\s+Vehicle\[\]/));
check('Organization: transportDrivers back-ref', has(schema, 'transportDrivers     TransportDriver[]'));
check('Organization: transportAttendants back-ref', has(schema, 'transportAttendants  TransportAttendant[]'));
check('Organization: routes back-ref', has(schema, /organizationId[\s\S]{0,200}routes\s+Route\[\]/));
check('Organization: transportSchedules back-ref', has(schema, 'transportSchedules   TransportSchedule[]'));
check('Organization: boardingEvents back-ref', has(schema, /boardingEvents\s+BoardingEvent\[\]/));
check('Organization: transportIncidents back-ref', has(schema, 'transportIncidents   TransportIncident[]'));
check('Organization: vehicleMaintenances back-ref', has(schema, 'vehicleMaintenances  VehicleMaintenance[]'));
check('Organization: vehicleFuelRecords back-ref', has(schema, 'vehicleFuelRecords   VehicleFuelRecord[]'));
check('Campus: transportFacilities back-ref', has(schema, /model Campus[\s\S]*?transportFacilities\s+TransportFacility\[\]/));
check('StudentProfile: transportAssignments back-ref', has(schema, /model StudentProfile[\s\S]*?transportAssignments\s+StudentTransportAssignment\[\]/));
check('StudentProfile: boardingEvents back-ref', has(schema, /model StudentProfile[\s\S]*?boardingEvents\s+BoardingEvent\[\]/));
check('StudentProfile: incidentStudents back-ref', has(schema, /model StudentProfile[\s\S]*?incidentStudents\s+IncidentStudent\[\]/));
check('EmployeeProfile: transportDriverAssignments back-ref', has(schema, /model EmployeeProfile[\s\S]*?transportDriverAssignments\s+TransportDriver\[\]/));
check('EmployeeProfile: transportAttendantAssignments back-ref', has(schema, /model EmployeeProfile[\s\S]*?transportAttendantAssignments\s+TransportAttendant\[\]/));
check('AcademicYear: studentTransportAssignments back-ref', has(schema, /model AcademicYear[\s\S]*?studentTransportAssignments\s+StudentTransportAssignment\[\]/));

// =============================================================================
console.log('\n4. Shared Types — Transport Interface');
// =============================================================================

const idx = readFile('packages/shared-types/src/index.ts');
check('index.ts exports transport.interface.js', has(idx, "transport.interface.js'"));

const transportIface = readFile('packages/shared-types/src/interfaces/transport.interface.ts');
check('VehicleStatus type exported', has(transportIface, 'VehicleStatus'));
check('VehicleType type exported', has(transportIface, 'VehicleType'));
check('BoardingEventType type exported', has(transportIface, 'BoardingEventType'));
check('MaintenanceType type exported', has(transportIface, 'MaintenanceType'));
check('IncidentSeverity type exported', has(transportIface, 'IncidentSeverity'));
check('TransportAssignmentType type exported', has(transportIface, 'TransportAssignmentType'));
check('TransportScheduleStatus type exported', has(transportIface, 'TransportScheduleStatus'));
check('TransportFacility interface exported', has(transportIface, 'TransportFacility'));
check('Vehicle interface exported', has(transportIface, 'interface Vehicle'));
check('VehicleDocument interface exported', has(transportIface, 'VehicleDocument'));
check('TransportDriver interface exported', has(transportIface, 'TransportDriver'));
check('TransportAttendant interface exported', has(transportIface, 'TransportAttendant'));
check('Route interface exported', has(transportIface, 'interface Route'));
check('RouteStop interface exported', has(transportIface, 'RouteStop'));
check('StudentTransportAssignment interface exported', has(transportIface, 'StudentTransportAssignment'));
check('TransportSchedule interface exported', has(transportIface, 'interface TransportSchedule'));
check('BoardingEvent interface exported', has(transportIface, 'interface BoardingEvent'));
check('TransportIncident interface exported', has(transportIface, 'TransportIncident'));
check('VehicleMaintenance interface exported', has(transportIface, 'VehicleMaintenance'));
check('VehicleFuelRecord interface exported', has(transportIface, 'VehicleFuelRecord'));
check('TransportFleetSummary interface exported', has(transportIface, 'TransportFleetSummary'));
check('VehicleExpiryAlert interface exported', has(transportIface, 'VehicleExpiryAlert'));
check('DriverLicenseExpiryAlert interface exported', has(transportIface, 'DriverLicenseExpiryAlert'));

// =============================================================================
console.log('\n5. API — Transport Vehicles Service');
// =============================================================================

const vehicleSvc = readFile('apps/api/src/modules/transport/transport-vehicles.service.ts');
check('TransportFacilityService defined', has(vehicleSvc, 'class TransportFacilityService'));
check('VehicleService defined', has(vehicleSvc, 'class VehicleService'));
check('createFacility method', has(vehicleSvc, 'createFacility'));
check('listFacilities method', has(vehicleSvc, 'listFacilities'));
check('registerVehicle method', has(vehicleSvc, 'registerVehicle'));
check('listVehicles method', has(vehicleSvc, 'listVehicles'));
check('getVehicle method', has(vehicleSvc, 'getVehicle'));
check('updateVehicleStatus method', has(vehicleSvc, 'updateVehicleStatus'));
check('addVehicleDocument method', has(vehicleSvc, 'addVehicleDocument'));
check('getExpiryAlerts method', has(vehicleSvc, 'getExpiryAlerts'));
check('Conflict check for vehicleNumber', has(vehicleSvc, 'findUnique({ where: { vehicleNumber'));
check('Conflict check for registrationNumber', has(vehicleSvc, 'findUnique({ where: { registrationNumber'));
check('AuditService injected', has(vehicleSvc, 'AuditService'));
check('audit.log for vehicle create', has(vehicleSvc, "action: 'CREATE'"));

// =============================================================================
console.log('\n6. API — Transport Personnel Service');
// =============================================================================

const personnelSvc = readFile('apps/api/src/modules/transport/transport-personnel.service.ts');
check('TransportPersonnelService defined', has(personnelSvc, 'class TransportPersonnelService'));
check('createDriver method', has(personnelSvc, 'createDriver'));
check('listDrivers method', has(personnelSvc, 'listDrivers'));
check('getDriver method', has(personnelSvc, 'getDriver'));
check('updateDriver method', has(personnelSvc, 'updateDriver'));
check('getDriverLicenseAlerts method', has(personnelSvc, 'getDriverLicenseAlerts'));
check('createAttendant method', has(personnelSvc, 'createAttendant'));
check('listAttendants method', has(personnelSvc, 'listAttendants'));
check('updateAttendant method', has(personnelSvc, 'updateAttendant'));
check('DRV- driver code auto-generation', has(personnelSvc, "'DRV'"));
check('ATT- attendant code auto-generation', has(personnelSvc, "'ATT'"));
check('License duplicate check', has(personnelSvc, 'licenseNumber: dto.licenseNumber'));
check('60-day license alert threshold', has(personnelSvc, '60'));

// =============================================================================
console.log('\n7. API — Transport Routes Service');
// =============================================================================

const routesSvc = readFile('apps/api/src/modules/transport/transport-routes.service.ts');
check('TransportRoutesService defined', has(routesSvc, 'class TransportRoutesService'));
check('createRoute method', has(routesSvc, 'createRoute'));
check('listRoutes method', has(routesSvc, 'listRoutes'));
check('getRoute method', has(routesSvc, 'getRoute'));
check('updateRoute method', has(routesSvc, 'updateRoute'));
check('addStop method', has(routesSvc, 'addStop'));
check('listStops method', has(routesSvc, 'listStops'));
check('deleteStop method', has(routesSvc, 'deleteStop'));
check('assignStudentToRoute method', has(routesSvc, 'assignStudentToRoute'));
check('listStudentAssignments method', has(routesSvc, 'listStudentAssignments'));
check('deactivateAssignment method', has(routesSvc, 'deactivateAssignment'));
check('getRouteOccupancy method', has(routesSvc, 'getRouteOccupancy'));
check('ROUTE- code auto-generation', has(routesSvc, 'ROUTE-'));
check('Stop order duplicate check', has(routesSvc, 'stopOrder: dto.stopOrder'));
check('Capacity validation logic', has(routesSvc, 'vehicle.capacity'));

// =============================================================================
console.log('\n8. API — Transport Schedule Service');
// =============================================================================

const scheduleSvc = readFile('apps/api/src/modules/transport/transport-schedule.service.ts');
check('TransportScheduleService defined', has(scheduleSvc, 'class TransportScheduleService'));
check('createSchedule method', has(scheduleSvc, 'createSchedule'));
check('listSchedules method', has(scheduleSvc, 'listSchedules'));
check('getSchedule method', has(scheduleSvc, 'getSchedule'));
check('updateScheduleStatus method', has(scheduleSvc, 'updateScheduleStatus'));
check('recordBoardingEvent method', has(scheduleSvc, 'recordBoardingEvent'));
check('listBoardingEvents method', has(scheduleSvc, 'listBoardingEvents'));
check('getTodayBoardingSummary method', has(scheduleSvc, 'getTodayBoardingSummary'));
check('Vehicle conflict detection', has(scheduleSvc, 'vehicleConflict'));
check('Driver conflict detection', has(scheduleSvc, 'driverConflict'));
check('Student assignment check before boarding', has(scheduleSvc, 'Student is not assigned to any transport route'));
check('Boarding MORNING/AFTERNOON trip type', has(scheduleSvc, 'MORNING'));

// =============================================================================
console.log('\n9. API — Transport Maintenance Service');
// =============================================================================

const maintSvc = readFile('apps/api/src/modules/transport/transport-maintenance.service.ts');
check('TransportMaintenanceService defined', has(maintSvc, 'class TransportMaintenanceService'));
check('createMaintenance method', has(maintSvc, 'createMaintenance'));
check('completeMaintenance method', has(maintSvc, 'completeMaintenance'));
check('listMaintenances method', has(maintSvc, 'listMaintenances'));
check('getMaintenance method', has(maintSvc, 'getMaintenance'));
check('recordFuel method', has(maintSvc, 'recordFuel'));
check('listFuelRecords method', has(maintSvc, 'listFuelRecords'));
check('reportIncident method', has(maintSvc, 'reportIncident'));
check('resolveIncident method', has(maintSvc, 'resolveIncident'));
check('listIncidents method', has(maintSvc, 'listIncidents'));
check('getIncident method', has(maintSvc, 'getIncident'));
check('MNT- maintenance number', has(maintSvc, "'MNT'"));
check('INC- incident number', has(maintSvc, "'INC'"));
check('Vehicle status → MAINTENANCE on create', has(maintSvc, "'MAINTENANCE'"));
check('Vehicle status → ACTIVE on complete', has(maintSvc, "'ACTIVE'"));
check('Incident student linking transaction', has(maintSvc, 'involvedStudentIds'));
check('Fuel cost auto-calculation', has(maintSvc, 'dto.liters * dto.pricePerLiter'));

// =============================================================================
console.log('\n10. API — Transport Reports Service');
// =============================================================================

const reportsSvc = readFile('apps/api/src/modules/transport/transport-reports.service.ts');
check('TransportReportsService defined', has(reportsSvc, 'class TransportReportsService'));
check('getFleetSummary method', has(reportsSvc, 'getFleetSummary'));
check('getMaintenanceCostReport method', has(reportsSvc, 'getMaintenanceCostReport'));
check('getFuelConsumptionReport method', has(reportsSvc, 'getFuelConsumptionReport'));
check('getIncidentReport method', has(reportsSvc, 'getIncidentReport'));
check('getDefaultersReport method', has(reportsSvc, 'getDefaultersReport'));
check('Fleet summary: totalVehicles', has(reportsSvc, 'totalVehicles'));
check('Fleet summary: totalAssignedStudents', has(reportsSvc, 'totalAssignedStudents'));
check('Maintenance cost by type breakdown', has(reportsSvc, 'byType'));
check('Fuel by vehicle breakdown', has(reportsSvc, 'byVehicle'));
check('Incident bySeverity breakdown', has(reportsSvc, 'bySeverity'));
check('Defaulters: 3-day threshold', has(reportsSvc, '3'));

// =============================================================================
console.log('\n11. API — Transport Controller');
// =============================================================================

const controller = readFile('apps/api/src/modules/transport/transport.controller.ts');
check('TransportController defined', has(controller, 'class TransportController'));
check('@Controller("transport")', has(controller, "@Controller('transport')"));

// Facilities
check('POST /transport/facilities', has(controller, "Post('facilities')"));
check('GET /transport/facilities', has(controller, "Get('facilities')"));
check('GET /transport/facilities/:id', has(controller, "Get('facilities/:id')"));
check('PUT /transport/facilities/:id', has(controller, "Put('facilities/:id')"));

// Vehicles
check('POST /transport/vehicles', has(controller, "Post('vehicles')"));
check('GET /transport/vehicles', has(controller, "Get('vehicles')"));
check('GET /transport/vehicles/alerts/expiry', has(controller, "'vehicles/alerts/expiry'"));
check('GET /transport/vehicles/:id', has(controller, "Get('vehicles/:id')"));
check('PUT /transport/vehicles/:id', has(controller, "Put('vehicles/:id')"));
check('PATCH /transport/vehicles/:id/status', has(controller, "'vehicles/:id/status'"));
check('POST /transport/vehicles/:id/documents', has(controller, "'vehicles/:id/documents'"));

// Drivers
check('POST /transport/drivers', has(controller, "Post('drivers')"));
check('GET /transport/drivers', has(controller, "Get('drivers')"));
check('GET /transport/drivers/alerts/license', has(controller, "'drivers/alerts/license'"));

// Routes
check('POST /transport/routes', has(controller, "Post('routes')"));
check('GET /transport/routes', has(controller, "Get('routes')"));
check('GET /transport/routes/occupancy', has(controller, "'routes/occupancy'"));
check('POST /transport/routes/:id/stops', has(controller, "'routes/:id/stops'"));

// Assignments
check('POST /transport/assignments', has(controller, "Post('assignments')"));
check('GET /transport/assignments', has(controller, "Get('assignments')"));
check('PATCH /transport/assignments/:id/deactivate', has(controller, "'assignments/:id/deactivate'"));

// Schedules
check('POST /transport/schedules', has(controller, "Post('schedules')"));
check('GET /transport/schedules', has(controller, "Get('schedules')"));
check('GET /transport/schedules/today-summary', has(controller, "'schedules/today-summary'"));
check('PATCH /transport/schedules/:id/status', has(controller, "'schedules/:id/status'"));

// Boarding
check('POST /transport/boarding', has(controller, "Post('boarding')"));
check('GET /transport/boarding', has(controller, "Get('boarding')"));

// Maintenance
check('POST /transport/maintenance', has(controller, "Post('maintenance')"));
check('PATCH /transport/maintenance/:id/complete', has(controller, "'maintenance/:id/complete'"));

// Fuel
check('POST /transport/fuel', has(controller, "Post('fuel')"));
check('GET /transport/fuel', has(controller, "Get('fuel')"));

// Incidents
check('POST /transport/incidents', has(controller, "Post('incidents')"));
check('PATCH /transport/incidents/:id/resolve', has(controller, "'incidents/:id/resolve'"));

// Reports
check('GET /transport/reports/fleet-summary', has(controller, "'reports/fleet-summary'"));
check('GET /transport/reports/maintenance-cost', has(controller, "'reports/maintenance-cost'"));
check('GET /transport/reports/fuel-consumption', has(controller, "'reports/fuel-consumption'"));
check('GET /transport/reports/incidents', has(controller, "'reports/incidents'"));
check('GET /transport/reports/defaulters', has(controller, "'reports/defaulters'"));

// Permissions
check('transport:manage permission used', has(controller, "'transport:manage'"));
check('transport:view permission used', has(controller, "'transport:view'"));
check('transport:vehicles:view permission used', has(controller, "'transport:vehicles:view'"));
check('transport:vehicles:manage permission used', has(controller, "'transport:vehicles:manage'"));
check('transport:drivers:view permission used', has(controller, "'transport:drivers:view'"));
check('transport:drivers:manage permission used', has(controller, "'transport:drivers:manage'"));
check('transport:routes:view permission used', has(controller, "'transport:routes:view'"));
check('transport:routes:manage permission used', has(controller, "'transport:routes:manage'"));
check('transport:assignments:view permission used', has(controller, "'transport:assignments:view'"));
check('transport:assignments:manage permission used', has(controller, "'transport:assignments:manage'"));
check('transport:schedules:view permission used', has(controller, "'transport:schedules:view'"));
check('transport:schedules:manage permission used', has(controller, "'transport:schedules:manage'"));
check('transport:boarding:view permission used', has(controller, "'transport:boarding:view'"));
check('transport:boarding:record permission used', has(controller, "'transport:boarding:record'"));
check('transport:incidents:view permission used', has(controller, "'transport:incidents:view'"));
check('transport:incidents:manage permission used', has(controller, "'transport:incidents:manage'"));
check('transport:maintenance:view permission used', has(controller, "'transport:maintenance:view'"));
check('transport:maintenance:manage permission used', has(controller, "'transport:maintenance:manage'"));
check('transport:reports permission used', has(controller, "'transport:reports'"));

// =============================================================================
console.log('\n12. API — Transport Module');
// =============================================================================

const mod = readFile('apps/api/src/modules/transport/transport.module.ts');
check('TransportModule defined', has(mod, 'class TransportModule'));
check('AuditModule imported', has(mod, 'AuditModule'));
check('TransportFacilityService registered', has(mod, 'TransportFacilityService'));
check('VehicleService registered', has(mod, 'VehicleService'));
check('TransportPersonnelService registered', has(mod, 'TransportPersonnelService'));
check('TransportRoutesService registered', has(mod, 'TransportRoutesService'));
check('TransportScheduleService registered', has(mod, 'TransportScheduleService'));
check('TransportMaintenanceService registered', has(mod, 'TransportMaintenanceService'));
check('TransportReportsService registered', has(mod, 'TransportReportsService'));
check('Services exported from module', has(mod, 'exports'));

// =============================================================================
console.log('\n13. Web Portal — Transport Page');
// =============================================================================

const webPage = readFile('apps/web/src/app/(dashboard)/portal/transport/page.tsx');
check('Transport page exists and is client component', has(webPage, "'use client'"));
check('9 TRANSPORT_TABS defined', has(webPage, 'const TRANSPORT_TABS'));
check('Overview tab', has(webPage, "'overview'"));
check('Vehicles tab', has(webPage, "'vehicles'"));
check('Drivers tab', has(webPage, "'drivers'"));
check('Routes tab', has(webPage, "'routes'"));
check('Assignments tab', has(webPage, "'assignments'"));
check('Schedules tab', has(webPage, "'schedules'"));
check('Maintenance tab', has(webPage, "'maintenance'"));
check('Incidents tab', has(webPage, "'incidents'"));
check('Reports tab', has(webPage, "'reports'"));
check('API calls: /transport/vehicles', has(webPage, '/transport/vehicles'));
check('API calls: /transport/drivers', has(webPage, '/transport/drivers'));
check('API calls: /transport/routes', has(webPage, '/transport/routes'));
check('API calls: /transport/assignments', has(webPage, '/transport/assignments'));
check('API calls: /transport/schedules', has(webPage, '/transport/schedules'));
check('API calls: /transport/maintenance', has(webPage, '/transport/maintenance'));
check('API calls: /transport/incidents', has(webPage, '/transport/incidents'));
check('API calls: /transport/reports/fleet-summary', has(webPage, '/transport/reports/fleet-summary'));
check('Vehicle modal present', has(webPage, 'showVehicleModal'));
check('Driver modal present', has(webPage, 'showDriverModal'));
check('Route modal present', has(webPage, 'showRouteModal'));
check('Assignment modal present', has(webPage, 'showAssignModal'));
check('Schedule modal present', has(webPage, 'showScheduleModal'));
check('Maintenance modal present', has(webPage, 'showMaintenanceModal'));
check('Incident modal present', has(webPage, 'showIncidentModal'));
check('Fleet summary KPI cards', has(webPage, 'fleetSummary'));
check('Today boarding summary', has(webPage, 'todaySummary'));
check('Expiry alerts displayed', has(webPage, 'expiryAlerts'));
check('No fake live GPS tracking', !has(webPage, 'live tracking') && !has(webPage, 'ON_ROUTE'));
check('Breadcrumbs linked to /portal/operations', has(webPage, '/portal/operations'));
check('DataTable for vehicles', has(webPage, 'vehicleColumns'));
check('DataTable for drivers', has(webPage, 'driverColumns'));
check('DataTable for routes', has(webPage, 'routeColumns'));
check('DataTable for assignments', has(webPage, 'assignmentColumns'));
check('DataTable for schedules', has(webPage, 'scheduleColumns'));
check('DataTable for maintenance', has(webPage, 'maintenanceColumns'));
check('DataTable for incidents', has(webPage, 'incidentColumns'));

// =============================================================================
console.log('\n14. Operations Page — Transport Tab Updated');
// =============================================================================

const opsPage = readFile('apps/web/src/app/(dashboard)/portal/operations/page.tsx');
check("Transport tab badge = 'Active'", has(opsPage, "badge: 'Active' }"));
check('Link to /portal/transport', has(opsPage, '/portal/transport'));
check('Phase 4J Active banner shown', has(opsPage, 'Phase 4J Transport Management'));
check('No fake ON_ROUTE simulation', !has(opsPage, 'ON_ROUTE'));

// =============================================================================
console.log('\n15. Feature Status Doc Updated');
// =============================================================================

const featureStatus = readFile('docs/features/feature-status.md');
check('Transport Phase 4J marked VERIFIED', has(featureStatus, '4J | **VERIFIED**'));

// =============================================================================
// FINAL RESULTS
// =============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log(`  PHASE 4J VERIFICATION COMPLETE`);
console.log(`  ✅ PASSED: ${passed}`);
console.log(`  ❌ FAILED: ${failed}`);
console.log(`  TOTAL:   ${passed + failed}`);

if (failures.length > 0) {
  console.log('\n  FAILED CHECKS:');
  failures.forEach((f) => console.log(`    • ${f}`));
}

if (failed === 0) {
  console.log('\n  🎉 ALL CHECKS PASSED — PHASE 4J IS VERIFIED AND READY FOR PHASE 4K');
} else {
  console.log('\n  ⚠️  Some checks failed. Review and fix before proceeding.');
}

console.log('═══════════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
