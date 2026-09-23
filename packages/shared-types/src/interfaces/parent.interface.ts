// =============================================================================
// Phase 4N: Parent & Guardian Portal — Shared Type Definitions
// =============================================================================

export interface IParentChildSummary {
  studentId: string;
  userId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender?: string | null;
  avatarUrl?: string | null;
  gradeLevel?: string | null;
  className?: string | null;
  sectionName?: string | null;
  campusId?: string | null;
  campusName?: string | null;
  enrollmentStatus: string;
  relationship: string;
  isPrimaryGuardian: boolean;
  canPickup: boolean;
}

export interface IParentChildOverview {
  child: IParentChildSummary;
  attentionItems: {
    type: 'ATTENDANCE' | 'FEE' | 'EXAM' | 'ANNOUNCEMENT' | 'TRANSPORT' | 'HOSTEL';
    severity: 'INFO' | 'WARNING' | 'URGENT';
    title: string;
    message: string;
    actionUrl?: string;
  }[];
  attendance: {
    todayStatus?: string | null;
    monthPercentage: number;
    daysPresent: number;
    daysAbsent: number;
    totalDays: number;
  };
  fees: {
    totalDue: number;
    totalPaid: number;
    balanceOutstanding: number;
    nextDueDate?: string | null;
    hasOverdue: boolean;
  };
  upcomingTimetableToday: {
    periodName: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    teacherName?: string | null;
    roomName?: string | null;
  }[];
  upcomingExams: {
    examName: string;
    subjectName: string;
    examDate: string;
    startTime?: string | null;
    durationMinutes?: number | null;
  }[];
  latestResult?: {
    examName: string;
    percentage: number;
    grade?: string | null;
    status: string;
    publishedAt: string;
  } | null;
}

export interface IParentChildProfile {
  studentId: string;
  userId: string;
  admissionNumber: string;
  admissionDate: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender?: string | null;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  address?: string | null;
  campusName?: string | null;
  currentClass?: string | null;
  currentSection?: string | null;
  academicYear?: string | null;
  lifecycleStatus: string;
  guardians: {
    id: string;
    name: string;
    relationship: string;
    phone?: string | null;
    email?: string | null;
    isPrimary: boolean;
    canPickup: boolean;
  }[];
}

export interface IParentAttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'EXCUSED';
  remarks?: string | null;
}

export interface IParentAttendanceSummary {
  studentId: string;
  period: string; // e.g. "Current Academic Year" or "September 2026"
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  excusedDays: number;
  attendancePercentage: number;
  records: IParentAttendanceRecord[];
}

export interface IParentTimetableEntry {
  id: string;
  dayOfWeek: string;
  periodName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  teacherName?: string | null;
  roomName?: string | null;
}

export interface IParentTimetable {
  studentId: string;
  className: string;
  sectionName: string;
  versionName: string;
  versionNumber: number;
  status: 'PUBLISHED';
  publishedAt?: string | null;
  entries: IParentTimetableEntry[];
}

export interface IParentExamItem {
  id: string;
  examSessionId: string;
  examSessionName: string;
  subjectName: string;
  subjectCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passingMarks: number;
  roomName?: string | null;
}

export interface IParentExamResult {
  id: string;
  examSessionName: string;
  subjectName: string;
  subjectCode: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade?: string | null;
  gradePoint?: number | null;
  isPassed: boolean;
  isAbsent: boolean;
  status: string;
  remarks?: string | null;
}

export interface IParentReportCard {
  id: string;
  examSessionId: string;
  examSessionName: string;
  academicYear: string;
  issueDate: string;
  totalMarksObtained?: number | null;
  totalMaxMarks?: number | null;
  percentage?: number | null;
  grade?: string | null;
  gpa?: number | null;
  resultStatus?: string | null;
  rank?: number | null;
  attendancePercentage?: number | null;
  teacherRemarks?: string | null;
  principalRemarks?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
}

export interface IParentFeeInvoice {
  id: string;
  invoiceNumber: string;
  feeStructureName: string;
  dueDate: string;
  issuedDate: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  items: {
    description: string;
    amount: number;
    quantity: number;
    itemType: string;
  }[];
}

export interface IParentFeeReceipt {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  status: string;
}

export interface IParentFeeSummary {
  studentId: string;
  currency: string;
  totalInvoiced: number;
  totalPaid: number;
  balanceOutstanding: number;
  invoices: IParentFeeInvoice[];
  receipts: IParentFeeReceipt[];
  paymentGateway: {
    isConfigured: boolean;
    status: 'ONLINE' | 'NOT_CONFIGURED';
    providerName: string;
  };
}

export interface IParentTransportInfo {
  hasAssignment: boolean;
  assignment?: {
    routeName: string;
    routeCode: string;
    stopName?: string | null;
    pickupTime?: string | null;
    dropTime?: string | null;
    assignmentType: string;
    vehicleNumber?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
  };
  recentBoardings: {
    date: string;
    eventType: 'BOARDING' | 'DEBOARDING';
    tripType: string;
    stopName?: string | null;
    timestamp: string;
  }[];
}

export interface IParentHostelInfo {
  hasAllocation: boolean;
  allocation?: {
    hostelName: string;
    buildingName?: string | null;
    floorNumber?: number | null;
    roomNumber: string;
    bedNumber: string;
    checkInDate: string;
    status: string;
  };
  recentAttendances: {
    date: string;
    session: string;
    status: string;
  }[];
  recentOutings: {
    outingType: string;
    startDate: string;
    expectedReturn: string;
    actualReturn?: string | null;
    destination?: string | null;
    status: string;
  }[];
}

export interface IParentLibraryInfo {
  hasMembership: boolean;
  membershipNumber?: string | null;
  activeLoans: {
    bookTitle: string;
    isbn?: string | null;
    borrowedDate: string;
    dueDate: string;
    isOverdue: boolean;
    fineAmount: number;
  }[];
  totalOutstandingFines: number;
}

export interface IParentDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileKey: string;
  sizeInBytes?: number | null;
  mimeType: string;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface IParentNotice {
  id: string;
  code: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  publishedAt: string;
  attachments: string[];
}

export interface IParentProfile {
  guardianId: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  occupation?: string | null;
  relationship?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  childrenCount: number;
  linkedChildren: IParentChildSummary[];
}

export interface IUpdateParentProfileDto {
  phone?: string;
  occupation?: string;
  address?: string;
}

export interface IParentMessageDto {
  studentId: string;
  subject: string;
  message: string;
  recipientType?: 'CLASS_TEACHER' | 'ADMINISTRATION' | 'PRINCIPAL';
}
