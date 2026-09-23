// =============================================================================
// Phase 4S: Integrations & External Services Verification Script
// =============================================================================
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(label, condition) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✔ ${label}`);
  } else {
    failedChecks++;
    console.error(`  ✖ FAILED: ${label}`);
  }
}

function fileExists(relPath) {
  const full = path.join(ROOT_DIR, relPath);
  const exists = fs.existsSync(full);
  check(`File exists -> ${relPath}`, exists);
  return exists;
}

function fileContains(relPath, pattern) {
  const full = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(full)) {
    check(`Contains "${pattern}" in ${relPath}`, false);
    return false;
  }
  const content = fs.readFileSync(full, 'utf8');
  const found = content.includes(pattern);
  check(`Contains "${pattern}" in ${relPath}`, found);
  return found;
}

console.log('\n=============================================================================');
console.log('PHASE 4S: INTEGRATIONS & EXTERNAL SERVICES VERIFICATION');
console.log('=============================================================================\n');

// 1. Prisma Schema Verification
console.log('1. Checking Prisma Schema Models...');
fileExists('apps/api/prisma/schema.prisma');
fileContains('apps/api/prisma/schema.prisma', 'model IntegrationConfig {');
fileContains('apps/api/prisma/schema.prisma', 'model WebhookEventLog {');
fileContains('apps/api/prisma/schema.prisma', 'model IntegrationLog {');
fileContains('apps/api/prisma/schema.prisma', 'model IntegrationOutbox {');
fileContains('apps/api/prisma/schema.prisma', 'model DataExchangeJob {');
fileContains('apps/api/prisma/schema.prisma', '@@map("integration_configs")');
fileContains('apps/api/prisma/schema.prisma', '@@map("webhook_event_logs")');
fileContains('apps/api/prisma/schema.prisma', '@@map("integration_logs")');
fileContains('apps/api/prisma/schema.prisma', '@@map("integration_outbox")');
fileContains('apps/api/prisma/schema.prisma', '@@map("data_exchange_jobs")');

// 2. Shared Types Package
console.log('\n2. Checking Shared Types...');
fileExists('packages/shared-types/src/interfaces/integrations-external.interface.ts');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export type IntegrationType');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export type IntegrationProvider');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export type IntegrationHealthStatus');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export type NormalizedErrorCode');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export interface IIntegrationConfig');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export interface ICreateIntegrationDto');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export interface ITestConnectionResult');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export interface IWebhookEventLog');
fileContains('packages/shared-types/src/interfaces/integrations-external.interface.ts', 'export interface IDataExchangeJob');
fileContains('packages/shared-types/src/index.ts', "export * from './interfaces/integrations-external.interface.js';");

// 3. Queue Service Configuration
console.log('\n3. Checking Queue Service Configuration...');
fileExists('apps/api/src/core/queue/queue.service.ts');
fileContains('apps/api/src/core/queue/queue.service.ts', "INTEGRATIONS = 'queue:integrations'");
fileContains('apps/api/src/core/queue/queue.service.ts', "WEBHOOKS = 'queue:webhooks'");
fileContains('apps/api/src/core/queue/queue.service.ts', "DATA_EXCHANGE = 'queue:data-exchange'");

// 4. Backend Services
console.log('\n4. Checking Core Integration Services...');
fileExists('apps/api/src/modules/integrations/integration-registry.service.ts');
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', 'class IntegrationRegistryService');
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'EMAIL'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'SMS'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'PUSH'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'WHATSAPP'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'PAYMENT'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'STORAGE'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'MAPS'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'CALENDAR'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'IDENTITY'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', "type: 'DATA_EXCHANGE'");
fileContains('apps/api/src/modules/integrations/integration-registry.service.ts', 'maskConfig');

fileExists('apps/api/src/modules/integrations/integration-config.service.ts');
fileContains('apps/api/src/modules/integrations/integration-config.service.ts', 'class IntegrationConfigService');
fileContains('apps/api/src/modules/integrations/integration-config.service.ts', 'encrypt(');
fileContains('apps/api/src/modules/integrations/integration-config.service.ts', 'decrypt(');
fileContains('apps/api/src/modules/integrations/integration-config.service.ts', 'listConfigs');
fileContains('apps/api/src/modules/integrations/integration-config.service.ts', 'createOrUpdateConfig');
fileContains('apps/api/src/modules/integrations/integration-config.service.ts', 'getDecryptedActiveConfig');

fileExists('apps/api/src/modules/integrations/integration-health.service.ts');
fileContains('apps/api/src/modules/integrations/integration-health.service.ts', 'class IntegrationHealthService');
fileContains('apps/api/src/modules/integrations/integration-health.service.ts', 'testConnection(');
fileContains('apps/api/src/modules/integrations/integration-health.service.ts', 'getHealthOverview(');

fileExists('apps/api/src/modules/integrations/integration-logging.service.ts');
fileContains('apps/api/src/modules/integrations/integration-logging.service.ts', 'class IntegrationLoggingService');
fileContains('apps/api/src/modules/integrations/integration-logging.service.ts', 'normalizeError(');
fileContains('apps/api/src/modules/integrations/integration-logging.service.ts', 'sanitizeMetadata(');
fileContains('apps/api/src/modules/integrations/integration-logging.service.ts', 'listLogs(');

fileExists('apps/api/src/modules/integrations/integration-outbox.service.ts');
fileContains('apps/api/src/modules/integrations/integration-outbox.service.ts', 'class IntegrationOutboxService');
fileContains('apps/api/src/modules/integrations/integration-outbox.service.ts', 'publishEvent(');
fileContains('apps/api/src/modules/integrations/integration-outbox.service.ts', 'processPendingOutbox(');

fileExists('apps/api/src/modules/integrations/data-exchange/data-exchange.service.ts');
fileContains('apps/api/src/modules/integrations/data-exchange/data-exchange.service.ts', 'class DataExchangeService');
fileContains('apps/api/src/modules/integrations/data-exchange/data-exchange.service.ts', 'getTemplateSchemas');
fileContains('apps/api/src/modules/integrations/data-exchange/data-exchange.service.ts', 'validateCsvContent');
fileContains('apps/api/src/modules/integrations/data-exchange/data-exchange.service.ts', 'executeImport');

// 5. Provider Adapters
console.log('\n5. Checking Provider Adapters...');
fileExists('apps/api/src/modules/integrations/adapters/email.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/email.adapter.ts', 'class EmailAdapter');
fileContains('apps/api/src/modules/integrations/adapters/email.adapter.ts', 'sendEmail(');

fileExists('apps/api/src/modules/integrations/adapters/sms.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/sms.adapter.ts', 'class SmsAdapter');
fileContains('apps/api/src/modules/integrations/adapters/sms.adapter.ts', 'sendSms(');

fileExists('apps/api/src/modules/integrations/adapters/push.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/push.adapter.ts', 'class PushAdapter');
fileContains('apps/api/src/modules/integrations/adapters/push.adapter.ts', 'sendPush(');

fileExists('apps/api/src/modules/integrations/adapters/whatsapp.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/whatsapp.adapter.ts', 'class WhatsAppAdapter');
fileContains('apps/api/src/modules/integrations/adapters/whatsapp.adapter.ts', 'sendWhatsApp(');

fileExists('apps/api/src/modules/integrations/adapters/payment.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/payment.adapter.ts', 'class PaymentAdapter');
fileContains('apps/api/src/modules/integrations/adapters/payment.adapter.ts', 'createCheckoutSession(');
fileContains('apps/api/src/modules/integrations/adapters/payment.adapter.ts', 'verifyPayment(');

fileExists('apps/api/src/modules/integrations/adapters/storage.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/storage.adapter.ts', 'class StorageAdapter');
fileContains('apps/api/src/modules/integrations/adapters/storage.adapter.ts', 'getSignedUrl(');

fileExists('apps/api/src/modules/integrations/adapters/maps.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/maps.adapter.ts', 'class MapsAdapter');
fileContains('apps/api/src/modules/integrations/adapters/maps.adapter.ts', 'geocode(');
fileContains('apps/api/src/modules/integrations/adapters/maps.adapter.ts', 'calculateRoute(');

fileExists('apps/api/src/modules/integrations/adapters/calendar.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/calendar.adapter.ts', 'class CalendarAdapter');
fileContains('apps/api/src/modules/integrations/adapters/calendar.adapter.ts', 'generateIcsFeed(');

fileExists('apps/api/src/modules/integrations/adapters/identity.adapter.ts');
fileContains('apps/api/src/modules/integrations/adapters/identity.adapter.ts', 'class IdentityAdapter');
fileContains('apps/api/src/modules/integrations/adapters/identity.adapter.ts', 'verifyIdToken(');

// 6. Webhooks & Controllers
console.log('\n6. Checking Webhooks & Controllers...');
fileExists('apps/api/src/modules/integrations/webhooks/webhook-verification.service.ts');
fileContains('apps/api/src/modules/integrations/webhooks/webhook-verification.service.ts', 'class WebhookVerificationService');
fileContains('apps/api/src/modules/integrations/webhooks/webhook-verification.service.ts', 'verifySignature(');
fileContains('apps/api/src/modules/integrations/webhooks/webhook-verification.service.ts', 'timingSafeCompare');

fileExists('apps/api/src/modules/integrations/webhooks/webhook-dispatcher.service.ts');
fileContains('apps/api/src/modules/integrations/webhooks/webhook-dispatcher.service.ts', 'class WebhookDispatcherService');
fileContains('apps/api/src/modules/integrations/webhooks/webhook-dispatcher.service.ts', 'processInboundWebhook');
fileContains('apps/api/src/modules/integrations/webhooks/webhook-dispatcher.service.ts', 'handlePaymentWebhook');

fileExists('apps/api/src/modules/integrations/integrations.controller.ts');
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "class IntegrationsController");
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "@Get('catalog')");
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "@Post(':id/test')");
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "@Get('health/overview')");
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "@Get('data-exchange/templates')");
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "@Post('data-exchange/validate')");
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "@Post('data-exchange/import')");
fileContains('apps/api/src/modules/integrations/integrations.controller.ts', "@Get('calendar/feed/:feedToken.ics')");

fileExists('apps/api/src/modules/integrations/webhooks/webhooks.controller.ts');
fileContains('apps/api/src/modules/integrations/webhooks/webhooks.controller.ts', "class WebhooksController");
fileContains('apps/api/src/modules/integrations/webhooks/webhooks.controller.ts', "@Post(':provider')");

fileExists('apps/api/src/modules/integrations/integrations.module.ts');
fileContains('apps/api/src/modules/integrations/integrations.module.ts', 'class IntegrationsModule');
fileContains('apps/api/src/app.module.ts', 'IntegrationsModule');

// 7. Web Client Workspace
console.log('\n7. Checking Web Client Workspace...');
fileExists('apps/web/src/app/(dashboard)/portal/integrations/page.tsx');
fileContains('apps/web/src/app/(dashboard)/portal/integrations/page.tsx', 'IntegrationsPage');
fileContains('apps/web/src/app/(dashboard)/portal/integrations/page.tsx', 'Integrations & External Services');
fileContains('apps/web/src/app/(dashboard)/portal/integrations/page.tsx', 'Integration Catalog');
fileContains('apps/web/src/app/(dashboard)/portal/integrations/page.tsx', 'Health & Latency Monitor');
fileContains('apps/web/src/app/(dashboard)/portal/integrations/page.tsx', 'Inbound Webhook Ledger');
fileContains('apps/web/src/app/(dashboard)/portal/integrations/page.tsx', 'Data Exchange & Import');
fileContains('apps/web/src/components/Sidebar.tsx', '/portal/integrations');

// 8. Mobile Flutter Client
console.log('\n8. Checking Mobile Flutter Client...');
fileExists('apps/mobile/lib/core/constants/api_endpoints.dart');
fileContains('apps/mobile/lib/core/constants/api_endpoints.dart', 'static const String integrations');
fileContains('apps/mobile/lib/core/constants/api_endpoints.dart', 'static const String integrationsHealth');
fileContains('apps/mobile/lib/core/constants/api_endpoints.dart', 'static const String dataExchangeTemplates');
fileContains('apps/mobile/lib/core/constants/api_endpoints.dart', 'static const String calendarFeed');

// 9. Documentation & Feature Status
console.log('\n9. Checking Documentation & Feature Status...');
fileExists('docs/features/phase4s-integrations-external-services.md');
fileContains('docs/features/phase4s-integrations-external-services.md', 'Phase 4S — Integrations & External Services');
fileContains('docs/features/phase4s-integrations-external-services.md', '### 1. Existing Foundation (`EXISTING`)');
fileContains('docs/features/phase4s-integrations-external-services.md', '### 2. Missing Capabilities (`MISSING`)');
fileContains('docs/features/phase4s-integrations-external-services.md', '### 3. Implementation Scope (`TO IMPLEMENT`)');
fileContains('docs/features/phase4s-integrations-external-services.md', '### 4. Deferred Beyond Phase 4S (`DEFERRED`)');

fileExists('docs/features/feature-status.md');
fileContains('docs/features/feature-status.md', '| **Integrations** | External Gateway Adapters (SMS, Mail) | 4S | **VERIFIED** |');
fileExists('docs/features/phase4s-final-report.md');

console.log('\n=============================================================================');
console.log(`TOTAL CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
console.log('=============================================================================\n');

if (failedChecks > 0) {
  console.error('Phase 4S Verification FAILED!');
  process.exit(1);
} else {
  console.log('Phase 4S Verification PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
