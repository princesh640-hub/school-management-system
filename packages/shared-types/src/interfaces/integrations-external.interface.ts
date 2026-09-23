// =============================================================================
// Phase 4S: Integrations & External Services Shared Types & Interfaces
// =============================================================================

export type IntegrationType =
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'WHATSAPP'
  | 'PAYMENT'
  | 'STORAGE'
  | 'MAPS'
  | 'CALENDAR'
  | 'IDENTITY'
  | 'DATA_EXCHANGE';

export type IntegrationProvider =
  | 'SMTP'
  | 'SENDGRID'
  | 'SES'
  | 'TWILIO'
  | 'MESSAGEBIRD'
  | 'FCM'
  | 'META_WHATSAPP'
  | 'STRIPE'
  | 'RAZORPAY'
  | 'S3'
  | 'MINIO'
  | 'OPENSTREETMAP'
  | 'GOOGLE_MAPS'
  | 'GOOGLE_CALENDAR'
  | 'GENERIC_ICAL'
  | 'GOOGLE_OAUTH'
  | 'MICROSOFT_OAUTH'
  | 'MOCK';

export type IntegrationHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'FAILING'
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'UNKNOWN';

export type IntegrationEnvironment = 'SANDBOX' | 'PRODUCTION';

export type NormalizedErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'UNKNOWN';

export type WebhookProcessingStatus =
  | 'RECEIVED'
  | 'VERIFIED'
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'FAILED'
  | 'IGNORED';

export interface IIntegrationConfig {
  id: string;
  organizationId: string;
  campusId?: string | null;
  type: IntegrationType;
  provider: IntegrationProvider;
  name: string;
  description?: string | null;
  environment: IntegrationEnvironment;
  isEnabled: boolean;
  maskedConfig: Record<string, string | number | boolean>;
  healthStatus: IntegrationHealthStatus;
  lastHealthCheckAt?: Date | string | null;
  lastSuccessAt?: Date | string | null;
  lastFailureAt?: Date | string | null;
  lastErrorMessage?: string | null;
  failureCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateIntegrationDto {
  type: IntegrationType;
  provider: IntegrationProvider;
  name: string;
  description?: string;
  campusId?: string;
  environment?: IntegrationEnvironment;
  isEnabled?: boolean;
  config: Record<string, any>;
}

export interface IUpdateIntegrationDto {
  name?: string;
  description?: string;
  environment?: IntegrationEnvironment;
  isEnabled?: boolean;
  config?: Record<string, any>;
}

export interface ITestConnectionResult {
  isSuccess: boolean;
  provider: IntegrationProvider;
  latencyMs: number;
  message: string;
  timestamp: string;
  diagnostics?: Record<string, any>;
}

export interface IIntegrationHealth {
  integrationId: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  status: IntegrationHealthStatus;
  latencyMs: number;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  failureCount: number;
  message: string;
}

export interface IIntegrationLog {
  id: string;
  organizationId: string;
  campusId?: string | null;
  integrationId?: string | null;
  type: string;
  provider: string;
  operation: string;
  direction: 'INBOUND' | 'OUTBOUND';
  correlationId?: string | null;
  externalRef?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING' | 'TIMEOUT';
  latencyMs: number;
  retryCount: number;
  normalizedError?: NormalizedErrorCode | null;
  errorMessage?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

export interface IWebhookEventLog {
  id: string;
  organizationId?: string | null;
  provider: string;
  eventType: string;
  eventId?: string | null;
  payloadHash?: string | null;
  status: WebhookProcessingStatus;
  responseCode?: number | null;
  processingTimeMs?: number | null;
  errorMessage?: string | null;
  createdAt: Date | string;
}

export interface IDataExchangeJob {
  id: string;
  organizationId: string;
  userId: string;
  type: 'IMPORT' | 'EXPORT';
  entityType: 'STUDENTS' | 'EMPLOYEES' | 'FEES' | 'INVENTORY' | 'BOOKS';
  fileFormat: 'CSV' | 'XLSX';
  fileName: string;
  fileKey?: string | null;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  status: 'PENDING' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  errorDetails?: Array<{ row: number; field: string; message: string; value?: any }>;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

export interface IDataExchangeValidateResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  headers: string[];
  previewRows: Record<string, any>[];
  errors: Array<{ row: number; field: string; message: string; value?: any }>;
}

export interface IPaymentInitiationPayload {
  invoiceId: string;
  amount: number;
  currency: string;
  studentId: string;
  studentName: string;
  guardianEmail?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface IPaymentSessionResult {
  sessionId: string;
  paymentUrl: string;
  provider: IntegrationProvider;
  amount: number;
  currency: string;
  expiresAt?: string;
}

export interface IPaymentVerificationResult {
  isSuccess: boolean;
  status: 'PAID' | 'FAILED' | 'PENDING' | 'CANCELLED';
  amount: number;
  currency: string;
  transactionRef: string;
  provider: string;
  invoiceId: string;
  receiptNumber?: string;
}

export interface IEmailDispatchPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  attachments?: Array<{ filename: string; content?: string; path?: string }>;
}

export interface ISmsDispatchPayload {
  to: string;
  message: string;
  senderId?: string;
}

export interface IPushDispatchPayload {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface IWhatsAppDispatchPayload {
  to: string;
  templateCode: string;
  language: string;
  variables?: Record<string, string>;
}

export interface IDispatchResult {
  isSuccess: boolean;
  provider: IntegrationProvider;
  messageId?: string;
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'NOT_CONFIGURED';
  normalizedError?: NormalizedErrorCode;
  errorMessage?: string;
}
