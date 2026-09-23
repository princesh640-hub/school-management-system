export type ExamSessionStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REVIEW'
  | 'APPROVED'
  | 'LOCKED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type MarksEntryStatus =
  | 'DRAFT'
  | 'ENTERED'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'LOCKED';

export type ResultStatus =
  | 'PASS'
  | 'FAIL'
  | 'INCOMPLETE'
  | 'WITHHELD'
  | 'ABSENT'
  | 'EXEMPT';

export type AssessmentComponentType =
  | 'THEORY'
  | 'PRACTICAL'
  | 'ORAL'
  | 'VIVA'
  | 'COURSEWORK'
  | 'ASSIGNMENT'
  | 'PROJECT'
  | 'OTHER';

export type CorrectionDecision =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export interface ExamTypeEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  weight?: number | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ExamSessionEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  academicYearId: string;
  termId?: string | null;
  examTypeId: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  status: ExamSessionStatus;
  publishedAt?: Date | string | null;
  publishedBy?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  examType?: ExamTypeEntity;
  schedules?: ExamScheduleEntity[];
  overallResults?: ExamOverallResultEntity[];
  reportCards?: ReportCardEntity[];
}

export interface AssessmentComponentEntity {
  id: string;
  examScheduleId: string;
  name: string;
  componentType: AssessmentComponentType;
  maxMarks: number;
  passingMarks: number;
  weight?: number | null;
  sequence: number;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ExamScheduleEntity {
  id: string;
  academicYearId: string;
  examSessionId?: string | null;
  examTypeId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  subjectId: string;
  roomId?: string | null;
  name: string;
  examDate: Date | string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passingMarks: number;
  status: string;
  instructions?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  examSession?: ExamSessionEntity | null;
  examType?: ExamTypeEntity | null;
  components?: AssessmentComponentEntity[];
  invigilators?: ExamInvigilatorEntity[];
  examResults?: ExamResultEntity[];
}

export interface ExamInvigilatorEntity {
  id: string;
  examScheduleId: string;
  teacherId: string;
  roomId?: string | null;
  role: string;
  assignedAt: Date | string;
  examSchedule?: ExamScheduleEntity;
}

export interface ExamResultEntity {
  id: string;
  examScheduleId: string;
  studentId: string;
  marksObtained: number;
  percentage?: number | null;
  grade?: string | null;
  gradePoint?: number | null;
  isPassed: boolean;
  isAbsent: boolean;
  isExempt: boolean;
  status: MarksEntryStatus;
  remarks?: string | null;
  version: number;
  isLocked: boolean;
  submittedAt?: Date | string | null;
  submittedBy?: string | null;
  approvedAt?: Date | string | null;
  approvedBy?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string | null;
  updatedBy?: string | null;
  componentMarks?: MarksEntryComponentEntity[];
  corrections?: MarksCorrectionEntity[];
}

export interface MarksEntryComponentEntity {
  id: string;
  examResultId: string;
  componentId: string;
  marksObtained: number;
  isAbsent: boolean;
  remarks?: string | null;
  component?: AssessmentComponentEntity;
}

export interface MarksCorrectionEntity {
  id: string;
  examResultId: string;
  originalMarks: number;
  requestedMarks: number;
  reason: string;
  requestedBy: string;
  status: CorrectionDecision;
  reviewedBy?: string | null;
  reviewedAt?: Date | string | null;
  reviewRemarks?: string | null;
  createdAt?: Date | string;
  examResult?: ExamResultEntity;
}

export interface GradeScaleEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  isDefault: boolean;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  rules?: GradeScaleRuleEntity[];
}

export interface GradeScaleRuleEntity {
  id: string;
  gradeScaleId: string;
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number | null;
  description?: string | null;
  isPass: boolean;
  sequence: number;
}

export interface ExamOverallResultEntity {
  id: string;
  examSessionId: string;
  studentId: string;
  sectionId: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  grade?: string | null;
  gpa?: number | null;
  resultStatus: ResultStatus;
  rank?: number | null;
  version: number;
  isLocked: boolean;
  isPublished: boolean;
  publishedAt?: Date | string | null;
  publishedBy?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  student?: any;
  section?: any;
}

