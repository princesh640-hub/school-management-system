// =============================================================================
// Phase 4Q: Certificate Templates & Type Configuration Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { RecordStatus, CertificateCategory, CertificateLayout, PageSize } from '@prisma/client';
import {
  ICertificateType,
  ICertificateTemplate,
  ICertificateTemplateVersion,
} from '@school/shared-types';

@Injectable()
export class CertificateTemplatesService {
  private readonly logger = new Logger(CertificateTemplatesService.name);

  // Whitelisted, safe interpolation placeholders
  public static readonly ALLOWED_VARIABLES = [
    '{{school_name}}',
    '{{school_code}}',
    '{{campus_name}}',
    '{{campus_address}}',
    '{{certificate_number}}',
    '{{issue_date}}',
    '{{expiry_date}}',
    '{{student_name}}',
    '{{admission_number}}',
    '{{roll_number}}',
    '{{class_name}}',
    '{{section_name}}',
    '{{academic_year}}',
    '{{date_of_birth}}',
    '{{gender}}',
    '{{guardian_name}}',
    '{{employee_name}}',
    '{{employee_code}}',
    '{{designation}}',
    '{{department}}',
    '{{joining_date}}',
    '{{principal_name}}',
    '{{authorized_signatory}}',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes default institutional certificate types
   */
  async ensureDefaultCertificateTypes(organizationId: string) {
    const defaults = [
      { code: 'BONAFIDE', name: 'Bonafide Certificate', category: CertificateCategory.STUDENT, requiresApproval: false, validityDays: 180, description: 'Certifies student bona fide enrollment at institution' },
      { code: 'CHARACTER', name: 'Character & Conduct Certificate', category: CertificateCategory.STUDENT, requiresApproval: true, validityDays: 365, description: 'Certifies good moral conduct during student tenure' },
      { code: 'ENROLLMENT', name: 'Certificate of Enrollment', category: CertificateCategory.STUDENT, requiresApproval: false, validityDays: 90, description: 'Proof of active study and class registration' },
      { code: 'TRANSFER', name: 'School Leaving & Transfer Certificate (TC)', category: CertificateCategory.STUDENT, requiresApproval: true, validityDays: null, description: 'Formal clearance and transfer certificate' },
      { code: 'EMPLOYMENT', name: 'Employment Verification Certificate', category: CertificateCategory.EMPLOYEE, requiresApproval: true, validityDays: 180, description: 'Certifies active staff faculty employment and role' },
      { code: 'EXPERIENCE', name: 'Service & Experience Certificate', category: CertificateCategory.EMPLOYEE, requiresApproval: true, validityDays: null, description: 'Certifies duration of service and pedagogical duties' },
      { code: 'SALARY', name: 'Salary & Income Certificate', category: CertificateCategory.EMPLOYEE, requiresApproval: true, validityDays: 60, description: 'Confirms faculty remuneration structure for official use' },
    ];

    for (const def of defaults) {
      const exists = await this.prisma.certificateType.findUnique({
        where: {
          organizationId_code: {
            organizationId,
            code: def.code,
          },
        },
      });

      if (!exists) {
        await this.prisma.certificateType.create({
          data: {
            organizationId,
            code: def.code,
            name: def.name,
            category: def.category,
            requiresApproval: def.requiresApproval,
            validityDays: def.validityDays,
            description: def.description,
            status: RecordStatus.ACTIVE,
          },
        });
      }
    }
  }

  /**
   * Retrieves certificate types
   */
  async getCertificateTypes(organizationId: string): Promise<ICertificateType[]> {
    await this.ensureDefaultCertificateTypes(organizationId);

    const types = await this.prisma.certificateType.findMany({
      where: { organizationId, status: RecordStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });

    return types.map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      code: t.code,
      name: t.name,
      category: t.category as any,
      requiresApproval: t.requiresApproval,
      validityDays: t.validityDays,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Creates a new custom certificate type
   */
  async createCertificateType(
    organizationId: string,
    data: {
      code: string;
      name: string;
      category: CertificateCategory;
      requiresApproval?: boolean;
      validityDays?: number;
      description?: string;
    },
  ): Promise<ICertificateType> {
    const code = data.code.toUpperCase().trim();
    const existing = await this.prisma.certificateType.findUnique({
      where: {
        organizationId_code: { organizationId, code },
      },
    });

    if (existing) {
      throw new ConflictException(`Certificate type with code ${code} already exists.`);
    }

    const created = await this.prisma.certificateType.create({
      data: {
        organizationId,
        code,
        name: data.name.trim(),
        category: data.category,
        requiresApproval: Boolean(data.requiresApproval),
        validityDays: data.validityDays || null,
        description: data.description?.trim() || null,
        status: RecordStatus.ACTIVE,
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      code: created.code,
      name: created.name,
      category: created.category as any,
      requiresApproval: created.requiresApproval,
      validityDays: created.validityDays,
      description: created.description,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Validates that template HTML does not contain malicious script tags and uses allowed variables
   */
  validateTemplateSafety(htmlBody: string): { isValid: boolean; detectedVariables: string[] } {
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(htmlBody)) {
      throw new BadRequestException('Security violation: Embedded JavaScript <script> tags are strictly prohibited in certificate templates.');
    }

    if (/\bon\w+\s*=/i.test(htmlBody)) {
      throw new BadRequestException('Security violation: Inline JavaScript event handlers are strictly prohibited.');
    }

    const varRegex = /\{\{[a-zA-Z0-9_]+\}\}/g;
    const matches = htmlBody.match(varRegex) || [];
    const uniqueVars = Array.from(new Set(matches));

    return { isValid: true, detectedVariables: uniqueVars };
  }

  /**
   * Creates a certificate template with Version 1
   */
  async createTemplate(
    organizationId: string,
    campusId: string | null,
    userId: string,
    data: {
      certificateTypeId: string;
      name: string;
      code: string;
      layout?: CertificateLayout;
      pageSize?: PageSize;
      htmlBody: string;
      cssStyles?: string;
      headerConfig?: any;
      footerConfig?: any;
    },
  ) {
    const certType = await this.prisma.certificateType.findUnique({
      where: { id: data.certificateTypeId },
    });

    if (!certType || certType.organizationId !== organizationId) {
      throw new NotFoundException('Certificate type not found.');
    }

    const code = data.code.toUpperCase().trim();
    const existing = await this.prisma.certificateTemplate.findUnique({
      where: {
        organizationId_code: { organizationId, code },
      },
    });

    if (existing) {
      throw new ConflictException(`Certificate template with code ${code} already exists.`);
    }

    const { detectedVariables } = this.validateTemplateSafety(data.htmlBody);

    const template = await this.prisma.$transaction(async (tx) => {
      const tmpl = await tx.certificateTemplate.create({
        data: {
          organizationId,
          campusId: campusId || null,
          certificateTypeId: data.certificateTypeId,
          name: data.name.trim(),
          code,
          currentVersion: 1,
          status: RecordStatus.ACTIVE,
        },
      });

      await tx.certificateTemplateVersion.create({
        data: {
          templateId: tmpl.id,
          versionNumber: 1,
          layout: data.layout || 'PORTRAIT',
          pageSize: data.pageSize || 'A4',
          htmlBody: data.htmlBody,
          cssStyles: data.cssStyles || null,
          headerConfig: data.headerConfig || null,
          footerConfig: data.footerConfig || null,
          variables: detectedVariables,
          isActive: true,
          createdBy: userId,
        },
      });

      return tmpl;
    });

    return this.getTemplateById(organizationId, template.id);
  }

  /**
   * Creates a new version of an existing template
   */
  async createTemplateVersion(
    organizationId: string,
    templateId: string,
    userId: string,
    data: {
      layout?: CertificateLayout;
      pageSize?: PageSize;
      htmlBody: string;
      cssStyles?: string;
      headerConfig?: any;
      footerConfig?: any;
    },
  ) {
    const tmpl = await this.prisma.certificateTemplate.findUnique({
      where: { id: templateId },
    });

    if (!tmpl || tmpl.organizationId !== organizationId) {
      throw new NotFoundException('Certificate template not found.');
    }

    const { detectedVariables } = this.validateTemplateSafety(data.htmlBody);
    const nextVersionNumber = tmpl.currentVersion + 1;

    await this.prisma.$transaction(async (tx) => {
      // Deactivate previous active versions
      await tx.certificateTemplateVersion.updateMany({
        where: { templateId },
        data: { isActive: false },
      });

      // Create new version
      await tx.certificateTemplateVersion.create({
        data: {
          templateId,
          versionNumber: nextVersionNumber,
          layout: data.layout || 'PORTRAIT',
          pageSize: data.pageSize || 'A4',
          htmlBody: data.htmlBody,
          cssStyles: data.cssStyles || null,
          headerConfig: data.headerConfig || null,
          footerConfig: data.footerConfig || null,
          variables: detectedVariables,
          isActive: true,
          createdBy: userId,
        },
      });

      // Update template pointer
      await tx.certificateTemplate.update({
        where: { id: templateId },
        data: { currentVersion: nextVersionNumber },
      });
    });

    return this.getTemplateById(organizationId, templateId);
  }

  /**
   * Retrieves all templates for an organization
   */
  async getTemplates(organizationId: string, certificateTypeId?: string) {
    const templates = await this.prisma.certificateTemplate.findMany({
      where: {
        organizationId,
        ...(certificateTypeId ? { certificateTypeId } : {}),
        status: RecordStatus.ACTIVE,
      },
      include: {
        certificateType: true,
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return templates.map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      campusId: t.campusId,
      certificateTypeId: t.certificateTypeId,
      certificateTypeName: t.certificateType.name,
      name: t.name,
      code: t.code,
      currentVersion: t.currentVersion,
      status: t.status,
      activeVersion: t.versions[0] || null,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Retrieves template detail by ID with all versions
   */
  async getTemplateById(organizationId: string, templateId: string) {
    const template = await this.prisma.certificateTemplate.findUnique({
      where: { id: templateId },
      include: {
        certificateType: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!template || template.organizationId !== organizationId) {
      throw new NotFoundException('Certificate template not found.');
    }

    return {
      id: template.id,
      organizationId: template.organizationId,
      campusId: template.campusId,
      certificateTypeId: template.certificateTypeId,
      certificateTypeName: template.certificateType.name,
      name: template.name,
      code: template.code,
      currentVersion: template.currentVersion,
      status: template.status,
      versions: template.versions.map((v) => ({
        id: v.id,
        templateId: v.templateId,
        versionNumber: v.versionNumber,
        layout: v.layout,
        pageSize: v.pageSize,
        htmlBody: v.htmlBody,
        cssStyles: v.cssStyles,
        variables: v.variables,
        isActive: v.isActive,
        createdAt: v.createdAt.toISOString(),
      })),
      createdAt: template.createdAt.toISOString(),
    };
  }
}
