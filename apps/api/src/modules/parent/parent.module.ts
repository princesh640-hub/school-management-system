// =============================================================================
// Phase 4N: Parent & Guardian Portal Module
// =============================================================================
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { ParentController } from './parent.controller';
import { ParentAuthService } from './parent-auth.service';
import { ParentChildrenService } from './parent-children.service';
import { ParentAcademicService } from './parent-academic.service';
import { ParentFinanceService } from './parent-finance.service';
import { ParentServicesService } from './parent-services.service';
import { ParentCommunicationService } from './parent-communication.service';
import { ParentProfileService } from './parent-profile.service';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [ParentController],
  providers: [
    ParentAuthService,
    ParentChildrenService,
    ParentAcademicService,
    ParentFinanceService,
    ParentServicesService,
    ParentCommunicationService,
    ParentProfileService,
  ],
  exports: [
    ParentAuthService,
    ParentChildrenService,
    ParentAcademicService,
    ParentFinanceService,
    ParentServicesService,
    ParentCommunicationService,
    ParentProfileService,
  ],
})
export class ParentModule {}
