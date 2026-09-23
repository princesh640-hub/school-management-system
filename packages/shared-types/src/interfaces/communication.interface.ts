// =============================================================================
// Phase 4M: Communication & Notification Ecosystem — Shared Type Definitions
// =============================================================================

export type CommunicationChannel =
  | 'IN_APP'
  | 'EMAIL'
  | 'SMS'
  | 'PUSH'
  | 'WHATSAPP';

export type CommunicationStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'SKIPPED'
  | 'NOT_CONFIGURED';

export type AnnouncementStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'EXPIRED'
  | 'ARCHIVED';

export type CommunicationPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT';

export type TemplateLanguage =
  | 'EN'
  | 'UR'
  | 'AR'
  | 'OTHER';

export type DevicePlatform =
  | 'IOS'
  | 'ANDROID'
  | 'WEB'
  | 'DESKTOP';

export type AudienceType =
  | 'ALL'
  | 'ROLES'
  | 'CAMPUS'
  | 'CLASS_SECTION'
  | 'DEPARTMENT'
  | 'CUSTOM'
  | 'INDIVIDUAL';

// -----------------------------------------------------------------------------
// Announcement Interfaces
// -----------------------------------------------------------------------------

export interface IAnnouncement {
  id: string;
  organizationId: string;
  campusId?: string | null;
  code: string;
  title: string;
  content: string;
  category: string;
  priority: CommunicationPriority;
  status: AnnouncementStatus;
  audienceType: AudienceType;
  targetRoles: string[];
  targetGrades: string[];
  authorId: string;
  publishedAt?: Date | string | null;
  scheduledFor?: Date | string | null;
  expiresAt?: Date | string | null;
  attachments: string[];
  viewsCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ICreateAnnouncementDto {
  campusId?: string;
  title: string;
  content: string;
  category?: string;
  priority?: CommunicationPriority;
  status?: AnnouncementStatus;
  audienceType?: AudienceType;
  targetRoles?: string[];
  targetGrades?: string[];
  scheduledFor?: Date | string;
  expiresAt?: Date | string;
  attachments?: string[];
}

export interface IUpdateAnnouncementDto {
  title?: string;
  content?: string;
  category?: string;
  priority?: CommunicationPriority;
  status?: AnnouncementStatus;
  audienceType?: AudienceType;
  targetRoles?: string[];
  targetGrades?: string[];
  scheduledFor?: Date | string;
  expiresAt?: Date | string;
  attachments?: string[];
}

// -----------------------------------------------------------------------------
// Template & Versioning Interfaces
// -----------------------------------------------------------------------------

export interface ICommunicationTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  subject?: string | null;
  body: string;
  variables: string[];
  changeNotes?: string | null;
  changedBy?: string | null;
  createdAt: Date | string;
}

export interface ICommunicationTemplate {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string | null;
  channel: CommunicationChannel;
  language: TemplateLanguage;
  subject?: string | null;
  body: string;
  variables: string[];
  currentVersion: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  versions?: ICommunicationTemplateVersion[];
}

export interface ICreateTemplateDto {
  code: string;
  name: string;
  description?: string;
  channel?: CommunicationChannel;
  language?: TemplateLanguage;
  subject?: string;
  body: string;
  variables?: string[];
}

export interface IUpdateTemplateDto {
  name?: string;
  description?: string;
  channel?: CommunicationChannel;
  subject?: string;
  body?: string;
  variables?: string[];
  changeNotes?: string;
  isActive?: boolean;
}

// -----------------------------------------------------------------------------
// Campaign & Delivery Interfaces
// -----------------------------------------------------------------------------

export interface ICommunicationCampaign {
  id: string;
  organizationId: string;
  campusId?: string | null;
  code: string;
  title: string;
  description?: string | null;
  eventType?: string | null;
  channels: CommunicationChannel[];
  templateId?: string | null;
  audienceType: AudienceType;
  audienceFilter?: any;
  status: CommunicationStatus;
  priority: CommunicationPriority;
  scheduledAt?: Date | string | null;
  sentAt?: Date | string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  createdBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  template?: ICommunicationTemplate;
}

export interface ICreateCampaignDto {
  campusId?: string;
  title: string;
  description?: string;
  eventType?: string;
  channels: CommunicationChannel[];
  templateId?: string;
  customSubject?: string;
  customBody?: string;
  audienceType?: AudienceType;
  audienceFilter?: {
    roles?: string[];
    campuses?: string[];
    grades?: string[];
    sections?: string[];
    departments?: string[];
    userIds?: string[];
  };
  priority?: CommunicationPriority;
  scheduledAt?: Date | string;
}

export interface ICommunicationDelivery {
  id: string;
  campaignId?: string | null;
  userId?: string | null;
  recipient: string;
  recipientName?: string | null;
  channel: CommunicationChannel;
  provider: string;
  status: CommunicationStatus;
  subject?: string | null;
  contentSnippet?: string | null;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  failureReason?: string | null;
  providerRef?: string | null;
  idempotencyKey: string;
  createdAt: Date | string;
}

// -----------------------------------------------------------------------------
// Audience & Preferences Interfaces
// -----------------------------------------------------------------------------

export interface ICommunicationAudience {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  audienceType: AudienceType;
  filterCriteria: any;
  isDynamic: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateAudienceDto {
  name: string;
  code: string;
  description?: string;
  audienceType: AudienceType;
  filterCriteria: any;
}

export interface ICommunicationPreference {
  id: string;
  userId: string;
  channel: CommunicationChannel;
  category: string;
  isEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  updatedAt: Date | string;
}

export interface IUpdatePreferenceDto {
  preferences: {
    channel: CommunicationChannel;
    category?: string;
    isEnabled: boolean;
  }[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface IDeviceRegistration {
  id: string;
  userId: string;
  deviceToken: string;
  platform: DevicePlatform;
  deviceName?: string | null;
  isActive: boolean;
  lastActiveAt: Date | string;
  createdAt: Date | string;
}

export interface IRegisterDeviceDto {
  deviceToken: string;
  platform: DevicePlatform;
  deviceName?: string;
}

// -----------------------------------------------------------------------------
// KPIs & Reporting
// -----------------------------------------------------------------------------

export interface ICommunicationDashboardKpis {
  messagesTodayCount: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledCount: number;
  activeAnnouncementsCount: number;
  unreadInAppCount: number;
  channelsSummary: {
    channel: CommunicationChannel;
    count: number;
    delivered: number;
    failed: number;
  }[];
}

export interface IProviderStatusSummary {
  channel: CommunicationChannel;
  providerName: string;
  isConfigured: boolean;
  status: 'ONLINE' | 'NOT_CONFIGURED' | 'ERROR';
  description: string;
}
