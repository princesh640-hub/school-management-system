// =============================================================================
// Phase 4M: Communication & Notification Ecosystem Module
// =============================================================================
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { CommunicationController } from './communication.controller';
import { CommunicationProvidersService } from './communication-providers.service';
import { CommunicationTemplatesService } from './communication-templates.service';
import { CommunicationAudienceService } from './communication-audience.service';
import { CommunicationPreferencesService } from './communication-preferences.service';
import { CommunicationDeliveryService } from './communication-delivery.service';
import { CommunicationCampaignsService } from './communication-campaigns.service';
import { CommunicationAnnouncementsService } from './communication-announcements.service';
import { CommunicationReportsService } from './communication-reports.service';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [CommunicationController],
  providers: [
    CommunicationProvidersService,
    CommunicationTemplatesService,
    CommunicationAudienceService,
    CommunicationPreferencesService,
    CommunicationDeliveryService,
    CommunicationCampaignsService,
    CommunicationAnnouncementsService,
    CommunicationReportsService,
  ],
  exports: [
    CommunicationProvidersService,
    CommunicationTemplatesService,
    CommunicationAudienceService,
    CommunicationPreferencesService,
    CommunicationDeliveryService,
    CommunicationCampaignsService,
    CommunicationAnnouncementsService,
    CommunicationReportsService,
  ],
})
export class CommunicationModule {}
