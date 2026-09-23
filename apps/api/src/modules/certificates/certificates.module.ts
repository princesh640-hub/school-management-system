// =============================================================================
// Phase 4Q: Certificates Module
// =============================================================================
import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateTemplatesService } from './certificate-templates.service';
import { CertificateVerificationService } from './certificate-verification.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [CertificatesController],
  providers: [
    CertificatesService,
    CertificateTemplatesService,
    CertificateVerificationService,
  ],
  exports: [
    CertificatesService,
    CertificateTemplatesService,
    CertificateVerificationService,
  ],
})
export class CertificatesModule {}
