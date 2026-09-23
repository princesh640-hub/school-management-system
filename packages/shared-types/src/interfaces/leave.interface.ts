export type LeaveApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type LeaveTransactionType =
  | 'ALLOCATION'
  | 'USAGE'
  | 'REVERSAL'
  | 'ADJUSTMENT'
  | 'CARRY_FORWARD';

export interface LeaveTypeEntity {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  isPaid: boolean;
  defaultDaysPerYear: number;
  requiresDocument: boolean;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LeaveBalanceEntity {
  id: string;
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  openingBalance: number;
  accrued: number;
  used: number;
  pending: number;
  closingBalance: number;
  leaveType?: LeaveTypeEntity;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LeaveBalanceTransactionEntity {
  id: string;
  leaveBalanceId: string;
  transactionType: LeaveTransactionType;
  amount: number;
  reason?: string | null;
  applicationId?: string | null;
  performedBy?: string | null;
  createdAt?: Date | string;
}

export interface LeaveApplicationEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date | string;
  endDate: Date | string;
  durationDays: number;
  reason: string;
  supportingDocumentUrl?: string | null;
  status: LeaveApplicationStatus;
  reviewerId?: string | null;
  decisionNotes?: string | null;
  reviewedAt?: Date | string | null;
  employee?: {
    id: string;
    employeeCode: string;
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
  leaveType?: LeaveTypeEntity;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  description?: string;
  isPaid?: boolean;
  defaultDaysPerYear?: number;
  requiresDocument?: boolean;
}

export interface ApplyLeaveDto {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  supportingDocumentUrl?: string;
}

export interface ReviewLeaveDto {
  decision: 'APPROVE' | 'REJECT';
  decisionNotes?: string;
}

export interface LeaveCalendarEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: LeaveApplicationStatus;
}

export type LeaveType = LeaveTypeEntity;
export type LeaveBalance = LeaveBalanceEntity;
export type LeaveBalanceTransaction = LeaveBalanceTransactionEntity;
export type LeaveApplication = LeaveApplicationEntity;

