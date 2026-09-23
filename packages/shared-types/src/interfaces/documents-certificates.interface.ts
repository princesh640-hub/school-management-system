// =============================================================================
// Phase 4Q: Documents, Certificates & Printing Interfaces
// =============================================================================

export type DocumentLifecycleStatus = 'ACTIVE' | 'ARCHIVED' | 'EXPIRED' | 'REVOKED' | 'DELETED';
export type DocumentSharePermission = 'VIEW' | 'DOWNLOAD';
export type CertificateCategory = 'STUDENT' | 'EMPLOYEE' | 'GENERAL';
export type CertificateLifecycleStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ISSUED' | 'REVOKED' | 'CANCELLED';
export type CertificateLayout = 'PORTRAIT' | 'LANDSCAPE';
export type PageSize = 'A4' | 'A5' | 'LETTER';
export type DocumentGenerationJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IDocumentCategory {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
  documentsCount?: number;
}

export interface IDocumentType {
  id: string;
  organizationId: string;
  categoryId: string;
  categoryName?: string;
  code: string;
  name: string;
  description: string | null;
  allowedMimeTypes: string[];
  maxFileSizeMb: number;
  requiresExpiry: boolean;
  isSystem: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IInstitutionalDocument {
  id: string;
  organizationId: string;
  campusId?: string | null;
  documentNumber: string;
  title: string;
  categoryId: string;
  categoryName?: string;
  typeId: string;
  typeName?: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  fileHash?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  ownerUserId?: string | null;
  currentVersion: number;
  status: DocumentLifecycleStatus;
  issueDate?: string | null;
  expiryDate?: string | null;
  reminderThresholdDays?: number | null;
  isConfidential: boolean;
  notes?: string | null;
  uploadedBy?: string | null;
  uploaderName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IDocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  fileHash?: string | null;
  changeSummary?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
}

export interface IDocumentShare {
  id: string;
  documentId: string;
  sharedWithUserId?: string | null;
  sharedWithUserName?: string | null;
  sharedWithRole?: string | null;
  permission: DocumentSharePermission;
  expiresAt?: string | null;
  accessCount: number;
  createdBy?: string | null;
  createdAt: string;
}

export interface IDocumentUploadDto {
  title: string;
  categoryId: string;
  typeId: string;
  entityType?: string;
  entityId?: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  fileHash?: string;
  issueDate?: string;
  expiryDate?: string;
  reminderThresholdDays?: number;
  isConfidential?: boolean;
  notes?: string;
}

export interface IDocumentCreateVersionDto {
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  fileHash?: string;
  changeSummary?: string;
}

export interface IDocumentShareDto {
  sharedWithUserId?: string;
  sharedWithRole?: string;
  permission: DocumentSharePermission;
  expiresAt?: string;
}

export interface ICertificateType {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  category: CertificateCategory;
  requiresApproval: boolean;
  validityDays?: number | null;
  sequenceCounter?: number | null;
  description?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ICertificateTemplate {
  id: string;
  organizationId: string;
  campusId?: string | null;
  certificateTypeId: string;
  certificateTypeName?: string;
  name: string;
  code: string;
  currentVersion: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ICertificateTemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  layout: CertificateLayout;
  pageSize: PageSize;
  htmlBody: string;
  cssStyles?: string | null;
  headerConfig?: any;
  footerConfig?: any;
  variables: string[];
  signaturePlaceholders?: any;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface IIssuedCertificate {
  id: string;
  organizationId: string;
  campusId?: string | null;
  certificateNumber: string;
  verificationReference: string;
  certificateTypeId: string;
  certificateTypeName: string;
  templateVersionId: string;
  entityType: CertificateCategory;
  entityId: string;
  recipientName: string;
  issuedDate: string;
  expiryDate?: string | null;
  status: CertificateLifecycleStatus;
  approvalStatus?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  issuedBy?: string | null;
  revocationReason?: string | null;
  revokedBy?: string | null;
  revokedAt?: string | null;
  metadata?: Record<string, any> | null;
  qrCodeUrl?: string | null;
  pdfFileKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICertificateIssueDto {
  certificateTypeId: string;
  templateId?: string;
  entityType: CertificateCategory;
  entityId: string;
  recipientName: string;
  customFields?: Record<string, string>;
  expiryDate?: string;
  remarks?: string;
}

export interface ICertificateApprovalDto {
  approved: boolean;
  remarks?: string;
}

export interface ICertificateRevokeDto {
  reason: string;
}

export interface ICertificateVerificationResult {
  isValid: boolean;
  certificateNumber: string;
  certificateType: string;
  recipientName: string;
  issuedDate: string;
  expiryDate?: string | null;
  status: CertificateLifecycleStatus;
  issuingInstitution: string;
  campusName?: string;
  isRevoked: boolean;
  revocationReason?: string | null;
  revokedAt?: string | null;
  verifiedAt: string;
}

export interface IPrintJob {
  id: string;
  organizationId: string;
  campusId?: string | null;
  jobType: string;
  status: DocumentGenerationJobStatus;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  payload?: any;
  resultSummary?: any;
  errorDetails?: string | null;
  requestedBy?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface IBulkGenerationDto {
  jobType: 'CERTIFICATE' | 'REPORT_CARD' | 'TRANSCRIPT' | 'FEE_RECEIPT' | 'PAYSLIP';
  targetIds: string[];
  options?: Record<string, any>;
}

export interface IDocumentDashboardOverview {
  totalDocuments: number;
  expiringDocumentsCount: number;
  expiredDocumentsCount: number;
  totalCertificatesIssued: number;
  pendingApprovalsCount: number;
  recentDocuments: IInstitutionalDocument[];
  expiringDocuments: IInstitutionalDocument[];
}
