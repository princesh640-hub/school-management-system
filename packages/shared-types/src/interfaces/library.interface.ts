import { RecordStatus } from '../enums/roles.enum.js';

// -----------------------------------------------------------------------------
// Phase 4I: Library Management Enums & Types
// -----------------------------------------------------------------------------

export type BookCopyStatus =
  | 'AVAILABLE'
  | 'ISSUED'
  | 'RESERVED'
  | 'LOST'
  | 'DAMAGED'
  | 'MISSING'
  | 'WITHDRAWN'
  | 'REPAIR'
  | 'OTHER';

export type CopyCondition =
  | 'NEW'
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'DAMAGED';

export type LibraryMemberType =
  | 'STUDENT'
  | 'TEACHER'
  | 'STAFF'
  | 'OTHER';

export type LibraryMemberStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type LibraryLoanStatus =
  | 'ACTIVE'
  | 'RETURNED'
  | 'OVERDUE'
  | 'LOST'
  | 'DAMAGED';

export type LibraryReservationStatus =
  | 'PENDING'
  | 'AVAILABLE_FOR_PICKUP'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'EXPIRED';

export type LibraryFineStatus =
  | 'ASSESSED'
  | 'WAIVED'
  | 'PAID'
  | 'CANCELLED';

// -----------------------------------------------------------------------------
// Entity Interfaces
// -----------------------------------------------------------------------------

