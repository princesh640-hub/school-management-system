// =============================================================================
// Phase 4P: Teacher Portal Interfaces and DTOs
// =============================================================================

export interface ITeacherDashboardOverview {
  teacherId: string;
  fullName: string;
  employeeCode: string;
  specialization: string | null;
  avatarUrl: string | null;
  todayClassesCount: number;
  totalAssignedSections: number;
  totalAssignedSubjects: number;
  weeklyTeachingPeriods: number;
  pendingAttendanceSectionsCount: number;
  pendingMarksExamsCount: number;
  upcomingExamsCount: number;
  todaySchedule: Array<{
    periodNumber: number;
    startTime: string;
    endTime: string;
    subjectName: string;
    className: string;
    sectionName: string;
    roomNumber: string | null;
  }>;
  pendingTasks: Array<{
    id: string;
    type: 'ATTENDANCE' | 'MARKS' | 'EXAM' | 'NOTICE';
    severity: 'info' | 'warning' | 'danger';
    title: string;
    description: string;
    actionTab?: string;
    referenceId?: string;
  }>;
  leaveSummary: {
    availableDays: number;
    pendingApplicationsCount: number;
  };
}

export interface ITeacherProfile {
  id: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  specialization: string | null;
  qualification: string | null;
  joiningDate: string;
  status: string;
  departmentName: string | null;
  designationTitle: string | null;
  campusName: string;
  assignedSectionsCount: number;
  assignedSubjectsCount: number;
}

export interface ITeachingAssignment {
  id: string;
  assignmentType: 'CLASS_TEACHER' | 'SUBJECT_TEACHER';
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  academicYear: string;
  studentCount: number;
  weeklyPeriods?: number;
}

export interface ITeacherSectionWorkspace {
  sectionId: string;
  className: string;
  sectionName: string;
  isClassTeacher: boolean;
  studentCount: number;
  subjectsTaught: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    weeklyPeriods: number;
  }>;
  todayAttendanceMarked: boolean;
}

export interface ITeacherSubjectWorkspace {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  category: string;
  sections: Array<{
    sectionId: string;
    className: string;
    sectionName: string;
    studentCount: number;
    weeklyPeriods: number;
  }>;
}

export interface ITeacherStudentSummary {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  rollNumber: string | null;
  className: string;
  sectionName: string;
  avatarUrl: string | null;
  attendancePercentage: number;
  gender?: string | null;
}

export interface ITeacherStudentDetail {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  rollNumber: string | null;
  className: string;
  sectionName: string;
  avatarUrl: string | null;
  attendancePercentage: number;
  attendanceSummary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
  };
  enrolledSubjects: Array<{
    subjectName: string;
    subjectCode: string;
    teacherName: string | null;
  }>;
  recentResults: Array<{
    examName: string;
    subjectName: string;
    marksObtained: number;
    maxMarks: number;
    grade: string | null;
    percentage: number | null;
    isPassed: boolean;
  }>;
}

export interface ITeacherTimetableSlot {
  periodId: string;
  periodName: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  isBreak: boolean;
  subjectName: string;
  subjectCode: string;
  className: string;
  sectionName: string;
  roomNumber: string | null;
}

export interface ITeacherTimetable {
  todayEntries: ITeacherTimetableSlot[];
  weeklyEntries: Record<string, ITeacherTimetableSlot[]>;
}

export interface ITeacherAttendanceStudent {
  studentId: string;
  admissionNumber: string;
  rollNumber: string | null;
  fullName: string;
  avatarUrl: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';
  remarks?: string | null;
}

export interface ITeacherAttendanceRoster {
  sectionId: string;
  className: string;
  sectionName: string;
  date: string;
  isMarked: boolean;
  isLocked: boolean;
  students: ITeacherAttendanceStudent[];
}

export interface ITeacherMarkAttendanceDto {
  sectionId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';
    remarks?: string;
  }>;
}

export interface ITeacherAttendanceCorrectionDto {
  sectionId: string;
  studentId: string;
  date: string;
  requestedStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';
  reason: string;
}

export interface ITeacherExamTask {
  examScheduleId: string;
  examSessionName: string;
  subjectName: string;
  subjectCode: string;
  className: string;
  sectionName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  maxMarks: number;
  passingMarks: number;
  totalStudents: number;
  enteredMarksCount: number;
  isSubmitted: boolean;
  status: string;
}

export interface ITeacherMarksStudent {
  studentId: string;
  admissionNumber: string;
  rollNumber: string | null;
  fullName: string;
  marksObtained: number | null;
  isAbsent: boolean;
  isExempt: boolean;
  grade: string | null;
  remarks?: string | null;
  status: string;
}

export interface ITeacherMarksRoster {
  examScheduleId: string;
  examSessionName: string;
  subjectName: string;
  className: string;
  sectionName: string;
  maxMarks: number;
  passingMarks: number;
  isSubmitted: boolean;
  students: ITeacherMarksStudent[];
}

export interface ITeacherSubmitMarksDto {
  examScheduleId: string;
  records: Array<{
    studentId: string;
    marksObtained?: number;
    isAbsent?: boolean;
    isExempt?: boolean;
    remarks?: string;
  }>;
  submitFinal?: boolean;
}

export interface ITeacherMarksCorrectionDto {
  examResultId: string;
  requestedMarks: number;
  reason: string;
}

export interface ITeacherResultSummary {
  examScheduleId: string;
  examSessionName: string;
  subjectName: string;
  className: string;
  sectionName: string;
  totalAppeared: number;
  totalPassed: number;
  totalFailed: number;
  passPercentage: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
}

export interface ITeacherLeaveSummary {
  leaveBalances: Array<{
    leaveTypeId: string;
    leaveTypeName: string;
    allocatedDays: number;
    usedDays: number;
    remainingDays: number;
  }>;
  recentApplications: Array<{
    id: string;
    leaveTypeName: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    appliedAt: string;
  }>;
}

export interface ITeacherLeaveApplicationDto {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ITeacherNotice {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt: string;
  authorName: string;
  targetAudience: string;
}

export interface ITeacherClassMessageDto {
  sectionId: string;
  title: string;
  content: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}
