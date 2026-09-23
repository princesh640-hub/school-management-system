// =============================================================================
// Phase 4H: HR, Employees & Payroll Interface Definitions
// =============================================================================

export type EmployeeLifecycleStatus =
  | 'APPLICANT'
  | 'ON_PROBATION'
  | 'ACTIVE'
  | 'CONFIRMED'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'RETIRED'
  | 'INACTIVE'
  | 'ARCHIVED';

export type ContractStatus =
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'RENEWED'
  | 'TERMINATED';

export type SalaryComponentType =
  | 'ALLOWANCE'
  | 'DEDUCTION';

export type SalaryCalculationType =
  | 'FIXED'
  | 'PERCENTAGE_OF_BASE';

export type PayrollPeriodStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'LOCKED'
  | 'PAID'
  | 'CANCELLED';

export type PayrollRunStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'REVIEW'
  | 'APPROVED'
  | 'LOCKED'
  | 'PAID';

export type EarningType =
  | 'BASE'
  | 'ALLOWANCE'
  | 'BONUS'
  | 'OVERTIME'
  | 'OTHER';

export type DeductionType =
  | 'TAX'
  | 'LOAN_REPAYMENT'
  | 'UNPAID_LEAVE'
  | 'ABSENCE'
  | 'LATE'
  | 'OTHER';

export type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REPAID'
  | 'CANCELLED';

// -----------------------------------------------------------------------------
// Entities
// -----------------------------------------------------------------------------

