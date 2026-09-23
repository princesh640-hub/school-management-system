export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type PeriodType =
  | 'TEACHING'
  | 'BREAK'
  | 'ASSEMBLY'
  | 'ACTIVITY'
  | 'LUNCH'
  | 'OTHER';

export type RoomType =
  | 'CLASSROOM'
  | 'LAB'
  | 'COMPUTER_LAB'
  | 'LIBRARY'
  | 'AUDITORIUM'
  | 'PLAYGROUND'
  | 'OTHER';

export type TimetableStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type SchedulingRunStatus =
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAILED';

export interface WorkingDayConfigEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startTime?: string | null;
  endTime?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TimetablePeriodEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  sequence: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  periodType: PeriodType;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface RoomEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  building?: string | null;
  floor?: string | null;
  capacity: number;
  roomType: RoomType;
  facilities: string[];
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface RoomAvailabilityEntity {
  id: string;
  roomId: string;
  dayOfWeek: DayOfWeek;
  periodId?: string | null;
  isAvailable: boolean;
  reason?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TeacherAvailabilityEntity {
  id: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  periodId?: string | null;
  isAvailable: boolean;
  reason?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TimetableTemplateEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  description?: string | null;
  totalPeriods: number;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TimetableVersionEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  academicYearId: string;
  termId?: string | null;
  versionNumber: number;
  name: string;
  status: TimetableStatus;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  publishedAt?: Date | string | null;
  publishedBy?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string | null;
}

export interface TimetableEntryEntity {
  id: string;
  timetableVersionId: string;
  dayOfWeek: DayOfWeek;
  periodId: string;
  sectionId: string;
  subjectOfferingId?: string | null;
  subjectId: string;
  teacherId?: string | null;
  roomId?: string | null;
  isLocked: boolean;
  customNotes?: string | null;
  period?: TimetablePeriodEntity;
  section?: {
    id: string;
    name: string;
    class?: { id: string; name: string };
  };
  subject?: { id: string; name: string; code: string };
  teacher?: {
    id: string;
    employeeCode: string;
    user?: { firstName: string; lastName: string };
  };
  room?: RoomEntity;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SchedulingConstraintEntity {
  id: string;
  organizationId: string;
  subjectId: string;
  preferredRoomType?: RoomType | null;
  maxConsecutive: number;
  requireConsecutive: boolean;
  preferredDays: DayOfWeek[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SchedulingRunEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  timetableVersionId?: string | null;
  status: SchedulingRunStatus;
  totalSlotsRequired: number;
  slotsScheduled: number;
  conflictsCount: number;
  unscheduledCount: number;
  diagnostics?: any;
  startedAt?: Date | string;
  completedAt?: Date | string | null;
  initiatedBy?: string | null;
}

// Conflict Reporting
export interface TimetableConflict {
  type: 'TEACHER' | 'ROOM' | 'SECTION' | 'CAPACITY' | 'AVAILABILITY' | 'AUTHORIZATION';
  severity: 'ERROR' | 'WARNING';
  message: string;
  dayOfWeek: DayOfWeek;
  periodId: string;
  periodName?: string;
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  sectionId?: string;
  sectionName?: string;
}

export interface TimetableConflictReport {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  conflicts: TimetableConflict[];
}

export interface SchedulingDiagnostic {
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  requestedPeriods: number;
  scheduledPeriods: number;
  reason: string;
  conflictingConstraints: string[];
  suggestedRemedy?: string;
}

// DTOs
export interface CreatePeriodDto {
  name: string;
  sequence: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  periodType?: PeriodType;
  campusId?: string;
}

export interface UpdatePeriodDto {
  name?: string;
  sequence?: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  periodType?: PeriodType;
  status?: string;
}

export interface CreateRoomDto {
  name: string;
  code: string;
  building?: string;
  floor?: string;
  capacity: number;
  roomType?: RoomType;
  facilities?: string[];
  campusId?: string;
}

export interface UpdateRoomDto {
  name?: string;
  code?: string;
  building?: string;
  floor?: string;
  capacity?: number;
  roomType?: RoomType;
  facilities?: string[];
  status?: string;
}

export interface SetTeacherAvailabilityDto {
  teacherId: string;
  dayOfWeek: DayOfWeek;
  periodId?: string;
  isAvailable: boolean;
  reason?: string;
}

export interface SetRoomAvailabilityDto {
  roomId: string;
  dayOfWeek: DayOfWeek;
  periodId?: string;
  isAvailable: boolean;
  reason?: string;
}

export interface CreateTimetableVersionDto {
  academicYearId: string;
  termId?: string;
  campusId?: string;
  name: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateTimetableEntryDto {
  timetableVersionId: string;
  dayOfWeek: DayOfWeek;
  periodId: string;
  sectionId: string;
  subjectId: string;
  subjectOfferingId?: string;
  teacherId?: string;
  roomId?: string;
  customNotes?: string;
  allowOverride?: boolean;
}

export interface PublishTimetableDto {
  effectiveFrom?: string;
  effectiveTo?: string;
  notifyStakeholders?: boolean;
}

export interface CopyDayScheduleDto {
  timetableVersionId: string;
  sourceDay: DayOfWeek;
  targetDay: DayOfWeek;
  sectionId?: string;
}

export interface CopySectionScheduleDto {
  timetableVersionId: string;
  sourceSectionId: string;
  targetSectionId: string;
}

export interface RunAutomatedSchedulerDto {
  timetableVersionId: string;
  campusId?: string;
  academicYearId: string;
  termId?: string;
  sectionIds?: string[];
  maxIterations?: number;
}

// Aliases
export type GenerateScheduleDto = RunAutomatedSchedulerDto;
export type WorkingDayConfig = WorkingDayConfigEntity;
export type TimetablePeriod = TimetablePeriodEntity;
export type Room = RoomEntity;
export type RoomAvailability = RoomAvailabilityEntity;
export type TeacherAvailability = TeacherAvailabilityEntity;
export type TimetableTemplate = TimetableTemplateEntity;
export type TimetableVersion = TimetableVersionEntity;
export type TimetableEntry = TimetableEntryEntity;
export type SchedulingConstraint = SchedulingConstraintEntity;
export type SchedulingRun = SchedulingRunEntity;
