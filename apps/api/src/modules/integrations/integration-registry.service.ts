// =============================================================================
// Phase 4S: Integration Registry Service
// =============================================================================
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  IntegrationType,
  IntegrationProvider,
} from '@school/shared-types';

export interface IntegrationParameterSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'password' | 'textarea';
  required: boolean;
  secret: boolean;
  description: string;
  defaultValue?: any;
}

export interface IntegrationCatalogItem {
  type: IntegrationType;
  provider: IntegrationProvider;
  name: string;
  category: string;
  description: string;
  supportedEnvironments: Array<'SANDBOX' | 'PRODUCTION'>;
  parameters: IntegrationParameterSchema[];
  defaultPort?: number;
  docsUrl?: string;
}

@Injectable()
export class IntegrationRegistryService {
  private readonly catalog: IntegrationCatalogItem[] = [
    // -------------------------------------------------------------------------
    // Communication - Email
    // -------------------------------------------------------------------------
    {
      type: 'EMAIL',
      provider: 'SMTP',
      name: 'Standard SMTP Gateway',
      category: 'Communication',
      description: 'Universal SMTP mail transport with TLS/STARTTLS support',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      defaultPort: 587,
      parameters: [
        { key: 'host', label: 'SMTP Host', type: 'string', required: true, secret: false, description: 'e.g. smtp.mailgun.org or email-smtp.us-east-1.amazonaws.com' },
        { key: 'port', label: 'SMTP Port', type: 'number', required: true, secret: false, description: '587 (STARTTLS), 465 (SSL), or 25', defaultValue: 587 },
        { key: 'username', label: 'SMTP Username', type: 'string', required: true, secret: false, description: 'SMTP account username or API key' },
        { key: 'password', label: 'SMTP Password', type: 'password', required: true, secret: true, description: 'SMTP account password or secret key' },
        { key: 'fromEmail', label: 'Sender Email', type: 'string', required: true, secret: false, description: 'Default institutional from: address' },
        { key: 'fromName', label: 'Sender Name', type: 'string', required: false, secret: false, description: 'Display name, e.g. Beacon Horizon Academy', defaultValue: 'School Administration' },
      ],
    },
    {
      type: 'EMAIL',
      provider: 'SENDGRID',
      name: 'Twilio SendGrid API',
      category: 'Communication',
      description: 'High-volume transactional email API with delivery tracking',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true, secret: true, description: 'SendGrid SG.xxxxxxxx key' },
        { key: 'fromEmail', label: 'Sender Email', type: 'string', required: true, secret: false, description: 'Verified sender email address' },
        { key: 'fromName', label: 'Sender Name', type: 'string', required: false, secret: false, description: 'Display name' },
      ],
    },
    {
      type: 'EMAIL',
      provider: 'SES',
      name: 'Amazon Simple Email Service (SES)',
      category: 'Communication',
      description: 'AWS cloud-based email delivery service',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'accessKeyId', label: 'AWS Access Key ID', type: 'string', required: true, secret: false, description: 'IAM Access Key' },
        { key: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password', required: true, secret: true, description: 'IAM Secret Key' },
        { key: 'region', label: 'AWS Region', type: 'string', required: true, secret: false, description: 'e.g. us-east-1', defaultValue: 'us-east-1' },
        { key: 'fromEmail', label: 'Verified Sender Email', type: 'string', required: true, secret: false, description: 'SES verified email' },
      ],
    },

    // -------------------------------------------------------------------------
    // Communication - SMS
    // -------------------------------------------------------------------------
    {
      type: 'SMS',
      provider: 'TWILIO',
      name: 'Twilio SMS Gateway',
      category: 'Communication',
      description: 'Global programmable cellular SMS delivery',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'accountSid', label: 'Account SID', type: 'string', required: true, secret: false, description: 'Twilio Account SID (AC...)' },
        { key: 'authToken', label: 'Auth Token', type: 'password', required: true, secret: true, description: 'Twilio Auth Token' },
        { key: 'fromNumber', label: 'Sender Phone / Shortcode', type: 'string', required: true, secret: false, description: 'E.164 phone number or Alphanumeric Sender ID' },
      ],
    },
    {
      type: 'SMS',
      provider: 'MESSAGEBIRD',
      name: 'MessageBird (Bird) SMS',
      category: 'Communication',
      description: 'International carrier-grade SMS gateway',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'accessKey', label: 'Access Key (Live / Test)', type: 'password', required: true, secret: true, description: 'MessageBird API access key' },
        { key: 'originator', label: 'Originator / Sender ID', type: 'string', required: true, secret: false, description: 'Sender name or telephone number' },
      ],
    },

    // -------------------------------------------------------------------------
    // Communication - Push Notifications
    // -------------------------------------------------------------------------
    {
      type: 'PUSH',
      provider: 'FCM',
      name: 'Firebase Cloud Messaging (FCM v1)',
      category: 'Communication',
      description: 'Cross-platform push notifications for Android, iOS and Web',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'projectId', label: 'Firebase Project ID', type: 'string', required: true, secret: false, description: 'GCP / Firebase Project ID' },
        { key: 'serviceAccountJson', label: 'Service Account JSON', type: 'password', required: true, secret: true, description: 'Google Cloud Service Account JSON credentials' },
      ],
    },

    // -------------------------------------------------------------------------
    // Communication - WhatsApp Business
    // -------------------------------------------------------------------------
    {
      type: 'WHATSAPP',
      provider: 'META_WHATSAPP',
      name: 'Meta WhatsApp Cloud API',
      category: 'Communication',
      description: 'Official WhatsApp Business platform for notifications',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'phoneNumberId', label: 'Phone Number ID', type: 'string', required: true, secret: false, description: 'Meta Cloud API Phone Number ID' },
        { key: 'businessAccountId', label: 'WhatsApp Business Account ID', type: 'string', required: true, secret: false, description: 'WABA ID' },
        { key: 'apiToken', label: 'Permanent System User Token', type: 'password', required: true, secret: true, description: 'Meta Cloud API Access Token' },
        { key: 'webhookSecret', label: 'Webhook Verify Token', type: 'password', required: false, secret: true, description: 'Custom verification token for inbound webhook' },
      ],
    },

    // -------------------------------------------------------------------------
    // Payments
    // -------------------------------------------------------------------------
    {
      type: 'PAYMENT',
      provider: 'STRIPE',
      name: 'Stripe Payments',
      category: 'Finance',
      description: 'Card processing, Apple Pay, Google Pay and checkout sessions',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'publishableKey', label: 'Publishable Key', type: 'string', required: true, secret: false, description: 'pk_test_... or pk_live_...' },
        { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, secret: true, description: 'sk_test_... or sk_live_...' },
        { key: 'webhookSecret', label: 'Webhook Signing Secret', type: 'password', required: true, secret: true, description: 'whsec_... for signature verification' },
        { key: 'currency', label: 'Default Currency', type: 'string', required: false, secret: false, description: 'USD, EUR, GBP, AED, etc.', defaultValue: 'USD' },
      ],
    },
    {
      type: 'PAYMENT',
      provider: 'RAZORPAY',
      name: 'Razorpay Gateway',
      category: 'Finance',
      description: 'UPI, NetBanking, Debit/Credit cards and international gateways',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'keyId', label: 'Key ID', type: 'string', required: true, secret: false, description: 'rzp_test_... or rzp_live_...' },
        { key: 'keySecret', label: 'Key Secret', type: 'password', required: true, secret: true, description: 'Razorpay Key Secret' },
        { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: true, secret: true, description: 'Webhook signature validation secret' },
      ],
    },

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    {
      type: 'STORAGE',
      provider: 'S3',
      name: 'AWS S3 / Compatible Object Storage',
      category: 'Infrastructure',
      description: 'Encrypted cloud file and document storage',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'bucket', label: 'S3 Bucket Name', type: 'string', required: true, secret: false, description: 'e.g. school-documents-prod' },
        { key: 'region', label: 'AWS Region', type: 'string', required: true, secret: false, description: 'e.g. us-east-1', defaultValue: 'us-east-1' },
        { key: 'accessKeyId', label: 'Access Key ID', type: 'string', required: true, secret: false, description: 'IAM Access Key' },
        { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true, secret: true, description: 'IAM Secret Key' },
      ],
    },
    {
      type: 'STORAGE',
      provider: 'MINIO',
      name: 'MinIO Private Storage',
      category: 'Infrastructure',
      description: 'Self-hosted high-performance S3-compatible storage cluster',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'endpoint', label: 'MinIO Endpoint', type: 'string', required: true, secret: false, description: 'e.g. storage.internal.school.edu' },
        { key: 'port', label: 'MinIO Port', type: 'number', required: true, secret: false, description: '9000', defaultValue: 9000 },
        { key: 'accessKey', label: 'Access Key', type: 'string', required: true, secret: false, description: 'MinIO access key' },
        { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, secret: true, description: 'MinIO secret key' },
        { key: 'useSsl', label: 'Use SSL (HTTPS)', type: 'boolean', required: false, secret: false, description: 'true for https', defaultValue: true },
      ],
    },

    // -------------------------------------------------------------------------
    // Maps & Location
    // -------------------------------------------------------------------------
    {
      type: 'MAPS',
      provider: 'OPENSTREETMAP',
      name: 'OpenStreetMap / Nominatim',
      category: 'Operations',
      description: 'Open-source geocoding and route distance calculator',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'endpoint', label: 'Nominatim Endpoint', type: 'string', required: false, secret: false, description: 'Custom Nominatim server or public default', defaultValue: 'https://nominatim.openstreetmap.org' },
        { key: 'userAgent', label: 'User Agent Identifier', type: 'string', required: true, secret: false, description: 'App identifier for OSM compliance', defaultValue: 'BeaconHorizonSchool/1.0' },
      ],
    },
    {
      type: 'MAPS',
      provider: 'GOOGLE_MAPS',
      name: 'Google Maps Platform',
      category: 'Operations',
      description: 'Geocoding, Directions API, and address autocomplete',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'apiKey', label: 'Google Maps API Key', type: 'password', required: true, secret: true, description: 'API Key with Geocoding and Directions APIs enabled' },
      ],
    },

    // -------------------------------------------------------------------------
    // Calendar
    // -------------------------------------------------------------------------
    {
      type: 'CALENDAR',
      provider: 'GENERIC_ICAL',
      name: 'iCalendar Feed (RFC 5545)',
      category: 'Academics',
      description: 'Standard subscription feed for Apple Calendar, Outlook, and Google Calendar',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'feedName', label: 'Calendar Feed Title', type: 'string', required: true, secret: false, description: 'e.g. Beacon Horizon Academic Calendar', defaultValue: 'Institutional Calendar' },
        { key: 'includeExams', label: 'Include Exam Schedules', type: 'boolean', required: false, secret: false, description: 'Publish published examination windows', defaultValue: true },
        { key: 'includeHolidays', label: 'Include Term Holidays', type: 'boolean', required: false, secret: false, description: 'Publish official institutional holidays', defaultValue: true },
      ],
    },
    {
      type: 'CALENDAR',
      provider: 'GOOGLE_CALENDAR',
      name: 'Google Calendar API',
      category: 'Academics',
      description: 'Bi-directional institutional Google Workspace calendar synchronization',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'calendarId', label: 'Google Calendar ID', type: 'string', required: true, secret: false, description: 'Target primary or shared calendar ID' },
        { key: 'serviceAccountJson', label: 'Service Account JSON', type: 'password', required: true, secret: true, description: 'GCP Service Account with Calendar API scope' },
      ],
    },

    // -------------------------------------------------------------------------
    // Identity & OAuth
    // -------------------------------------------------------------------------
    {
      type: 'IDENTITY',
      provider: 'GOOGLE_OAUTH',
      name: 'Google Workspace OIDC / SSO',
      category: 'Identity',
      description: 'Single sign-on and directory linkage for institutional Google accounts',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'clientId', label: 'OAuth 2.0 Client ID', type: 'string', required: true, secret: false, description: 'Google Cloud Web Client ID' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, secret: true, description: 'Google Cloud Client Secret' },
        { key: 'hostedDomain', label: 'Restricted Hosted Domain', type: 'string', required: false, secret: false, description: 'e.g. school.edu (restricts logins to domain)' },
      ],
    },
    {
      type: 'IDENTITY',
      provider: 'MICROSOFT_OAUTH',
      name: 'Microsoft Entra ID / Office 365',
      category: 'Identity',
      description: 'Single sign-on for Microsoft 365 Education tenants',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'tenantId', label: 'Microsoft Tenant ID', type: 'string', required: true, secret: false, description: 'Azure AD Directory (Tenant) ID' },
        { key: 'clientId', label: 'Application (Client) ID', type: 'string', required: true, secret: false, description: 'Azure App Registration Client ID' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, secret: true, description: 'Client Secret Value' },
      ],
    },

    // -------------------------------------------------------------------------
    // Data Exchange / Import & Export
    // -------------------------------------------------------------------------
    {
      type: 'DATA_EXCHANGE',
      provider: 'MOCK',
      name: 'Institutional CSV / XLSX Exchange Engine',
      category: 'Data Management',
      description: 'Batch student, employee, fee, inventory and catalog data pipeline',
      supportedEnvironments: ['SANDBOX', 'PRODUCTION'],
      parameters: [
        { key: 'maxFileSizeMb', label: 'Max File Size (MB)', type: 'number', required: true, secret: false, description: 'Maximum upload file size', defaultValue: 15 },
        { key: 'allowPartialImport', label: 'Allow Partial Imports', type: 'boolean', required: false, secret: false, description: 'Import valid rows and isolate error rows', defaultValue: true },
        { key: 'maxRowBatchSize', label: 'Batch Chunk Size', type: 'number', required: false, secret: false, description: 'Database transaction batch chunk size', defaultValue: 100 },
      ],
    },
  ];

  getCatalog(): IntegrationCatalogItem[] {
    return this.catalog;
  }

  getProviderDefinition(type: IntegrationType, provider: IntegrationProvider): IntegrationCatalogItem | undefined {
    return this.catalog.find((item) => item.type === type && item.provider === provider);
  }

  validateConfigPayload(type: IntegrationType, provider: IntegrationProvider, config: Record<string, any>): void {
    const def = this.getProviderDefinition(type, provider);
    if (!def) {
      throw new BadRequestException(`Unknown integration provider [${provider}] for type [${type}]`);
    }

    const missingRequired: string[] = [];
    for (const p of def.parameters) {
      if (p.required && (config[p.key] === undefined || config[p.key] === null || config[p.key] === '')) {
        missingRequired.push(p.label);
      }
    }

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Missing required integration parameter(s): ${missingRequired.join(', ')}`,
      );
    }
  }

  /**
   * Generates a safe masked representation of integration configuration
   * Never leaks raw passwords, tokens, private keys or signing secrets.
   */
  maskConfig(type: IntegrationType, provider: IntegrationProvider, rawConfig: Record<string, any>): Record<string, any> {
    const def = this.getProviderDefinition(type, provider);
    const masked: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawConfig)) {
      const paramDef = def?.parameters.find((p) => p.key === key);
      const isSecret = paramDef ? paramDef.secret : /(password|secret|key|token|credential|cert)/i.test(key);

      if (isSecret) {
        if (typeof value === 'string' && value.length > 8) {
          // Provide minimal hint (e.g. "sk_test_••••••••4a9f")
          const prefix = value.substring(0, 4);
          const suffix = value.substring(value.length - 4);
          masked[key] = `${prefix}••••••••${suffix}`;
        } else {
          masked[key] = '••••••••';
        }
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}
