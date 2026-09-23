// =============================================================================
// Phase 4Q: Public Certificate Verification & Anti-Tamper Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ICertificateVerificationResult } from '@school/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class CertificateVerificationService {
  private readonly logger = new Logger(CertificateVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates a non-sequential, cryptographic verification token (UUID v4 + random hex suffix)
   * Protects against enumeration attacks.
   */
  generateVerificationReference(): string {
    const rawUuid = crypto.randomUUID();
    const entropy = crypto.randomBytes(4).toString('hex');
    return `${rawUuid}-${entropy}`;
  }

  /**
   * Generates public QR verification link for a reference
   */
  getVerificationUrl(reference: string): string {
    const baseUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/verify/${reference}`;
  }

  /**
   * Public verification endpoint
   * Exposes ONLY minimal, non-sensitive verification data.
   * NO confidential student finances, parent details, employee salaries, or administrative notes.
   */
  async verifyCertificate(reference: string): Promise<ICertificateVerificationResult> {
    if (!reference || typeof reference !== 'string' || reference.length < 10) {
      throw new NotFoundException('Invalid certificate verification reference.');
    }

    const cert = await this.prisma.issuedCertificate.findUnique({
      where: { verificationReference: reference },
      include: {
        certificateType: true,
      },
    });

    if (!cert) {
      this.logger.warn(`Verification lookup failed for non-existent reference: ${reference}`);
      throw new NotFoundException('Certificate record not found. Please verify the QR code or reference ID.');
    }

    // Fetch institution and campus details for authenticity display
    const org = await this.prisma.organization.findUnique({
      where: { id: cert.organizationId },
      select: { name: true },
    });

    let campusName: string | undefined;
    if (cert.campusId) {
      const campus = await this.prisma.campus.findUnique({
        where: { id: cert.campusId },
        select: { name: true },
      });
      campusName = campus?.name;
    }

    const isRevoked = cert.status === 'REVOKED' || cert.status === 'CANCELLED';
    const isExpired = cert.expiryDate ? new Date() > cert.expiryDate : false;
    const isValid = cert.status === 'ISSUED' && !isExpired;

    // Log verification lookup for audit trail
    await this.auditService.log({
      action: 'CERTIFICATE_PUBLICLY_VERIFIED',
      entity: 'IssuedCertificate',
      entityId: cert.id,
      userId: 'PUBLIC_VISITOR',
      details: {
        certificateNumber: cert.certificateNumber,
        reference,
        status: cert.status,
        isValid,
      },
    });

    return {
      isValid,
      certificateNumber: cert.certificateNumber,
      certificateType: cert.certificateType.name,
      recipientName: cert.recipientName,
      issuedDate: cert.issuedDate.toISOString().split('T')[0],
      expiryDate: cert.expiryDate ? cert.expiryDate.toISOString().split('T')[0] : null,
      status: isExpired ? ('EXPIRED' as any) : (cert.status as any),
      issuingInstitution: org?.name || 'Enterprise School System',
      campusName,
      isRevoked,
      revocationReason: isRevoked ? cert.revocationReason || 'Revoked by institution authority' : null,
      revokedAt: isRevoked && cert.revokedAt ? cert.revokedAt.toISOString() : null,
      verifiedAt: new Date().toISOString(),
    };
  }
}
