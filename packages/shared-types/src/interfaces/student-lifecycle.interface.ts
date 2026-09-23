export type StudentLifecycleStatus =
  | 'APPLICANT'
  | 'ADMITTED'
  | 'ACTIVE'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'GRADUATED'
  | 'ALUMNI'
  | 'SUSPENDED';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ADMITTED';

export type TransferType = 'SECTION' | 'CAMPUS';

export interface AdmissionApplicationEntity {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  classId: string;
  applicationNumber: string;
  applicationDate: Date | string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: Date | string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  previousSchool?: string | null;
  previousGrade?: string | null;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail?: string | null;
  guardianAddress?: string | null;
  guardianOccupation?: string | null;
  status: ApplicationStatus;
  reviewNotes?: string | null;
  reviewedBy?: string | null;
  decisionDate?: Date | string | null;
  decisionReason?: string | null;
  admittedStudentId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAdmissionApplicationDto {
  campusId: string;
  academicYearId: string;
  classId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  address?: string;
  previousSchool?: string;
  previousGrade?: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianAddress?: string;
  guardianOccupation?: string;
}

export interface ReviewAdmissionApplicationDto {
  status: ApplicationStatus;
  reviewNotes?: string;
  decisionReason?: string;
}

export interface ConvertApplicationDto {
  sectionId?: string;
  admissionNumber?: string;
  rollNumber?: string;
  createGuardianAccount?: boolean;
}

export interface StudentTransferDto {
  type: TransferType;
  toCampusId?: string;
  toSectionId?: string;
  reason: string;
  effectiveDate?: string;
}

export interface StudentPromotionDto {
  targetAcademicYearId: string;
  targetClassId: string;
  targetSectionId: string;
  rollNumber?: string;
  reason?: string;
}

export interface BulkPromotionDto {
  sourceSectionId: string;
  targetAcademicYearId: string;
  targetClassId: string;
  targetSectionId: string;
  studentIds: string[];
}

export interface StudentWithdrawalDto {
  withdrawalDate: string;
  reason: string;
  exitNotes?: string;
  clearanceChecked?: boolean;
}

export interface StudentGraduationDto {
  graduationYear: number;
  graduationClass?: string;
  finalGrade?: string;
  contactEmail?: string;
  contactPhone?: string;
  currentOccupation?: string;
  notes?: string;
}

export interface EmergencyContactEntity {
  id: string;
  studentId: string;
  name: string;
  relationship: string;
  phone: string;
  altPhone?: string | null;
  priority: number;
  isActive: boolean;
  createdAt: Date | string;
}

export interface StudentDocumentEntity {
  id: string;
  studentId?: string | null;
  admissionApplicationId?: string | null;
  documentType: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeInBytes?: number | string | null;
  verifiedAt?: Date | string | null;
  verifiedBy?: string | null;
  notes?: string | null;
  uploadedBy?: string | null;
  createdAt: Date | string;
}

export interface StudentStatusHistoryEntity {
  id: string;
  studentId: string;
  previousStatus?: StudentLifecycleStatus | null;
  newStatus: StudentLifecycleStatus;
  reason?: string | null;
  changedBy?: string | null;
  changedAt: Date | string;
  metadata?: any;
}

export interface AlumniRecordEntity {
  id: string;
  studentId: string;
  graduationYear: number;
  graduationClass?: string | null;
  finalGrade?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  currentOccupation?: string | null;
  notes?: string | null;
  createdAt: Date | string;
}