export interface LibraryEntity {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  locationDetails?: string | null;
  status: RecordStatus | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LibraryLocationEntity {
  id: string;
  libraryId: string;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  section?: string | null;
  shelf: string;
  code: string;
  description?: string | null;
  status: RecordStatus | string;
}

export interface BookCategoryEntity {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  status: RecordStatus | string;
}

export interface PublisherEntity {
  id: string;
  organizationId: string;
  name: string;
  contact?: string | null;
  website?: string | null;
  address?: string | null;
  status: RecordStatus | string;
}

export interface AuthorEntity {
  id: string;
  organizationId: string;
  name: string;
  alternateName?: string | null;
  biography?: string | null;
  status: RecordStatus | string;
}

export interface BookAuthorEntity {
  id: string;
  bookId: string;
  authorId: string;
  role?: string | null;
  author?: AuthorEntity;
}

export interface BookEntity {
  id: string;
  organizationId: string;
  categoryId?: string | null;
  publisherId?: string | null;
  title: string;
  subtitle?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  edition?: string | null;
  publicationYear?: number | null;
  language: string;
  description?: string | null;
  subject?: string | null;
  coverImageUrl?: string | null;
  keywords: string[];
  status: RecordStatus | string;
  category?: BookCategoryEntity | null;
  publisher?: PublisherEntity | null;
  authors?: BookAuthorEntity[];
  copies?: BookCopyEntity[];
  totalCopies?: number;
  availableCopies?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BookCopyEntity {
  id: string;
  bookId: string;
  libraryId?: string | null;
  locationId?: string | null;
  accessionNumber: string;
  barcode?: string | null;
  condition: CopyCondition;
  status: BookCopyStatus;
  acquisitionDate?: Date | string | null;
  cost?: number | null;
  supplier?: string | null;
  notes?: string | null;
  isReplacementOf?: string | null;
  book?: BookEntity;
  library?: LibraryEntity | null;
  location?: LibraryLocationEntity | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LibraryMemberEntity {
  id: string;
  organizationId: string;
  userId: string;
  studentProfileId?: string | null;
  employeeProfileId?: string | null;
  membershipNumber: string;
  memberType: LibraryMemberType;
  borrowingLimit: number;
  maxBorrowDays: number;
  startDate: Date | string;
  endDate?: Date | string | null;
  status: LibraryMemberStatus;
  notes?: string | null;
  activeLoansCount?: number;
  unpaidFinesTotal?: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LibraryLoanEntity {
  id: string;
  loanNumber: string;
  copyId: string;
  memberId: string;
  issueDate: Date | string;
  dueDate: Date | string;
  returnDate?: Date | string | null;
  returnCondition?: CopyCondition | null;
  renewalCount: number;
  status: LibraryLoanStatus;
  issuedById?: string | null;
  returnedById?: string | null;
  notes?: string | null;
  copy?: BookCopyEntity;
  member?: LibraryMemberEntity;
  renewals?: LibraryRenewalEntity[];
  fines?: LibraryFineEntity[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LibraryRenewalEntity {
  id: string;
  loanId: string;
  previousDueDate: Date | string;
  newDueDate: Date | string;
  renewedAt: Date | string;
  renewedById?: string | null;
  notes?: string | null;
}

export interface LibraryReservationEntity {
  id: string;
  reservationNumber: string;
  bookId: string;
  memberId: string;
  reservationDate: Date | string;
  queuePosition: number;
  expiryDate?: Date | string | null;
  status: LibraryReservationStatus;
  notes?: string | null;
  book?: BookEntity;
  member?: LibraryMemberEntity;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LibraryFineEntity {
  id: string;
  fineNumber: string;
  loanId?: string | null;
  memberId: string;
  amount: number;
  reason: string;
  status: LibraryFineStatus;
  assessedDate: Date | string;
  paidDate?: Date | string | null;
  waivedDate?: Date | string | null;
  waivedById?: string | null;
  waiverReason?: string | null;
  financeTransactionId?: string | null;
  notes?: string | null;
  loan?: LibraryLoanEntity | null;
  member?: LibraryMemberEntity;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------

export interface CreateLibraryDto {
  campusId?: string;
  name: string;
  code: string;
  description?: string;
  locationDetails?: string;
}

export interface CreateLibraryLocationDto {
  libraryId: string;
  building?: string;
  floor?: string;
  room?: string;
  section?: string;
  shelf: string;
  code: string;
  description?: string;
}

export interface CreateBookCategoryDto {
  name: string;
  code: string;
  description?: string;
}

export interface CreatePublisherDto {
  name: string;
  contact?: string;
  website?: string;
  address?: string;
}

export interface CreateAuthorDto {
  name: string;
  alternateName?: string;
  biography?: string;
}

export interface CreateBookDto {
  categoryId?: string;
  publisherId?: string;
  title: string;
  subtitle?: string;
  isbn10?: string;
  isbn13?: string;
  edition?: string;
  publicationYear?: number;
  language?: string;
  description?: string;
  subject?: string;
  coverImageUrl?: string;
  keywords?: string[];
  authorIds?: string[];
}

export interface UpdateBookDto extends Partial<CreateBookDto> {
  status?: RecordStatus | string;
}

export interface CreateBookCopyDto {
  bookId: string;
  libraryId?: string;
  locationId?: string;
  accessionNumber?: string;
  barcode?: string;
  condition?: CopyCondition;
  acquisitionDate?: string;
  cost?: number;
  supplier?: string;
  notes?: string;
}

export interface RegisterLibraryMemberDto {
  userId: string;
  studentProfileId?: string;
  employeeProfileId?: string;
  membershipNumber?: string;
  memberType?: LibraryMemberType;
  borrowingLimit?: number;
  maxBorrowDays?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface IssueBookDto {
  copyId: string;
  memberId: string;
  dueDate?: string;
  notes?: string;
}

export interface ReturnBookDto {
  copyId: string;
  returnCondition?: CopyCondition;
  notes?: string;
}

export interface RenewLoanDto {
  loanId: string;
  notes?: string;
}

export interface CreateReservationDto {
  bookId: string;
  memberId: string;
  notes?: string;
}

export interface AssessFineDto {
  loanId?: string;
  memberId: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface WaiveFineDto {
  waiverReason: string;
}

// -----------------------------------------------------------------------------
// Eligibility, Statement & Reporting Contracts
// -----------------------------------------------------------------------------

export interface BorrowingEligibilityResult {
  isEligible: boolean;
  memberId: string;
  membershipNumber: string;
  memberType: LibraryMemberType;
  currentActiveLoans: number;
  borrowingLimit: number;
  availableAllowance: number;
  unpaidFinesTotal: number;
  overdueLoansCount: number;
  blockingReasons: string[];
}

export interface PrintableIssueSlip {
  slipNumber: string;
  issueDate: string;
  school: {
    name: string;
    address?: string;
  };
  library: {
    name: string;
    code: string;
  };
  member: {
    id: string;
    membershipNumber: string;
    name: string;
    memberType: string;
    email: string;
  };
  book: {
    title: string;
    isbn?: string;
    authors: string[];
  };
  copy: {
    accessionNumber: string;
    barcode?: string;
    shelfLocation?: string;
  };
  circulation: {
    loanNumber: string;
    issueDate: string;
    dueDate: string;
    issuedBy?: string;
  };
}

export interface PrintableReturnSlip {
  slipNumber: string;
  returnDate: string;
  school: {
    name: string;
  };
  member: {
    membershipNumber: string;
    name: string;
  };
  book: {
    title: string;
    accessionNumber: string;
  };
  condition: CopyCondition;
  isOverdue: boolean;
  overdueDays: number;
  fineAssessed: number;
  receivedBy?: string;
}

export interface LibraryMemberStatement {
  member: LibraryMemberEntity;
  activeLoans: LibraryLoanEntity[];
  loanHistory: LibraryLoanEntity[];
  reservations: LibraryReservationEntity[];
  fines: LibraryFineEntity[];
  summary: {
    totalBorrowedAllTime: number;
    currentActiveLoans: number;
    overdueCount: number;
    totalFinesAssessed: number;
    totalFinesPaid: number;
    outstandingFines: number;
  };
}

export interface LibraryCatalogSummary {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  reservedCopies: number;
  overdueCopies: number;
  lostCopies: number;
  damagedCopies: number;
  activeMembersCount: number;
  todayIssuedCount: number;
  todayReturnedCount: number;
}

export interface CatalogInventorySummary extends LibraryCatalogSummary {}

export interface CirculationAnalytics {
  activeLoans: number;
  overdueLoans: number;
  totalMembers: number;
  pendingReservations: number;
  fines: {
    outstandingAmount: number;
    paidAmount: number;
    waivedAmount: number;
  };
}

export interface OverduePatronReportItem {
  loanId: string;
  loanNumber: string;
  member: {
    id: string;
    name: string;
    memberType: string;
    email: string;
    phone?: string | null;
  };
  item: {
    title: string;
    accessionNumber: string;
    shelf: string;
  };
  issueDate: Date | string;
  dueDate: Date | string;
  overdueDays: number;
  projectedFine: number;
}

export interface LostDamagedReportItem {
  id: string;
  accessionNumber: string;
  barcode?: string | null;
  title: string;
  status: string;
  condition: string;
  cost?: number | null;
  notes?: string | null;
  updatedAt?: Date | string;
}

export interface CirculationSlip {
  slipType: string;
  loanNumber: string;
  patron: {
    membershipNumber: string;
    name: string;
    memberType: string;
  };
  item: {
    accessionNumber: string;
    title: string;
  };
  generatedAt: Date | string;
}