export interface EmployeeProfileEntity {
  id: string;
  userId: string;
  departmentId?: string | null;
  designationId?: string | null;
  campusId?: string | null;
  employeeCode: string;
  preferredName?: string | null;
  designation: string;
  employmentType: string;
  lifecycleStatus: EmployeeLifecycleStatus;
  joiningDate: Date | string;
  confirmationDate?: Date | string | null;
  nationalId?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  qualifications?: string[];
  experienceYears?: number | null;
  skills?: string[];
  reportingManagerId?: string | null;
  salaryBase?: number | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface EmployeeStatusHistoryEntity {
  id: string;
  employeeId: string;
  previousStatus?: EmployeeLifecycleStatus | null;
  newStatus: EmployeeLifecycleStatus;
  effectiveDate: Date | string;
  reason?: string | null;
  notes?: string | null;
  changedBy?: string | null;
  createdAt?: Date | string;
}

export interface EmploymentContractEntity {
  id: string;
  employeeId: string;
  contractNumber: string;
  contractType: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  terms?: string | null;
  renewalDate?: Date | string | null;
  status: ContractStatus;
  documentUrl?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface EmployeeDocumentEntity {
  id: string;
  employeeId: string;
  title: string;
  documentType: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  issueDate?: Date | string | null;
  expiryDate?: Date | string | null;
  notes?: string | null;
  uploadedBy?: string | null;
  createdAt?: Date | string;
}

export interface SalaryStructureEntity {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  baseSalary: number;
  currency: string;
  frequency: string;
  description?: string | null;
  status: string;
  createdAt?: Date | string;
  components?: SalaryComponentEntity[];
}

export interface SalaryComponentEntity {
  id: string;
  salaryStructureId: string;
  name: string;
  type: SalaryComponentType;
  calculationType: SalaryCalculationType;
  value: number;
  isTaxable: boolean;
  status: string;
}

export interface EmployeeSalaryAssignmentEntity {
  id: string;
  employeeId: string;
  salaryStructureId: string;
  baseSalaryOverride?: number | null;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  reason?: string | null;
  authorizedBy?: string | null;
  status: string;
  salaryStructure?: SalaryStructureEntity;
}

export interface SalaryHistoryEntity {
  id: string;
  employeeId: string;
  oldBaseSalary?: number | null;
  newBaseSalary: number;
  effectiveFrom: Date | string;
  reason?: string | null;
  authorizedBy?: string | null;
  createdAt?: Date | string;
}

export interface PayrollPeriodEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  paymentDate?: Date | string | null;
  status: PayrollPeriodStatus;
  createdAt?: Date | string;
}

export interface PayrollRunEntity {
  id: string;
  payrollPeriodId: string;
  runNumber: string;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: PayrollRunStatus;
  processedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  lockedAt?: Date | string | null;
  createdAt?: Date | string;
}

export interface PayrollEmployeeRecordEntity {
  id: string;
  payrollRunId: string;
  employeeId: string;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  attendanceDeduction: number;
  leaveDeduction: number;
  loanDeduction: number;
  bonusAmount: number;
  status: string;
  remarks?: string | null;
  earnings?: PayrollEarningEntity[];
  deductions?: PayrollDeductionEntity[];
}

export interface PayrollEarningEntity {
  id: string;
  employeeRecordId: string;
  title: string;
  earningType: EarningType;
  amount: number;
  source?: string | null;
}

export interface PayrollDeductionEntity {
  id: string;
  employeeRecordId: string;
  title: string;
  deductionType: DeductionType;
  amount: number;
  source?: string | null;
}

export interface PayrollAdjustmentEntity {
  id: string;
  employeeRecordId: string;
  amount: number;
  type: string;
  reason: string;
  requestedBy?: string | null;
  approvedBy?: string | null;
}

export interface EmployeeLoanEntity {
  id: string;
  organizationId: string;
  employeeId: string;
  loanNumber: string;
  principalAmount: number;
  repaymentTermMonths: number;
  monthlyInstallment: number;
  totalRepaid: number;
  remainingBalance: number;
  issueDate: Date | string;
  status: LoanStatus;
  reason?: string | null;
}

export interface LoanRepaymentEntity {
  id: string;
  loanId: string;
  employeeRecordId?: string | null;
  repaymentNumber: string;
  amount: number;
  paymentDate: Date | string;
  repaymentMethod: string;
  notes?: string | null;
}

export interface PayslipEntity {
  id: string;
  payrollEmployeeRecordId: string;
  payslipNumber: string;
  month: number;
  year: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  issueDate: Date | string;
  status: string;
  pdfUrl?: string | null;
}

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------

export interface CreateEmployeeExtendedDto {
  email: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  phone?: string;
  gender?: string;
  campusId?: string;
  departmentId?: string;
  designationId?: string;
  designation: string;
  employmentType?: string;
  joiningDate?: string;
  confirmationDate?: string;
  nationalId?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  qualifications?: string[];
  experienceYears?: number;
  skills?: string[];
  reportingManagerId?: string;
  salaryBase?: number;
  roleCode?: string;
}

export interface ChangeEmployeeStatusDto {
  newStatus: EmployeeLifecycleStatus;
  effectiveDate?: string;
  reason: string;
  notes?: string;
}

export interface CreateContractDto {
  employeeId: string;
  contractType?: string;
  startDate: string;
  endDate?: string;
  terms?: string;
  renewalDate?: string;
  documentUrl?: string;
}

export interface CreateSalaryStructureDto {
  name: string;
  code: string;
  baseSalary: number;
  currency?: string;
  frequency?: string;
  description?: string;
  components?: Array<{
    name: string;
    type: SalaryComponentType;
    calculationType: SalaryCalculationType;
    value: number;
    isTaxable?: boolean;
  }>;
}

export interface AssignSalaryStructureDto {
  employeeId: string;
  salaryStructureId: string;
  baseSalaryOverride?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  reason?: string;
}

export interface CreatePayrollPeriodDto {
  campusId?: string;
  name: string;
  startDate: string;
  endDate: string;
  paymentDate?: string;
}

export interface ProcessPayrollRunDto {
  payrollPeriodId: string;
  campusId?: string;
  dailyRateDenominator?: number; // default 30
}

export interface CreateEmployeeLoanDto {
  employeeId: string;
  principalAmount: number;
  repaymentTermMonths: number;
  reason?: string;
}

// -----------------------------------------------------------------------------
// Reporting & Calculation Contracts
// -----------------------------------------------------------------------------

export interface PayrollCalculationResult {
  baseSalary: number;
  allowances: number;
  bonuses: number;
  overtime: number;
  grossSalary: number;
  taxDeduction: number;
  unpaidLeaveDeduction: number;
  absenceDeduction: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  earningsBreakdown: Array<{ title: string; type: EarningType; amount: number }>;
  deductionsBreakdown: Array<{ title: string; type: DeductionType; amount: number }>;
}

export interface PayslipStatement {
  payslipNumber: string;
  issueDate: string;
  school: {
    name: string;
    address?: string;
    logoUrl?: string;
  };
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    department?: string;
    designation: string;
    joiningDate: string;
  };
  period: {
    name: string;
    startDate: string;
    endDate: string;
    paymentDate?: string;
  };
  earnings: Array<{ title: string; type: string; amount: number }>;
  deductions: Array<{ title: string; type: string; amount: number }>;
  summary: {
    grossPay: number;
    totalDeductions: number;
    netPay: number;
  };
}

export interface EmployeeSelfServiceProfile {
  profile: EmployeeProfileEntity;
  activeContract?: EmploymentContractEntity | null;
  salaryAssignment?: EmployeeSalaryAssignmentEntity | null;
  recentAttendanceSummary: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
  };
  leaveBalances: Array<{
    leaveTypeName: string;
    allocatedDays: number;
    usedDays: number;
    remainingDays: number;
  }>;
  recentPayslips: PayslipEntity[];
  activeLoans: EmployeeLoanEntity[];
}

export interface HrAnalyticsSummary {
  headcount: {
    total: number;
    active: number;
    onProbation: number;
    onLeave: number;
  };
  departmentDistribution: Array<{ departmentName: string; count: number }>;
  contractsExpiringSoonCount: number;
  latestPayrollSummary?: {
    periodName: string;
    totalGross: number;
    totalNet: number;
    status: string;
  } | null;
}
