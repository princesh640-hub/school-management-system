// =============================================================================
// Phase 4S: Integrations Module
// =============================================================================
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { QueueModule } from '../../core/queue/queue.module';
import { StorageModule } from '../../core/storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { FeesModule } from '../fees/fees.module';

// Services
import { IntegrationRegistryService } from './integration-registry.service';
import { IntegrationConfigService } from './integration-config.service';
import { IntegrationHealthService } from './integration-health.service';
import { IntegrationLoggingService } from './integration-logging.service';
import { IntegrationOutboxService } from './integration-outbox.service';
import { DataExchangeService } from './data-exchange/data-exchange.service';

// Adapters
import { EmailAdapter } from './adapters/email.adapter';
import { SmsAdapter } from './adapters/sms.adapter';
import { PushAdapter } from './adapters/push.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { PaymentAdapter } from './adapters/payment.adapter';
import { StorageAdapter } from './adapters/storage.adapter';
import { MapsAdapter } from './adapters/maps.adapter';
import { CalendarAdapter } from './adapters/calendar.adapter';
import { IdentityAdapter } from './adapters/identity.adapter';

// Webhooks
import { WebhookVerificationService } from './webhooks/webhook-verification.service';
import { WebhookDispatcherService } from './webhooks/webhook-dispatcher.service';

// Controllers
import { IntegrationsController } from './integrations.controller';
import { WebhooksController } from './webhooks/webhooks.controller';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    StorageModule,
    AuditModule,
    FeesModule,
  ],
  controllers: [
    IntegrationsController,
    WebhooksController,
  ],
  providers: [
    // Core Services
    IntegrationRegistryService,
    IntegrationConfigService,
    IntegrationHealthService,
    IntegrationLoggingService,
    IntegrationOutboxService,
    DataExchangeService,

    // Provider Adapters
    EmailAdapter,
    SmsAdapter,
    PushAdapter,
    WhatsAppAdapter,
    PaymentAdapter,
    StorageAdapter,
    MapsAdapter,
    CalendarAdapter,
    IdentityAdapter,

    // Webhooks
    WebhookVerificationService,
    WebhookDispatcherService,
  ],
  exports: [
    IntegrationRegistryService,
    IntegrationConfigService,
    IntegrationHealthService,
    IntegrationLoggingService,
    IntegrationOutboxService,
    DataExchangeService,
    EmailAdapter,
    SmsAdapter,
    PushAdapter,
    WhatsAppAdapter,
    PaymentAdapter,
    StorageAdapter,
    MapsAdapter,
    CalendarAdapter,
    IdentityAdapter,
    WebhookDispatcherService,
  ],
})
export class IntegrationsModule {}
