export type FeeFrequency =
  | 'ONE_TIME'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'TERM'
  | 'ANNUAL'
  | 'CUSTOM';

export type DiscountType =
  | 'PERCENTAGE'
  | 'FIXED_AMOUNT'
  | 'SCHOLARSHIP'
  | 'SIBLING_CONCESSION'
  | 'SPECIAL_WAIVER';

export type LateFeeType =
  | 'FIXED'
  | 'DAILY_RATE'
  | 'PERCENTAGE';

export type RefundStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSED';

export type AdjustmentType =
  | 'CREDIT'
  | 'DEBIT'
  | 'CORRECTION'
  | 'WAIVER';

export type InvoiceStatusType =
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'VOID';

export type PaymentMethodType =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'CARD'
  | 'ONLINE_GATEWAY';

export type PaymentStatusType =
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'REFUNDED';

// -----------------------------------------------------------------------------
// Entities
// -----------------------------------------------------------------------------

export interface FeeCategoryEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface FeeStructureEntity {
  id: string;
  organizationId?: string | null;
  campusId: string;
  feeCategoryId?: string | null;
  academicYearId?: string | null;
  classId?: string | null;
  name: string;
  amount: number;
  frequency: string;
  description?: string | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  feeCategory?: FeeCategoryEntity | null;
}

export interface FeeScheduleEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  academicYearId: string;
  feeStructureId: string;
  name: string;
  billingDate: Date | string;
  dueDate: Date | string;
  lateFeeType: LateFeeType;
  lateFeeValue: number;
  graceDays: number;
  maxLateFee?: number | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  feeStructure?: FeeStructureEntity;
}

export interface StudentFeeAssignmentEntity {
  id: string;
  studentId: string;
  feeStructureId: string;
  customAmount?: number | null;
  reason?: string | null;
  authorizedBy?: string | null;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  feeStructure?: FeeStructureEntity;
}

export interface FeeDiscountEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  feeCategoryId?: string | null;
  studentId?: string | null;
  name: string;
  discountType: DiscountType;
  value: number;
  reason?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isApproved: boolean;
  approvedBy?: string | null;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  feeCategory?: FeeCategoryEntity | null;
}

export interface InvoiceItemEntity {
  id: string;
  feeInvoiceId: string;
  description: string;
  amount: number;
  quantity: number;
  itemType: string; // FEE, DISCOUNT, FINE, ADJUSTMENT
  createdAt?: Date | string;
}

export interface FeeInvoiceEntity {
  id: string;
  organizationId?: string | null;
  campusId?: string | null;
  academicYearId: string;
  studentId: string;
  feeStructureId: string;
  invoiceNumber: string;
  subtotal?: number | null;
  discountAmount: number;
  fineAmount: number;
  amount: number;
  paidAmount: number;
  balanceDue?: number;
  dueDate: Date | string;
  issuedDate: Date | string;
  status: InvoiceStatusType;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  items?: InvoiceItemEntity[];
  payments?: PaymentTransactionEntity[];
  refunds?: PaymentRefundEntity[];
  adjustments?: FeeAdjustmentEntity[];
  installments?: FeeInstallmentEntity[];
  student?: any;
  feeStructure?: FeeStructureEntity;
}

export interface PaymentTransactionEntity {
  id: string;
  feeInvoiceId: string;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: PaymentMethodType;
  referenceNumber?: string | null;
  receiptNumber: string;
  idempotencyKey?: string | null;
  status: PaymentStatusType;
  remarks?: string | null;
  cashierShiftId?: string | null;
  createdAt?: Date | string;
  createdBy?: string | null;
  feeInvoice?: FeeInvoiceEntity;
  refunds?: PaymentRefundEntity[];
}

export interface PaymentRefundEntity {
  id: string;
  paymentTransactionId: string;
  feeInvoiceId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  refundMethod: PaymentMethodType;
  referenceNumber?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  paymentTransaction?: PaymentTransactionEntity;
}

export interface FeeAdjustmentEntity {
  id: string;
  feeInvoiceId: string;
  studentId: string;
  adjustmentType: AdjustmentType;
  amount: number;
  reason: string;
  authorizedBy: string;
  createdAt?: Date | string;
}

