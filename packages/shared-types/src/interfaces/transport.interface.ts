// =============================================================================
// Phase 4J: Transport Management — Shared Type Definitions
// =============================================================================

export type VehicleStatus =
  | 'ACTIVE'
  | 'IN_SERVICE'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE'
  | 'RETIRED'
  | 'SOLD'
  | 'INACTIVE';

export type VehicleType = 'BUS' | 'MINI_BUS' | 'VAN' | 'CAR' | 'BIKE' | 'OTHER';

export type BoardingEventType =
  | 'BOARDING'
  | 'DROPPED_OFF'
  | 'NO_SHOW'
  | 'LEFT_WITH_GUARDIAN'
  | 'OTHER';

export type MaintenanceType =
  | 'ROUTINE_SERVICE'
  | 'REPAIR'
  | 'INSPECTION'
  | 'TYRE'
  | 'OIL'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TransportAssignmentType = 'PICKUP' | 'DROP' | 'BOTH';

export type TransportScheduleStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DELAYED';

// ---------------------------------------------------------------------------
// Transport Facility
// ---------------------------------------------------------------------------
export interface TransportFacility {
  id: string;
  organizationId: string;
  campusId?: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateTransportFacilityDto {
  campusId?: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Vehicle
// ---------------------------------------------------------------------------
export interface Vehicle {
  id: string;
  organizationId: string;
  facilityId?: string;
  vehicleNumber: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  capacity: number;
  fuelType?: string;
  engineNumber?: string;
  chassisNumber?: string;
  insuranceNumber?: string;
  insuranceExpiry?: Date | string;
  fitnessExpiry?: Date | string;
  taxExpiry?: Date | string;
  permitExpiry?: Date | string;
  gpsDeviceId?: string;
  lastServiceDate?: Date | string;
  nextServiceDue?: Date | string;
  odometer?: number;
  status: VehicleStatus;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  updatedBy?: string;
  facility?: { id: string; name: string; code: string };
}

export interface CreateVehicleDto {
  facilityId?: string;
  vehicleNumber: string;
  registrationNumber: string;
  vehicleType?: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  capacity: number;
  fuelType?: string;
  engineNumber?: string;
  chassisNumber?: string;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  taxExpiry?: string;
  permitExpiry?: string;
  gpsDeviceId?: string;
  notes?: string;
}

export interface UpdateVehicleStatusDto {
  status: VehicleStatus;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Vehicle Document
// ---------------------------------------------------------------------------
export interface VehicleDocument {
  id: string;
  vehicleId: string;
  title: string;
  documentType: string;
  fileUrl?: string;
  issueDate?: Date | string;
  expiryDate?: Date | string;
  notes?: string;
  status: string;
  createdAt: Date | string;
  createdBy?: string;
}

export interface CreateVehicleDocumentDto {
  title: string;
  documentType: string;
  fileUrl?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Transport Driver
// ---------------------------------------------------------------------------
export interface TransportDriver {
  id: string;
  organizationId: string;
  vehicleId?: string;
  employeeId?: string;
  driverCode: string;
  licenseNumber: string;
  licenseExpiry?: Date | string;
  licenseClass?: string;
  experienceYears?: number;
  contactPhone?: string;
  address?: string;
  notes?: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  vehicle?: { id: string; vehicleNumber: string };
  employee?: { id: string; user: { firstName: string; lastName: string } };
}

export interface CreateTransportDriverDto {
  vehicleId?: string;
  employeeId?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  licenseClass?: string;
  experienceYears?: number;
  contactPhone?: string;
  address?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Transport Attendant
// ---------------------------------------------------------------------------
export interface TransportAttendant {
  id: string;
  organizationId: string;
  vehicleId?: string;
  employeeId?: string;
  attendantCode: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  vehicle?: { id: string; vehicleNumber: string };
  employee?: { id: string; user: { firstName: string; lastName: string } };
}

export interface CreateTransportAttendantDto {
  vehicleId?: string;
  employeeId?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
export interface Route {
  id: string;
  organizationId: string;
  facilityId?: string;
  routeCode: string;
  name: string;
  description?: string;
  startLocation?: string;
  endLocation?: string;
  totalDistance?: number;
  estimatedMinutes?: number;
  feeAmount?: number;
  feeStructureId?: string;
  isActive: boolean;
  status: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  stops?: RouteStop[];
  facility?: { id: string; name: string };
}

export interface CreateRouteDto {
  facilityId?: string;
  name: string;
  description?: string;
  startLocation?: string;
  endLocation?: string;
  totalDistance?: number;
  estimatedMinutes?: number;
  feeAmount?: number;
  feeStructureId?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Route Stop
// ---------------------------------------------------------------------------
export interface RouteStop {
  id: string;
  routeId: string;
  stopName: string;
  stopOrder: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  pickupTime?: string;
  dropTime?: string;
  landmarkNotes?: string;
  createdAt: Date | string;
}

export interface CreateRouteStopDto {
  stopName: string;
  stopOrder: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  pickupTime?: string;
  dropTime?: string;
  landmarkNotes?: string;
}

// ---------------------------------------------------------------------------
// Student Transport Assignment
// ---------------------------------------------------------------------------
export interface StudentTransportAssignment {
  id: string;
  organizationId: string;
  studentId: string;
  routeId: string;
  stopId?: string;
  academicYearId?: string;
  assignmentType: TransportAssignmentType;
  pickupAddress?: string;
  dropAddress?: string;
  guardianContact?: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
  isActive: boolean;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: { id: string; admissionNumber: string; user: { firstName: string; lastName: string } };
  route?: { id: string; routeCode: string; name: string };
  stop?: { id: string; stopName: string };
}

export interface CreateStudentTransportAssignmentDto {
  studentId: string;
  routeId: string;
  stopId?: string;
  academicYearId?: string;
  assignmentType?: TransportAssignmentType;
  pickupAddress?: string;
  dropAddress?: string;
  guardianContact?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Transport Schedule
// ---------------------------------------------------------------------------
export interface TransportSchedule {
  id: string;
  organizationId: string;
  routeId: string;
  vehicleId?: string;
  driverId?: string;
  attendantId?: string;
  scheduleDate: Date | string;
  departureTime?: string;
  arrivalTime?: string;
  tripType: string;
  status: TransportScheduleStatus;
  delayMinutes?: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  route?: { id: string; routeCode: string; name: string };
  vehicle?: { id: string; vehicleNumber: string };
  driver?: { id: string; driverCode: string };
  attendant?: { id: string; attendantCode: string };
}

export interface CreateTransportScheduleDto {
  routeId: string;
  vehicleId?: string;
  driverId?: string;
  attendantId?: string;
  scheduleDate: string;
  departureTime?: string;
  arrivalTime?: string;
  tripType?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Boarding Event
// ---------------------------------------------------------------------------
export interface BoardingEvent {
  id: string;
  organizationId: string;
  scheduleId?: string;
  vehicleId?: string;
  studentId: string;
  stopId?: string;
  eventType: BoardingEventType;
  eventTime: Date | string;
  recordedBy?: string;
  guardianName?: string;
  notes?: string;
  createdAt: Date | string;
  student?: { id: string; admissionNumber: string; user: { firstName: string; lastName: string } };
}

export interface RecordBoardingEventDto {
  scheduleId?: string;
  vehicleId?: string;
  studentId: string;
  stopId?: string;
  eventType: BoardingEventType;
  eventTime?: string;
  guardianName?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Transport Incident
// ---------------------------------------------------------------------------
export interface TransportIncident {
  id: string;
  organizationId: string;
  vehicleId?: string;
  driverId?: string;
  incidentNumber: string;
  incidentDate: Date | string;
  location?: string;
  description: string;
  severity: IncidentSeverity;
  reportedBy?: string;
  actionTaken?: string;
  isResolved: boolean;
  resolvedAt?: Date | string;
  resolvedBy?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  vehicle?: { id: string; vehicleNumber: string };
  driver?: { id: string; driverCode: string };
  involvedStudents?: IncidentStudentRecord[];
}

export interface IncidentStudentRecord {
  id: string;
  incidentId: string;
  studentId: string;
  notes?: string;
  student?: { id: string; admissionNumber: string; user: { firstName: string; lastName: string } };
}

export interface ReportIncidentDto {
  vehicleId?: string;
  driverId?: string;
  incidentDate: string;
  location?: string;
  description: string;
  severity?: IncidentSeverity;
  actionTaken?: string;
  involvedStudentIds?: string[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// Vehicle Maintenance
// ---------------------------------------------------------------------------
export interface VehicleMaintenance {
  id: string;
  organizationId: string;
  vehicleId: string;
  maintenanceNumber: string;
  maintenanceType: MaintenanceType;
  scheduledDate?: Date | string;
  completedDate?: Date | string;
  description: string;
  serviceProvider?: string;
  cost?: number;
  odometerAtService?: number;
  nextServiceDue?: Date | string;
  isCompleted: boolean;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  vehicle?: { id: string; vehicleNumber: string };
}

export interface CreateMaintenanceDto {
  vehicleId: string;
  maintenanceType?: MaintenanceType;
  scheduledDate?: string;
  description: string;
  serviceProvider?: string;
  cost?: number;
  odometerAtService?: number;
  nextServiceDue?: string;
  notes?: string;
}

export interface CompleteMaintenanceDto {
  completedDate?: string;
  cost?: number;
  odometerAtService?: number;
  nextServiceDue?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Fuel Record
// ---------------------------------------------------------------------------
export interface VehicleFuelRecord {
  id: string;
  organizationId: string;
  vehicleId: string;
  fuelDate: Date | string;
  liters: number;
  pricePerLiter?: number;
  totalCost?: number;
  odometer?: number;
  fuelStation?: string;
  recordedBy?: string;
  notes?: string;
  createdAt: Date | string;
  vehicle?: { id: string; vehicleNumber: string };
}

export interface CreateFuelRecordDto {
  vehicleId: string;
  fuelDate: string;
  liters: number;
  pricePerLiter?: number;
  totalCost?: number;
  odometer?: number;
  fuelStation?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Transport Analytics / Reports
// ---------------------------------------------------------------------------
export interface TransportFleetSummary {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  outOfServiceVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  totalRoutes: number;
  activeRoutes: number;
  totalAssignedStudents: number;
  scheduledToday: number;
}

export interface RouteOccupancySummary {
  routeId: string;
  routeCode: string;
  routeName: string;
  capacity: number;
  assignedStudents: number;
  occupancyPercent: number;
}

export interface VehicleExpiryAlert {
  vehicleId: string;
  vehicleNumber: string;
  registrationNumber: string;
  alertType: 'INSURANCE' | 'FITNESS' | 'TAX' | 'PERMIT' | 'SERVICE';
  expiryDate: Date | string;
  daysUntilExpiry: number;
}

export interface DriverLicenseExpiryAlert {
  driverId: string;
  driverCode: string;
  licenseNumber: string;
  licenseExpiry: Date | string;
  daysUntilExpiry: number;
}
