// =============================================================================
// Phase 4Q: Documents Module
// =============================================================================
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentSharingService } from './document-sharing.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentCategoriesService,
    DocumentSharingService,
  ],
  exports: [
    DocumentsService,
    DocumentCategoriesService,
    DocumentSharingService,
  ],
})
export class DocumentsModule {}