export interface FeeInstallmentEntity {
  id: string;
  feeInvoiceId: string;
  sequence: number;
  amount: number;
  paidAmount: number;
  dueDate: Date | string;
  status: InvoiceStatusType;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CashierShiftEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  cashierId: string;
  openingBalance: number;
  closingBalance?: number | null;
  totalCollected: number;
  totalRefunded: number;
  openedAt: Date | string;
  closedAt?: Date | string | null;
  status: string;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// -----------------------------------------------------------------------------
// DTOs & Payloads
// -----------------------------------------------------------------------------

export interface CreateFeeCategoryDto {
  name: string;
  code: string;
  description?: string;
  campusId?: string;
}

export interface CreateFeeStructureExtendedDto {
  campusId: string;
  name: string;
  amount: number;
  frequency: string;
  feeCategoryId?: string;
  academicYearId?: string;
  classId?: string;
  description?: string;
}

export interface CreateFeeScheduleDto {
  academicYearId: string;
  feeStructureId: string;
  name: string;
  billingDate: string;
  dueDate: string;
  lateFeeType?: LateFeeType;
  lateFeeValue?: number;
  graceDays?: number;
  maxLateFee?: number;
  campusId?: string;
}

export interface AssignStudentFeeDto {
  studentId: string;
  feeStructureId: string;
  customAmount?: number;
  reason?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateFeeDiscountDto {
  name: string;
  discountType: DiscountType;
  value: number;
  feeCategoryId?: string;
  studentId?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  campusId?: string;
}

export interface GenerateInvoiceExtendedDto {
  studentId: string;
  feeStructureId: string;
  academicYearId: string;
  dueDate: string;
  additionalItems?: Array<{ description: string; amount: number }>;
  discountIds?: string[];
  notes?: string;
}

export interface BulkGenerateInvoicesDto {
  academicYearId: string;
  feeStructureId: string;
  classId?: string;
  sectionId?: string;
  dueDate: string;
  billingPeriod?: string;
}

export interface ProcessPaymentDto {
  feeInvoiceId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  referenceNumber?: string;
  remarks?: string;
  idempotencyKey?: string;
  cashierShiftId?: string;
}

export interface RequestRefundDto {
  paymentTransactionId: string;
  amount: number;
  reason: string;
  refundMethod?: PaymentMethodType;
}

export interface ReviewRefundDto {
  refundId: string;
  decision: 'APPROVED' | 'REJECTED';
  referenceNumber?: string;
}

export interface CreateAdjustmentDto {
  feeInvoiceId: string;
  adjustmentType: AdjustmentType;
  amount: number;
  reason: string;
}

export interface CreateInstallmentPlanDto {
  feeInvoiceId: string;
  numberOfInstallments: number;
  firstDueDate: string;
  intervalDays?: number;
}

export interface OpenCashierShiftDto {
  openingBalance: number;
  campusId?: string;
  notes?: string;
}

export interface CloseCashierShiftDto {
  shiftId: string;
  closingBalance: number;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Student Ledger & Reports
// -----------------------------------------------------------------------------

export interface StudentLedgerEntry {
  id: string;
  date: Date | string;
  entryType: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT' | 'DISCOUNT' | 'FINE';
  referenceNumber: string;
  description: string;
  debit: number;   // Charges, Fines
  credit: number;  // Payments, Discounts, Credit Adjustments
  balance: number; // Running balance
}

export interface StudentLedgerStatement {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
  };
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalDiscounted: number;
    totalFines: number;
    totalRefunded: number;
    currentBalanceDue: number;
  };
  entries: StudentLedgerEntry[];
}

export interface DefaulterRecord {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  guardianName?: string;
  guardianPhone?: string;
  overdueInvoicesCount: number;
  totalOverdueAmount: number;
  oldestOverdueDate: Date | string;
  agingBracket: '1-30_DAYS' | '31-60_DAYS' | '61-90_DAYS' | '90+_DAYS';
}

export interface CollectionSummary {
  period: string; // e.g. "2026-09-19"
  totalCollected: number;
  totalTransactions: number;
  totalRefunded: number;
  netCollection: number;
  byPaymentMethod: Record<PaymentMethodType, number>;
  byFeeCategory?: Record<string, number>;
}

export interface CashierReconciliationReport {
  shiftId: string;
  cashierName: string;
  openedAt: Date | string;
  closedAt?: Date | string | null;
  openingBalance: number;
  expectedClosingBalance: number;
  actualClosingBalance?: number | null;
  discrepancy?: number | null;
  collectionsByMethod: Record<PaymentMethodType, number>;
  totalRefunds: number;
  status: string;
}

export interface FinancialOverviewMetrics {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  collectionRatePercentage: number;
  totalRefunds: number;
  totalConcessions: number;
}

export interface StudentLedgerResponse {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    campusName?: string;
    className?: string;
    sectionName?: string;
  };
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalAdjusted: number;
    totalRefunded: number;
    netOutstandingBalance: number;
  };
  entries: StudentLedgerEntry[];
}

export interface CollectionSummaryReport {
  period: {
    startDate: string;
    endDate: string;
  };
  totalCollected: number;
  totalRefunded: number;
  netCollected: number;
  transactionCount: number;
  byPaymentMethod: Array<{
    method: PaymentMethodType;
    count: number;
    totalAmount: number;
  }>;
}

export interface DefaultersAgingReport {
  generatedAt: string;
  grandTotalOverdue: number;
  totalDefaultersCount: number;
  buckets: Array<{ bucket: string; count: number; totalAmount: number }>;
  defaulters: any[];
}

