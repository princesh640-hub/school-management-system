// =============================================================================
// Phase 4Q: Certificates Controller
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CertificatesService } from './certificates.service';
import { CertificateTemplatesService } from './certificate-templates.service';
import { CertificateVerificationService } from './certificate-verification.service';
import {
  ICertificateIssueDto,
  ICertificateApprovalDto,
  ICertificateRevokeDto,
  CertificateLifecycleStatus,
} from '@school/shared-types';

@ApiTags('Certificate Management')
@Controller('certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly templatesService: CertificateTemplatesService,
    private readonly verificationService: CertificateVerificationService,
  ) {}

  private getUserId(user: CurrentUserPayload): string {
    return (user as any).userId || user.id;
  }

  // ---------------------------------------------------------------------------
  // 1. Public Verification (Unauthenticated & Rate-Limited)
  // ---------------------------------------------------------------------------

  @Get('verify/:reference')
  @ApiOperation({ summary: 'Publicly verify certificate authenticity by cryptographic token' })
  async verifyCertificate(@Param('reference') reference: string) {
    return this.verificationService.verifyCertificate(reference);
  }

  // ---------------------------------------------------------------------------
  // 2. Certificate Types Catalog
  // ---------------------------------------------------------------------------

  @Get('types')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificates:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List institutional certificate types' })
  async getCertificateTypes(@CurrentUser() user: CurrentUserPayload) {
    return this.templatesService.getCertificateTypes(user.organizationId);
  }

  @Post('types')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificates:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create custom certificate type' })
  async createCertificateType(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      code: string;
      name: string;
      category: any;
      requiresApproval?: boolean;
      validityDays?: number;
      description?: string;
    },
  ) {
    return this.templatesService.createCertificateType(user.organizationId, body);
  }

  // ---------------------------------------------------------------------------
  // 3. Certificate Templates
  // ---------------------------------------------------------------------------

  @Get('templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificate-templates:view')
  @ApiBearerAuth()
  @ApiQuery({ name: 'certificateTypeId', required: false })
  @ApiOperation({ summary: 'List certificate templates' })
  async getTemplates(
    @CurrentUser() user: CurrentUserPayload,
    @Query('certificateTypeId') certificateTypeId?: string,
  ) {
    return this.templatesService.getTemplates(user.organizationId, certificateTypeId);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificate-templates:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new certificate template' })
  async createTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      certificateTypeId: string;
      name: string;
      code: string;
      layout?: any;
      pageSize?: any;
      htmlBody: string;
      cssStyles?: string;
      headerConfig?: any;
      footerConfig?: any;
    },
  ) {
    return this.templatesService.createTemplate(
      user.organizationId,
      user.campusId || null,
      this.getUserId(user),
      body,
    );
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificate-templates:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get template detail and version history' })
  async getTemplateById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.templatesService.getTemplateById(user.organizationId, id);
  }

  @Post('templates/:id/versions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificate-templates:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new version of a certificate template' })
  async createTemplateVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      layout?: any;
      pageSize?: any;
      htmlBody: string;
      cssStyles?: string;
      headerConfig?: any;
      footerConfig?: any;
    },
  ) {
    return this.templatesService.createTemplateVersion(
      user.organizationId,
      id,
      this.getUserId(user),
      body,
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Certificate Issuance & Ledger
  // ---------------------------------------------------------------------------

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificates:view')
  @ApiBearerAuth()
  @ApiQuery({ name: 'certificateTypeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiOperation({ summary: 'List and search issued certificates' })
  async listCertificates(
    @CurrentUser() user: CurrentUserPayload,
    @Query('certificateTypeId') certificateTypeId?: string,
    @Query('status') status?: CertificateLifecycleStatus,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.certificatesService.listCertificates(user.organizationId, {
      certificateTypeId,
      status,
      entityType,
      entityId,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('issue')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificates:create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request or issue an institutional certificate' })
  async issueCertificate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ICertificateIssueDto,
  ) {
    return this.certificatesService.requestCertificateIssuance(
      user.organizationId,
      user.campusId || null,
      this.getUserId(user),
      dto,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificates:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate details with rendered print HTML' })
  async getCertificateDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.certificatesService.getCertificateDetail(user.organizationId, id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificates:approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review and approve/reject a certificate request' })
  async reviewApproval(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: ICertificateApprovalDto,
  ) {
    return this.certificatesService.reviewCertificateApproval(
      user.organizationId,
      id,
      this.getUserId(user),
      body.approved,
      body.remarks,
    );
  }

  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('certificates:revoke')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an issued certificate with mandatory reason' })
  async revokeCertificate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ICertificateRevokeDto,
  ) {
    return this.certificatesService.revokeCertificate(
      user.organizationId,
      id,
      this.getUserId(user),
      dto,
    );
  }
}
