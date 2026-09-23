// =============================================================================
// Phase 4K: Hostel Management — Shared Type Definitions
// =============================================================================

export type HostelStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'UNDER_MAINTENANCE'
  | 'CLOSED';

export type HostelType =
  | 'BOYS'
  | 'GIRLS'
  | 'COED'
  | 'STAFF'
  | 'OTHER';

export type HostelRoomType =
  | 'DORMITORY'
  | 'SHARED_ROOM'
  | 'SINGLE_ROOM'
  | 'SPECIAL'
  | 'OTHER';

export type HostelGenderEligibility =
  | 'MALE'
  | 'FEMALE'
  | 'ANY';

export type HostelRoomStatus =
  | 'AVAILABLE'
  | 'FULL'
  | 'MAINTENANCE'
  | 'INACTIVE';

export type HostelBedStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'BLOCKED'
  | 'RETIRED';

export type HostelAllocationStatus =
  | 'RESERVED'
  | 'ACTIVE'
  | 'TRANSFERRED'
  | 'CHECKED_OUT'
  | 'CANCELLED';

export type HostelAttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'OUT'
  | 'LATE'
  | 'EXCUSED'
  | 'OTHER';

export type HostelStaffRole =
  | 'WARDEN'
  | 'ASSISTANT_WARDEN'
  | 'CARETAKER'
  | 'SUPERVISOR'
  | 'OTHER';

export type HostelOutingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'OUT'
  | 'RETURNED'
  | 'CANCELLED'
  | 'LATE_RETURN';

export type HostelOutingType =
  | 'DAY_OUTING'
  | 'OVERNIGHT'
  | 'WEEKEND'
  | 'EMERGENCY'
  | 'OTHER';

export type HostelMaintenancePriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

export type HostelMaintenanceStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export type HostelVisitorStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED';

export type HostelIncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'CLOSED';

export type IncidentSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

// ---------------------------------------------------------------------------
// Hostel
// ---------------------------------------------------------------------------
export interface Hostel {
  id: string;
  organizationId: string;
  campusId?: string;
  name: string;
  code: string;
  hostelType: HostelType;
  status: HostelStatus;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  capacity: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  updatedBy?: string;
  campus?: { id: string; name: string };
  buildings?: HostelBuilding[];
  rooms?: HostelRoom[];
  _count?: {
    buildings: number;
    rooms: number;
    allocations: number;
    wardens: number;
  };
}

export interface CreateHostelDto {
  campusId?: string;
  name: string;
  code: string;
  hostelType?: HostelType;
  status?: HostelStatus;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  capacity?: number;
  notes?: string;
}

