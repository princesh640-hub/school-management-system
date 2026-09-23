export type AttendanceStatusType =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'EXCUSED'
  | 'ON_LEAVE'
  | 'REMOTE';

export type AttendanceSource =
  | 'MANUAL'
  | 'WEB'
  | 'MOBILE'
  | 'IMPORT'
  | 'BIOMETRIC'
  | 'RFID'
  | 'BARCODE'
  | 'API';

export type AttendanceSessionType =
  | 'FULL_DAY'
  | 'MORNING'
  | 'AFTERNOON'
  | 'PERIOD';

export type CorrectionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type CorrectionTargetType =
  | 'STUDENT'
  | 'EMPLOYEE';

export type AttendanceLockScope =
  | 'DATE'
  | 'SECTION'
  | 'SESSION'
  | 'MONTH';

export interface AttendanceSessionEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  academicYearId: string;
  classId: string;
  sectionId: string;
  date: Date | string;
  sessionType: AttendanceSessionType;
  subjectId?: string | null;
  isLocked: boolean;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface EmployeeAttendanceEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  employeeId: string;
  date: Date | string;
  status: AttendanceStatusType;
  checkInTime?: Date | string | null;
  checkOutTime?: Date | string | null;
  source: AttendanceSource;
  remarks?: string | null;
  isLocked: boolean;
  employee?: {
    id: string;
    employeeCode: string;
    designation: string;
    user?: {
      firstName: string;
      lastName: string;
      email?: string;
    };
    department?: {
      id: string;
      name: string;
    } | null;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AttendanceCorrectionEntity {
  id: string;
  organizationId: string;
  targetType: CorrectionTargetType;
  attendanceRecordId?: string | null;
  employeeAttendanceId?: string | null;
  originalStatus: AttendanceStatusType;
  requestedStatus: AttendanceStatusType;
  reason: string;
  status: CorrectionStatus;
  requesterId: string;
  reviewerId?: string | null;
  decisionReason?: string | null;
  reviewedAt?: Date | string | null;
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AttendanceLockEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  academicYearId?: string | null;
  scopeType: AttendanceLockScope;
  targetDate?: Date | string | null;
  sectionId?: string | null;
  month?: number | null;
  year?: number | null;
  isLocked: boolean;
  lockedBy: string;
  lockedAt: Date | string;
  unlockedBy?: string | null;
  unlockedAt?: Date | string | null;
  unlockReason?: string | null;
}

export interface AttendanceThresholdEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  minimumPercentage: number;
  warningPercentage: number;
  criticalPercentage: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AttendanceSummaryResponse {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount?: number;
  excusedCount?: number;
  attendanceRate: number;
  isLocked?: boolean;
}

export interface AbsenceStreakRecord {
  studentId: string;
  studentName: string;
  consecutiveDays: number;
  lastAbsenceDate: Date | string;
  sectionId?: string;
  className?: string;
  sectionName?: string;
}

export type AttendanceSession = AttendanceSessionEntity;
export type EmployeeAttendance = EmployeeAttendanceEntity;
export type AttendanceCorrection = AttendanceCorrectionEntity;
export type AttendanceLock = AttendanceLockEntity;
export type AttendanceThreshold = AttendanceThresholdEntity;

