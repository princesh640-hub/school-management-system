// =============================================================================
// Phase 4Q: Centralized Certificate Issuance, Approval & Revocation Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CertificateTemplatesService } from './certificate-templates.service';
import { CertificateVerificationService } from './certificate-verification.service';
import {
  IIssuedCertificate,
  ICertificateIssueDto,
  ICertificateRevokeDto,
  CertificateLifecycleStatus,
} from '@school/shared-types';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly templatesService: CertificateTemplatesService,
    private readonly verificationService: CertificateVerificationService,
  ) {}

  /**
   * Generates collision-safe sequential certificate number: CERT-YYYY-XXXXX
   */
  async generateSequentialCertificateNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CERT-${year}-`;

    const count = await this.prisma.issuedCertificate.count({
      where: {
        organizationId,
        certificateNumber: { startsWith: prefix },
      },
    });

    const nextSeq = String(count + 1).padStart(5, '0');
    const certNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.issuedCertificate.findUnique({
      where: { certificateNumber: certNumber },
    });

    if (!exists) return certNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Validates recipient eligibility prior to certificate generation
   */
  async validateEligibility(entityType: string, entityId: string): Promise<{ recipientName: string; entityData: any }> {
    if (entityType === 'STUDENT') {
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: entityId },
        include: {
          user: true,
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { class: true, section: true },
          },
        },
      });

      if (!student) {
        throw new NotFoundException('Student profile not found.');
      }

      if (student.lifecycleStatus === 'SUSPENDED') {
        throw new ForbiddenException('Cannot issue certificates to suspended students.');
      }

      const recipientName = `${student.user.firstName} ${student.user.lastName}`.trim();
      return { recipientName, entityData: student };
    } else if (entityType === 'EMPLOYEE') {
      const employee = await this.prisma.employeeProfile.findUnique({
        where: { id: entityId },
        include: {
          user: true,
          department: true,
          designationRef: true,
        },
      });

      if (!employee) {
        throw new NotFoundException('Employee profile not found.');
      }

      if (employee.status === 'TERMINATED') {
        throw new ForbiddenException('Cannot issue active service certificates to terminated staff without clearance.');
      }

      const recipientName = `${employee.user.firstName} ${employee.user.lastName}`.trim();
      return { recipientName, entityData: employee };
    }

    throw new BadRequestException(`Unsupported recipient entity type: ${entityType}`);
  }

  /**
   * Safely interpolates trusted domain variables into template HTML
   */
  interpolateTemplate(
    htmlBody: string,
    variablesMap: Record<string, string>,
  ): string {
    let result = htmlBody;
    for (const [key, value] of Object.entries(variablesMap)) {
      const safeVal = (value ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      result = result.split(key).join(safeVal);
    }
    return result;
  }

  /**
   * Issues a certificate or creates a pending approval request
   */
  async requestCertificateIssuance(
    organizationId: string,
    campusId: string | null,
    userId: string,
    dto: ICertificateIssueDto,
  ): Promise<IIssuedCertificate> {
    // 1. Validate Certificate Type
    const certType = await this.prisma.certificateType.findUnique({
      where: { id: dto.certificateTypeId },
      include: {
        templates: {
          where: { status: 'ACTIVE' },
          include: {
            versions: { where: { isActive: true }, take: 1 },
          },
        },
      },
    });

    if (!certType || certType.organizationId !== organizationId) {
      throw new NotFoundException('Certificate type not found.');
    }

    // 2. Resolve Active Template Version
    let templateVersion = certType.templates[0]?.versions[0];
    if (dto.templateId) {
      const specificTmpl = await this.prisma.certificateTemplate.findUnique({
        where: { id: dto.templateId },
        include: { versions: { where: { isActive: true }, take: 1 } },
      });
      if (specificTmpl?.versions[0]) {
        templateVersion = specificTmpl.versions[0];
      }
    }

    if (!templateVersion) {
      throw new BadRequestException('No active template version found for this certificate type.');
    }

    // 3. Eligibility Validation
    const { recipientName, entityData } = await this.validateEligibility(
      dto.entityType,
      dto.entityId,
    );

    // 4. Generate Certificate Number & Verification Token
    const certificateNumber = await this.generateSequentialCertificateNumber(organizationId);
    const verificationReference = this.verificationService.generateVerificationReference();
    const qrCodeUrl = this.verificationService.getVerificationUrl(verificationReference);

    // 5. Gather Organization & Domain Metadata for Variable Interpolation
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const campus = campusId ? await this.prisma.campus.findUnique({ where: { id: campusId } }) : null;

    const issueDateStr = new Date().toISOString().split('T')[0];
    let expiryDate: Date | null = null;
    if (dto.expiryDate) {
      expiryDate = new Date(dto.expiryDate);
    } else if (certType.validityDays) {
      expiryDate = new Date(Date.now() + certType.validityDays * 24 * 60 * 60 * 1000);
    }

    const currentEnrollment = dto.entityType === 'STUDENT' ? entityData.enrollments?.[0] : null;

    const variablesMap: Record<string, string> = {
      '{{school_name}}': org?.name || 'School System',
      '{{school_code}}': org?.code || 'SCH',
      '{{campus_name}}': campus?.name || 'Main Campus',
      '{{campus_address}}': campus?.address || '',
      '{{certificate_number}}': certificateNumber,
      '{{issue_date}}': issueDateStr,
      '{{expiry_date}}': expiryDate ? expiryDate.toISOString().split('T')[0] : 'N/A',
      '{{recipient_name}}': recipientName,
      '{{student_name}}': recipientName,
      '{{admission_number}}': currentEnrollment ? entityData.admissionNumber : 'N/A',
      '{{class_name}}': currentEnrollment?.class?.name || 'N/A',
      '{{section_name}}': currentEnrollment?.section?.name || 'N/A',
      '{{employee_name}}': dto.entityType === 'EMPLOYEE' ? recipientName : 'N/A',
      '{{employee_code}}': dto.entityType === 'EMPLOYEE' ? entityData.employeeCode : 'N/A',
      '{{designation}}': dto.entityType === 'EMPLOYEE' ? entityData.designationRef?.title || entityData.designation || 'Staff' : 'N/A',
      '{{department}}': dto.entityType === 'EMPLOYEE' ? entityData.department?.name || 'Academics' : 'N/A',
      ...(dto.customFields || {}),
    };

    // 6. Determine Initial Status
    const requiresApproval = certType.requiresApproval;
    const initialStatus: CertificateLifecycleStatus = requiresApproval ? 'PENDING_APPROVAL' : 'ISSUED';
    const approvalStatus = requiresApproval ? 'PENDING' : 'APPROVED';

    const certificate = await this.prisma.issuedCertificate.create({
      data: {
        organizationId,
        campusId: campusId || null,
        certificateNumber,
        verificationReference,
        certificateTypeId: certType.id,
        templateVersionId: templateVersion.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        recipientName: dto.recipientName || recipientName,
        issuedDate: new Date(),
        expiryDate,
        status: initialStatus,
        approvalStatus,
        approvedBy: requiresApproval ? null : userId,
        approvedAt: requiresApproval ? null : new Date(),
        issuedBy: userId,
        metadata: variablesMap,
        qrCodeUrl,
      },
      include: {
        certificateType: true,
      },
    });

    await this.auditService.log({
      action: requiresApproval ? 'CERTIFICATE_APPROVAL_REQUESTED' : 'CERTIFICATE_ISSUED',
      entity: 'IssuedCertificate',
      entityId: certificate.id,
      userId,
      details: {
        certificateNumber: certificate.certificateNumber,
        type: certType.name,
        recipientName,
        status: certificate.status,
      },
    });

    return this.mapCertificateToDto(certificate);
  }

  /**
   * Approves or rejects a pending certificate
   */
  async reviewCertificateApproval(
    organizationId: string,
    certificateId: string,
    userId: string,
    approved: boolean,
    remarks?: string,
  ): Promise<IIssuedCertificate> {
    const cert = await this.prisma.issuedCertificate.findUnique({
      where: { id: certificateId },
      include: { certificateType: true },
    });

    if (!cert || cert.organizationId !== organizationId) {
      throw new NotFoundException('Certificate not found.');
    }

    if (cert.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Certificate is in status ${cert.status} and cannot be approved.`);
    }

    const updated = await this.prisma.issuedCertificate.update({
      where: { id: certificateId },
      data: {
        status: approved ? 'ISSUED' : 'CANCELLED',
        approvalStatus: approved ? 'APPROVED' : 'REJECTED',
        approvedBy: userId,
        approvedAt: new Date(),
        revocationReason: approved ? null : remarks || 'Approval rejected',
      },
      include: { certificateType: true },
    });

    await this.auditService.log({
      action: approved ? 'CERTIFICATE_APPROVED_AND_ISSUED' : 'CERTIFICATE_APPROVAL_REJECTED',
      entity: 'IssuedCertificate',
      entityId: cert.id,
      userId,
      details: {
        certificateNumber: cert.certificateNumber,
        decision: approved ? 'APPROVED' : 'REJECTED',
        remarks,
      },
    });

    return this.mapCertificateToDto(updated);
  }

  /**
   * Revokes an issued certificate
   */
  async revokeCertificate(
    organizationId: string,
    certificateId: string,
    userId: string,
    dto: ICertificateRevokeDto,
  ): Promise<IIssuedCertificate> {
    const cert = await this.prisma.issuedCertificate.findUnique({
      where: { id: certificateId },
      include: { certificateType: true },
    });

    if (!cert || cert.organizationId !== organizationId) {
      throw new NotFoundException('Certificate not found.');
    }

    if (cert.status === 'REVOKED' || cert.status === 'CANCELLED') {
      throw new BadRequestException('Certificate is already revoked.');
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A mandatory reason is required to revoke an official certificate.');
    }

    const updated = await this.prisma.issuedCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'REVOKED',
        revocationReason: dto.reason.trim(),
        revokedBy: userId,
        revokedAt: new Date(),
      },
      include: { certificateType: true },
    });

    await this.auditService.log({
      action: 'CERTIFICATE_REVOKED',
      entity: 'IssuedCertificate',
      entityId: cert.id,
      userId,
      details: {
        certificateNumber: cert.certificateNumber,
        reason: dto.reason.trim(),
      },
    });

    return this.mapCertificateToDto(updated);
  }

  /**
   * Lists issued certificates with search and filter
   */
  async listCertificates(
    organizationId: string,
    filter: {
      certificateTypeId?: string;
      status?: CertificateLifecycleStatus;
      entityType?: string;
      entityId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = {
      organizationId,
      ...(filter.certificateTypeId ? { certificateTypeId: filter.certificateTypeId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.entityType ? { entityType: filter.entityType as any } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
    };

    if (filter.search) {
      where.OR = [
        { certificateNumber: { contains: filter.search, mode: 'insensitive' } },
        { recipientName: { contains: filter.search, mode: 'insensitive' } },
        { verificationReference: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [total, certs] = await Promise.all([
      this.prisma.issuedCertificate.count({ where }),
      this.prisma.issuedCertificate.findMany({
        where,
        include: { certificateType: true },
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 30,
        skip: filter.offset || 0,
      }),
    ]);

    return {
      total,
      certificates: certs.map((c) => this.mapCertificateToDto(c)),
    };
  }

  /**
   * Retrieves single certificate detail with populated HTML for printing
   */
  async getCertificateDetail(organizationId: string, certificateId: string) {
    const cert = await this.prisma.issuedCertificate.findUnique({
      where: { id: certificateId },
      include: {
        certificateType: true,
        templateVersion: true,
      },
    });

    if (!cert || cert.organizationId !== organizationId) {
      throw new NotFoundException('Certificate not found.');
    }

    const renderedHtml = this.interpolateTemplate(
      cert.templateVersion.htmlBody,
      (cert.metadata as any) || {},
    );

    return {
      ...this.mapCertificateToDto(cert),
      renderedHtml,
      cssStyles: cert.templateVersion.cssStyles,
      layout: cert.templateVersion.layout,
      pageSize: cert.templateVersion.pageSize,
    };
  }

  private mapCertificateToDto(cert: any): IIssuedCertificate {
    return {
      id: cert.id,
      organizationId: cert.organizationId,
      campusId: cert.campusId,
      certificateNumber: cert.certificateNumber,
      verificationReference: cert.verificationReference,
      certificateTypeId: cert.certificateTypeId,
      certificateTypeName: cert.certificateType?.name || 'Certificate',
      templateVersionId: cert.templateVersionId,
      entityType: cert.entityType as any,
      entityId: cert.entityId,
      recipientName: cert.recipientName,
      issuedDate: cert.issuedDate.toISOString().split('T')[0],
      expiryDate: cert.expiryDate ? cert.expiryDate.toISOString().split('T')[0] : null,
      status: cert.status as CertificateLifecycleStatus,
      approvalStatus: cert.approvalStatus,
      approvedBy: cert.approvedBy,
      approvedAt: cert.approvedAt ? cert.approvedAt.toISOString() : null,
      issuedBy: cert.issuedBy,
      revocationReason: cert.revocationReason,
      revokedBy: cert.revokedBy,
      revokedAt: cert.revokedAt ? cert.revokedAt.toISOString() : null,
      metadata: cert.metadata,
      qrCodeUrl: cert.qrCodeUrl,
      pdfFileKey: cert.pdfFileKey,
      createdAt: cert.createdAt.toISOString(),
      updatedAt: cert.updatedAt.toISOString(),
    };
  }
}
