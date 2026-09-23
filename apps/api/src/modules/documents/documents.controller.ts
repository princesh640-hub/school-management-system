// =============================================================================
// Phase 4Q: Institutional Documents Controller
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Patch,
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
import { DocumentsService } from './documents.service';
import { DocumentCategoriesService } from './document-categories.service';
import { DocumentSharingService } from './document-sharing.service';
import {
  IDocumentUploadDto,
  IDocumentCreateVersionDto,
  IDocumentShareDto,
  DocumentLifecycleStatus,
} from '@school/shared-types';

@ApiTags('Document Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly categoriesService: DocumentCategoriesService,
    private readonly sharingService: DocumentSharingService,
  ) {}

  private getUserId(user: CurrentUserPayload): string {
    return (user as any).userId || user.id;
  }

  // ---------------------------------------------------------------------------
  // 1. Dashboard Overview & KPIs
  // ---------------------------------------------------------------------------

  @Get('dashboard/overview')
  @RequirePermissions('documents:view')
  @ApiOperation({ summary: 'Document dashboard overview and metrics' })
  async getOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.documentsService.getDashboardOverview(user.organizationId);
  }

  // ---------------------------------------------------------------------------
  // 2. Categories & Types Catalog
  // ---------------------------------------------------------------------------

  @Get('categories')
  @RequirePermissions('documents:view')
  @ApiOperation({ summary: 'List institutional document categories' })
  async getCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.categoriesService.getCategories(user.organizationId);
  }

  @Post('categories')
  @RequirePermissions('documents:categories:manage')
  @ApiOperation({ summary: 'Create custom document category' })
  async createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { code: string; name: string; description?: string },
  ) {
    return this.categoriesService.createCategory(user.organizationId, body);
  }

  @Get('types')
  @RequirePermissions('documents:view')
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiOperation({ summary: 'List document types' })
  async getTypes(
    @CurrentUser() user: CurrentUserPayload,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.categoriesService.getTypes(user.organizationId, categoryId);
  }

  @Post('types')
  @RequirePermissions('documents:categories:manage')
  @ApiOperation({ summary: 'Create new document type under category' })
  async createType(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      categoryId: string;
      code: string;
      name: string;
      description?: string;
      allowedMimeTypes?: string[];
      maxFileSizeMb?: number;
      requiresExpiry?: boolean;
    },
  ) {
    return this.categoriesService.createType(user.organizationId, body);
  }

  // ---------------------------------------------------------------------------
  // 3. Document Operations & Lifecycle
  // ---------------------------------------------------------------------------

  @Get()
  @RequirePermissions('documents:view')
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'typeId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiOperation({ summary: 'Search and filter institutional documents' })
  async listDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('categoryId') categoryId?: string,
    @Query('typeId') typeId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: DocumentLifecycleStatus,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.documentsService.listDocuments(user.organizationId, {
      categoryId,
      typeId,
      entityType,
      entityId,
      status,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('upload')
  @RequirePermissions('documents:upload')
  @ApiOperation({ summary: 'Register and attach uploaded document' })
  async uploadDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IDocumentUploadDto,
  ) {
    return this.documentsService.uploadDocument(
      user.organizationId,
      user.campusId || null,
      this.getUserId(user),
      dto,
    );
  }

  @Get('expiring')
  @RequirePermissions('documents:expiry:manage')
  @ApiQuery({ name: 'daysAhead', required: false })
  @ApiOperation({ summary: 'List documents expiring soon or already expired' })
  async getExpiring(
    @CurrentUser() user: CurrentUserPayload,
    @Query('daysAhead') daysAhead?: string,
  ) {
    const days = daysAhead ? parseInt(daysAhead, 10) : 30;
    return this.documentsService.getExpiringDocuments(user.organizationId, days);
  }

  @Get(':id')
  @RequirePermissions('documents:view')
  @ApiOperation({ summary: 'Retrieve document details and version history' })
  async getDocumentDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.documentsService.getDocumentDetail(user.organizationId, id);
  }

  @Get(':id/download')
  @RequirePermissions('documents:download')
  @ApiOperation({ summary: 'Generate secure signed download URL with permission check' })
  async getDownloadUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    const permissions = (user as any).permissions || [];
    return this.documentsService.getSecureDownloadUrl(
      user.organizationId,
      id,
      this.getUserId(user),
      permissions,
    );
  }

  @Post(':id/versions')
  @RequirePermissions('documents:update')
  @ApiOperation({ summary: 'Add a new version to an existing document' })
  async addVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: IDocumentCreateVersionDto,
  ) {
    return this.documentsService.createNewVersion(
      user.organizationId,
      id,
      this.getUserId(user),
      dto,
    );
  }

  @Patch(':id/archive')
  @RequirePermissions('documents:archive')
  @ApiOperation({ summary: 'Archive a document' })
  async archiveDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.documentsService.archiveDocument(
      user.organizationId,
      id,
      this.getUserId(user),
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Document Sharing
  // ---------------------------------------------------------------------------

  @Post(':id/share')
  @RequirePermissions('documents:update')
  @ApiOperation({ summary: 'Share document with user or role' })
  async shareDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: IDocumentShareDto,
  ) {
    return this.sharingService.shareDocument(
      user.organizationId,
      id,
      this.getUserId(user),
      dto,
    );
  }

  @Get(':id/shares')
  @RequirePermissions('documents:view')
  @ApiOperation({ summary: 'List active shares for a document' })
  async getShares(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.sharingService.getDocumentShares(user.organizationId, id);
  }
}