export interface UpdateHostelDto {
  name?: string;
  campusId?: string;
  hostelType?: HostelType;
  status?: HostelStatus;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  capacity?: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Building
// ---------------------------------------------------------------------------
export interface HostelBuilding {
  id: string;
  hostelId: string;
  name: string;
  code: string;
  capacity: number;
  status: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  updatedBy?: string;
  hostel?: { id: string; name: string; code: string };
  floors?: HostelFloor[];
  rooms?: HostelRoom[];
}

export interface CreateHostelBuildingDto {
  hostelId: string;
  name: string;
  code: string;
  capacity?: number;
  status?: string;
  notes?: string;
}

export interface UpdateHostelBuildingDto {
  name?: string;
  code?: string;
  capacity?: number;
  status?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Floor
// ---------------------------------------------------------------------------
export interface HostelFloor {
  id: string;
  hostelId: string;
  buildingId?: string;
  floorNumber: number;
  name: string;
  status: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  building?: { id: string; name: string };
  rooms?: HostelRoom[];
}

export interface CreateHostelFloorDto {
  hostelId: string;
  buildingId?: string;
  floorNumber: number;
  name: string;
  status?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Room
// ---------------------------------------------------------------------------
export interface HostelRoom {
  id: string;
  hostelId: string;
  buildingId?: string;
  floorId?: string;
  roomNumber: string;
  name?: string;
  roomType: HostelRoomType;
  genderEligibility: HostelGenderEligibility;
  capacity: number;
  status: HostelRoomStatus;
  facilities: string[];
  feeAmount?: number;
  feeStructureId?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  updatedBy?: string;
  hostel?: { id: string; name: string; code: string };
  building?: { id: string; name: string };
  floor?: { id: string; name: string; floorNumber: number };
  beds?: HostelBed[];
  allocations?: HostelAllocation[];
  _count?: {
    beds: number;
    allocations: number;
  };
}

export interface CreateHostelRoomDto {
  hostelId: string;
  buildingId?: string;
  floorId?: string;
  roomNumber: string;
  name?: string;
  roomType?: HostelRoomType;
  genderEligibility?: HostelGenderEligibility;
  capacity: number;
  status?: HostelRoomStatus;
  facilities?: string[];
  feeAmount?: number;
  feeStructureId?: string;
  notes?: string;
}

export interface UpdateHostelRoomDto {
  roomNumber?: string;
  name?: string;
  roomType?: HostelRoomType;
  genderEligibility?: HostelGenderEligibility;
  capacity?: number;
  status?: HostelRoomStatus;
  facilities?: string[];
  feeAmount?: number;
  feeStructureId?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Bed
// ---------------------------------------------------------------------------
export interface HostelBed {
  id: string;
  roomId: string;
  bedNumber: string;
  status: HostelBedStatus;
  condition: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  room?: {
    id: string;
    roomNumber: string;
    hostel?: { id: string; name: string };
  };
}

export interface CreateHostelBedDto {
  roomId: string;
  bedNumber: string;
  status?: HostelBedStatus;
  condition?: string;
  notes?: string;
}

export interface UpdateHostelBedDto {
  bedNumber?: string;
  status?: HostelBedStatus;
  condition?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Allocation / Residence
// ---------------------------------------------------------------------------
export interface HostelAllocation {
  id: string;
  organizationId: string;
  allocationNumber: string;
  studentId: string;
  hostelId: string;
  buildingId?: string;
  floorId?: string;
  roomId: string;
  bedId?: string;
  academicYearId?: string;
  allocationDate: Date | string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
  status: HostelAllocationStatus;
  checkInDate?: Date | string;
  checkInNotes?: string;
  checkOutDate?: Date | string;
  checkOutReason?: string;
  checkOutNotes?: string;
  allocatedBy?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
  isOverride: boolean;
  overrideReason?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  updatedBy?: string;
  student?: {
    id: string;
    admissionNumber: string;
    user: { firstName: string; lastName: string; email?: string; phone?: string };
  };
  hostel?: { id: string; name: string; code: string };
  building?: { id: string; name: string };
  room?: { id: string; roomNumber: string; roomType: HostelRoomType };
  bed?: { id: string; bedNumber: string };
}

export interface CreateHostelAllocationDto {
  studentId: string;
  hostelId: string;
  buildingId?: string;
  floorId?: string;
  roomId: string;
  bedId?: string;
  academicYearId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isOverride?: boolean;
  overrideReason?: string;
  notes?: string;
}

export interface BulkHostelAllocationDto {
  hostelId: string;
  roomId: string;
  studentIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  isOverride?: boolean;
  overrideReason?: string;
  notes?: string;
}

export interface CheckInDto {
  checkInDate?: string;
  notes?: string;
}

export interface CheckOutDto {
  checkOutDate?: string;
  reason: string;
  notes?: string;
  bedCondition?: string;
}

export interface TransferAllocationDto {
  newHostelId: string;
  newRoomId: string;
  newBedId?: string;
  effectiveDate: string;
  reason: string;
  notes?: string;
  isOverride?: boolean;
  overrideReason?: string;
}

// ---------------------------------------------------------------------------
// Hostel Attendance
// ---------------------------------------------------------------------------
export interface HostelAttendance {
  id: string;
  organizationId: string;
  hostelId: string;
  studentId: string;
  roomId?: string;
  date: Date | string;
  session: string;
  status: HostelAttendanceStatus;
  recordedBy?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: {
    id: string;
    admissionNumber: string;
    user: { firstName: string; lastName: string };
  };
  hostel?: { id: string; name: string };
  room?: { id: string; roomNumber: string };
}

export interface MarkHostelAttendanceDto {
  hostelId: string;
  studentId: string;
  roomId?: string;
  date: string;
  session?: string;
  status: HostelAttendanceStatus;
  notes?: string;
}

export interface BulkMarkHostelAttendanceDto {
  hostelId: string;
  date: string;
  session?: string;
  records: Array<{
    studentId: string;
    roomId?: string;
    status: HostelAttendanceStatus;
    notes?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Hostel Warden / Staff
// ---------------------------------------------------------------------------
export interface HostelWarden {
  id: string;
  organizationId: string;
  employeeId: string;
  hostelId: string;
  buildingId?: string;
  role: HostelStaffRole;
  startDate: Date | string;
  endDate?: Date | string;
  status: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: string;
  updatedBy?: string;
  employee?: {
    id: string;
    employeeCode: string;
    user: { firstName: string; lastName: string; phone?: string; email?: string };
  };
  hostel?: { id: string; name: string; code: string };
  building?: { id: string; name: string };
}

export interface AssignHostelWardenDto {
  employeeId: string;
  hostelId: string;
  buildingId?: string;
  role?: HostelStaffRole;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateHostelWardenDto {
  role?: HostelStaffRole;
  endDate?: string;
  status?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Outing / Curfew
// ---------------------------------------------------------------------------
export interface HostelOuting {
  id: string;
  organizationId: string;
  outingNumber: string;
  studentId: string;
  hostelId: string;
  outingType: HostelOutingType;
  startDate: Date | string;
  expectedReturn: Date | string;
  actualReturn?: Date | string;
  destination?: string;
  reason: string;
  guardianConsent: boolean;
  guardianContact?: string;
  status: HostelOutingStatus;
  approvedBy?: string;
  approvalNotes?: string;
  recordedBy?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: {
    id: string;
    admissionNumber: string;
    user: { firstName: string; lastName: string; phone?: string };
  };
  hostel?: { id: string; name: string };
}

export interface CreateHostelOutingDto {
  studentId: string;
  hostelId: string;
  outingType?: HostelOutingType;
  startDate: string;
  expectedReturn: string;
  destination?: string;
  reason: string;
  guardianConsent?: boolean;
  guardianContact?: string;
  notes?: string;
}

export interface ApproveHostelOutingDto {
  approved: boolean;
  approvalNotes?: string;
}

export interface RecordOutingReturnDto {
  actualReturn?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Visitor
// ---------------------------------------------------------------------------
export interface HostelVisitor {
  id: string;
  organizationId: string;
  visitorNumber: string;
  studentId: string;
  hostelId: string;
  visitorName: string;
  relationship?: string;
  contactPhone?: string;
  idProofType?: string;
  idProofNumber?: string;
  visitDate: Date | string;
  purpose: string;
  entryTime?: Date | string;
  exitTime?: Date | string;
  status: HostelVisitorStatus;
  approvedBy?: string;
  recordedBy?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  student?: {
    id: string;
    admissionNumber: string;
    user: { firstName: string; lastName: string };
  };
  hostel?: { id: string; name: string };
}

export interface CreateHostelVisitorDto {
  studentId: string;
  hostelId: string;
  visitorName: string;
  relationship?: string;
  contactPhone?: string;
  idProofType?: string;
  idProofNumber?: string;
  visitDate: string;
  purpose: string;
  entryTime?: string;
  exitTime?: string;
  notes?: string;
}

export interface UpdateVisitorStatusDto {
  status: HostelVisitorStatus;
  entryTime?: string;
  exitTime?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Incident
// ---------------------------------------------------------------------------
export interface HostelIncident {
  id: string;
  organizationId: string;
  incidentNumber: string;
  incidentDate: Date | string;
  hostelId: string;
  buildingId?: string;
  roomId?: string;
  category: string;
  description: string;
  severity: IncidentSeverity;
  immediateAction?: string;
  followUp?: string;
  status: HostelIncidentStatus;
  reportedBy?: string;
  reviewedBy?: string;
  resolvedAt?: Date | string;
  resolvedBy?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  hostel?: { id: string; name: string };
  building?: { id: string; name: string };
  room?: { id: string; roomNumber: string };
  involvedStudents?: Array<{
    id: string;
    studentId: string;
    role?: string;
    student?: {
      id: string;
      admissionNumber: string;
      user: { firstName: string; lastName: string };
    };
  }>;
}

export interface CreateHostelIncidentDto {
  hostelId: string;
  buildingId?: string;
  roomId?: string;
  incidentDate: string;
  category: string;
  description: string;
  severity?: IncidentSeverity;
  immediateAction?: string;
  followUp?: string;
  involvedStudentIds?: string[];
  notes?: string;
}

export interface ResolveHostelIncidentDto {
  followUp?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hostel Maintenance Request
// ---------------------------------------------------------------------------
export interface HostelMaintenanceRequest {
  id: string;
  organizationId: string;
  requestNumber: string;
  hostelId: string;
  buildingId?: string;
  roomId?: string;
  issueCategory: string;
  description: string;
  priority: HostelMaintenancePriority;
  status: HostelMaintenanceStatus;
  reportedBy?: string;
  assignedToId?: string;
  scheduledDate?: Date | string;
  completedDate?: Date | string;
  cost?: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  hostel?: { id: string; name: string };
  building?: { id: string; name: string };
  room?: { id: string; roomNumber: string };
  assignedTo?: {
    id: string;
    employeeCode: string;
    user: { firstName: string; lastName: string };
  };
}

export interface CreateHostelMaintenanceDto {
  hostelId: string;
  buildingId?: string;
  roomId?: string;
  issueCategory: string;
  description: string;
  priority?: HostelMaintenancePriority;
  assignedToId?: string;
  scheduledDate?: string;
  notes?: string;
}

export interface UpdateHostelMaintenanceStatusDto {
  status: HostelMaintenanceStatus;
  completedDate?: string;
  cost?: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Analytics & Reporting Contracts
// ---------------------------------------------------------------------------
export interface HostelDashboardSummary {
  totalHostels: number;
  totalBuildings: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  activeResidents: number;
  studentsOnOuting: number;
  pendingOutings: number;
  openIncidents: number;
  openMaintenanceRequests: number;
  todayAttendance: {
    present: number;
    absent: number;
    out: number;
    late: number;
  };
}

export interface RoomOccupancySummary {
  roomId: string;
  roomNumber: string;
  roomType: HostelRoomType;
  hostelId: string;
  hostelName: string;
  buildingName?: string;
  capacity: number;
  occupiedCount: number;
  availableCount: number;
  status: HostelRoomStatus;
}

export interface HostelAttendanceRosterItem {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  roomNumber: string;
  bedNumber?: string;
  status: HostelAttendanceStatus;
  notes?: string;
}