export interface ReportCardTemplateEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  config: Record<string, any>;
  isDefault: boolean;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ReportCardEntity {
  id: string;
  examSessionId: string;
  studentId: string;
  templateId?: string | null;
  issueDate: Date | string;
  attendancePercentage?: number | null;
  daysPresent?: number | null;
  daysAbsent?: number | null;
  teacherRemarks?: string | null;
  principalRemarks?: string | null;
  isPublished: boolean;
  publishedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  examSession?: ExamSessionEntity;
  template?: ReportCardTemplateEntity | null;
}

export interface AcademicTranscriptEntity {
  id: string;
  organizationId: string;
  studentId: string;
  issueDate: Date | string;
  cumulativeGpa?: number | null;
  totalCredits?: number | null;
  overallOutcome?: string | null;
  transcriptData: Record<string, any>;
  issuedBy?: string | null;
  createdAt?: Date | string;
}

// -----------------------------------------------------------------------------
// DTOs & Payloads
// -----------------------------------------------------------------------------

export interface CreateExamTypeDto {
  name: string;
  code: string;
  description?: string;
  weight?: number;
  campusId?: string;
}

export interface CreateExamSessionDto {
  academicYearId: string;
  examTypeId: string;
  name: string;
  startDate: string;
  endDate: string;
  campusId?: string;
  termId?: string;
}

export interface UpdateExamSessionStatusDto {
  status: ExamSessionStatus;
}

export interface CreateAssessmentComponentDto {
  examScheduleId: string;
  name: string;
  componentType?: AssessmentComponentType;
  maxMarks: number;
  passingMarks: number;
  weight?: number;
  sequence?: number;
}

export interface CreateExamScheduleExtendedDto {
  academicYearId: string;
  subjectId: string;
  name: string;
  examDate: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passingMarks: number;
  examSessionId?: string;
  examTypeId?: string;
  classId?: string;
  sectionId?: string;
  roomId?: string;
  instructions?: string;
}

export interface AssignInvigilatorDto {
  examScheduleId: string;
  teacherId: string;
  roomId?: string;
  role?: string;
}

export interface ComponentMarkEntryDto {
  componentId: string;
  marksObtained: number;
  isAbsent?: boolean;
  remarks?: string;
}

export interface StudentMarkEntryDto {
  studentId: string;
  marksObtained: number;
  isAbsent?: boolean;
  isExempt?: boolean;
  remarks?: string;
  componentMarks?: ComponentMarkEntryDto[];
}

export interface EnterMarksBatchDto {
  examScheduleId: string;
  results: StudentMarkEntryDto[];
}

export interface SubmitMarksDto {
  examScheduleId: string;
}

export interface RequestMarksCorrectionDto {
  examResultId: string;
  requestedMarks: number;
  reason: string;
}

export interface ReviewMarksCorrectionDto {
  correctionId: string;
  decision: CorrectionDecision;
  reviewRemarks?: string;
}

export interface GradeScaleRuleDto {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
  description?: string;
  isPass?: boolean;
  sequence?: number;
}

export interface CreateGradeScaleDto {
  name: string;
  code: string;
  description?: string;
  isDefault?: boolean;
  campusId?: string;
  rules: GradeScaleRuleDto[];
}

export interface CalculateSessionResultDto {
  examSessionId: string;
  sectionId?: string;
  gradeScaleId?: string;
}

export interface PublishResultsDto {
  examSessionId: string;
  sectionId?: string;
}

export interface GenerateReportCardDto {
  examSessionId: string;
  studentId: string;
  templateId?: string;
  teacherRemarks?: string;
  principalRemarks?: string;
}

export interface GenerateTranscriptDto {
  studentId: string;
  overallOutcome?: string;
}

// -----------------------------------------------------------------------------
// Analytics & Reporting Contracts
// -----------------------------------------------------------------------------

export interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

export interface ClassResultAnalytics {
  examSessionId: string;
  sectionId?: string;
  className?: string;
  sectionName?: string;
  totalStudents: number;
  evaluatedStudents: number;
  passedStudents: number;
  failedStudents: number;
  passPercentage: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  gradeDistribution: GradeDistribution[];
}

export interface SubjectPerformanceSummary {
  subjectId: string;
  subjectName: string;
  totalStudents: number;
  passedStudents: number;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
}
