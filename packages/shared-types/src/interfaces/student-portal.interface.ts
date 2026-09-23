// =============================================================================
// Phase 4O: Student Portal Interfaces and DTOs
// =============================================================================

export interface IStudentDashboardOverview {
  studentId: string;
  fullName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  avatarUrl: string | null;
  attendancePercentage: number;
  todayAttendanceStatus: string | null;
  todayClassesCount: number;
  upcomingExamsCount: number;
  nextExam: {
    subjectName: string;
    examDate: string;
    startTime: string;
    roomName?: string | null;
  } | null;
  latestResult: {
    examName: string;
    subjectName: string;
    marksObtained: number;
    maxMarks: number;
    grade: string | null;
    percentage: number | null;
  } | null;
  unreadNoticesCount: number;
  activeLibraryLoansCount: number;
  overdueLibraryLoansCount: number;
  hasTransport: boolean;
  transportPickupTime?: string | null;
  hasHostel: boolean;
  hostelRoomNumber?: string | null;
  feeBalanceOutstanding: number;
  attentionItems: Array<{
    id: string;
    type: 'ATTENDANCE' | 'EXAM' | 'LIBRARY' | 'FEE' | 'NOTICE';
    severity: 'info' | 'warning' | 'danger';
    title: string;
    message: string;
    linkTab?: string;
  }>;
}

export interface IStudentProfile {
  id: string;
  userId: string;
  admissionNumber: string;
  admissionDate: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  gender: string | null;
  dateOfBirth: string;
  bloodGroup: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  lifecycleStatus: string;
  currentClass: string;
  currentSection: string;
  academicYear: string;
  campusName: string;
  guardians: Array<{
    name: string;
    relationship: string;
    isPrimary: boolean;
    canPickup: boolean;
  }>;
}

export interface IStudentAcademicDetails {
  className: string;
  sectionName: string;
  rollNumber: string | null;
  academicYear: string;
  campusName: string;
  classTeacher: {
    name: string;
    email?: string | null;
  } | null;
  enrolledSubjectsCount: number;
}

export interface IStudentSubject {
  id: string;
  subjectCode: string;
  subjectName: string;
  category: string;
  weeklyPeriods: number;
  teacherName: string | null;
  teacherEmail?: string | null;
}

export interface IStudentTimetablePeriod {
  periodId: string;
  periodName: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  dayOfWeek: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string | null;
  roomNumber: string | null;
}

export interface IStudentTimetable {
  academicYear: string;
  className: string;
  sectionName: string;
  effectiveFrom?: string;
  todayEntries: IStudentTimetablePeriod[];
  weeklyEntries: Record<string, IStudentTimetablePeriod[]>;
}

export interface IStudentAttendanceRecord {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';
  remarks: string | null;
}

export interface IStudentAttendanceAlert {
  type: 'LOW_ATTENDANCE' | 'CONSECUTIVE_ABSENCE' | 'FREQUENT_LATE';
  message: string;
  severity: 'warning' | 'danger';
}

export interface IStudentAttendanceSummary {
  studentId: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  excusedDays: number;
  attendancePercentage: number;
  todayStatus: string | null;
  recentRecords: IStudentAttendanceRecord[];
  alerts: IStudentAttendanceAlert[];
}

export interface IStudentExamSchedule {
  id: string;
  examSessionName: string;
  subjectName: string;
  subjectCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomName: string | null;
  maxMarks: number;
  passingMarks: number;
  instructions?: string | null;
}

export interface IStudentExamResult {
  id: string;
  examSessionName: string;
  academicTerm: string;
  subjectName: string;
  subjectCode: string;
  maxMarks: number;
  passingMarks: number;
  marksObtained: number;
  percentage: number;
  grade: string;
  gradePoint: number | null;
  isPassed: boolean;
  remarks: string | null;
  status: string;
}

export interface IStudentReportCard {
  id: string;
  examSessionName: string;
  academicYear: string;
  issueDate: string;
  attendancePercentage: number | null;
  daysPresent: number | null;
  daysAbsent: number | null;
  teacherRemarks: string | null;
  principalRemarks: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  pdfUrl?: string | null;
}

export interface IStudentPastEnrollment {
  academicYear: string;
  className: string;
  sectionName: string;
  rollNumber: string | null;
  status: string;
  overallGpa?: number | null;
}

export interface IStudentAcademicHistory {
  studentId: string;
  pastEnrollments: IStudentPastEnrollment[];
  pastReportCards: IStudentReportCard[];
}

export interface IStudentCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  category: 'HOLIDAY' | 'EXAMINATION' | 'EVENT' | 'TERM_START' | 'TERM_END' | 'STAFF_DEVELOPMENT' | 'OTHER';
  startDate: string;
  endDate: string;
  isHoliday: boolean;
}

export interface IStudentNotice {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt: string;
  expiresAt: string | null;
  authorName: string;
  targetAudience: string;
}

export interface IStudentLibraryLoan {
  id: string;
  bookTitle: string;
  isbn: string | null;
  borrowedDate: string;
  dueDate: string;
  isOverdue: boolean;
  fineAmount: number;
}

export interface IStudentLibraryInfo {
  hasMembership: boolean;
  membershipNumber: string | null;
  activeLoans: IStudentLibraryLoan[];
  totalOutstandingFines: number;
}

export interface IStudentTransportInfo {
  hasAssignment: boolean;
  assignment?: {
    routeName: string;
    routeCode: string;
    stopName: string | null;
    pickupTime: string | null;
    dropTime: string | null;
    vehicleNumber: string | null;
    driverName: string | null;
    driverPhone: string | null;
  };
  recentBoardings: Array<{
    date: string;
    eventType: 'BOARDED' | 'ALIGHTED' | 'NO_SHOW';
    tripType: string;
    stopName: string | null;
    timestamp: string;
  }>;
}

export interface IStudentHostelInfo {
  hasAllocation: boolean;
  allocation?: {
    hostelName: string;
    roomNumber: string;
    bedNumber: string;
    checkInDate: string;
    status: string;
  };
  recentAttendances: Array<{
    date: string;
    session: string;
    status: string;
  }>;
  recentOutings: Array<{
    outingType: string;
    startDate: string;
    expectedReturn: string;
    actualReturn: string | null;
    destination: string;
    status: string;
  }>;
}

export interface IStudentInvoiceItem {
  id: string;
  description: string;
  amount: number;
}

export interface IStudentPaymentReceipt {
  transactionId: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  status: string;
}

export interface IStudentFeeSummary {
  totalInvoiced: number;
  totalDiscount: number;
  totalPaid: number;
  balanceOutstanding: number;
  paymentGatewayConfigured: boolean;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    remainingBalance: number;
    status: string;
    lineItems: IStudentInvoiceItem[];
    payments: IStudentPaymentReceipt[];
  }>;
}

export interface IStudentDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileKey: string;
  sizeInBytes: number | null;
  mimeType: string;
  createdAt: string;
  verifiedAt: string | null;
}

export interface IUpdateStudentProfileDto {
  phone?: string;
  address?: string;
  emergencyContactPhone?: string;
}

export interface IStudentPreferencesDto {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  preferredLanguage?: string;
}

export interface IStudentMessageDto {
  recipientRole: 'CLASS_TEACHER' | 'ADMINISTRATION';
  subject: string;
  content: string;
}
