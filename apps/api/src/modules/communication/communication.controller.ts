// =============================================================================
// Phase 4M: Communication & Notification Ecosystem Controller
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CommunicationAnnouncementsService } from './communication-announcements.service';
import { CommunicationCampaignsService } from './communication-campaigns.service';
import { CommunicationTemplatesService } from './communication-templates.service';
import { CommunicationAudienceService } from './communication-audience.service';
import { CommunicationDeliveryService } from './communication-delivery.service';
import { CommunicationPreferencesService } from './communication-preferences.service';
import { CommunicationReportsService } from './communication-reports.service';
import {
  ICreateAnnouncementDto,
  IUpdateAnnouncementDto,
  ICreateCampaignDto,
  ICreateTemplateDto,
  IUpdateTemplateDto,
  ICreateAudienceDto,
  IUpdatePreferenceDto,
  IRegisterDeviceDto,
} from '@school/shared-types';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('communication')
export class CommunicationController {
  constructor(
    private readonly announcementsService: CommunicationAnnouncementsService,
    private readonly campaignsService: CommunicationCampaignsService,
    private readonly templatesService: CommunicationTemplatesService,
    private readonly audienceService: CommunicationAudienceService,
    private readonly deliveryService: CommunicationDeliveryService,
    private readonly preferencesService: CommunicationPreferencesService,
    private readonly reportsService: CommunicationReportsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Announcements
  // ---------------------------------------------------------------------------

  @Post('announcements')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Create a new institutional announcement' })
  async createAnnouncement(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ICreateAnnouncementDto,
  ) {
    return this.announcementsService.createAnnouncement(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get('announcements')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'List institutional announcements' })
  async listAnnouncements(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('status') status?: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('publishedOnly') publishedOnly?: string,
  ) {
    return this.announcementsService.listAnnouncements(user.organizationId, {
      campusId,
      status,
      category,
      search,
      publishedOnly: publishedOnly === 'true',
    });
  }

  @Get('announcements/:id')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Get announcement details by ID' })
  async getAnnouncementById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.announcementsService.getAnnouncementById(user.organizationId, id);
  }

  @Patch('announcements/:id')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Update an existing announcement' })
  async updateAnnouncement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: IUpdateAnnouncementDto,
  ) {
    return this.announcementsService.updateAnnouncement(
      user.organizationId,
      id,
      dto,
    );
  }

  @Post('announcements/:id/publish')
  @RequirePermissions('communication:send')
  @ApiOperation({ summary: 'Publish an announcement and broadcast in-app notifications' })
  async publishAnnouncement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.announcementsService.publishAnnouncement(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Post('announcements/:id/archive')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Archive an announcement' })
  async archiveAnnouncement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.announcementsService.archiveAnnouncement(user.organizationId, id);
  }

  @Delete('announcements/:id')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Delete an announcement' })
  async deleteAnnouncement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.announcementsService.deleteAnnouncement(user.organizationId, id);
  }

  // ---------------------------------------------------------------------------
  // 2. Campaigns
  // ---------------------------------------------------------------------------

  @Post('campaigns')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Create a communication campaign' })
  async createCampaign(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ICreateCampaignDto,
  ) {
    return this.campaignsService.createCampaign(
      user.organizationId,
      dto,
      user.userId,
    );
  }

  @Get('campaigns')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'List communication campaigns' })
  async listCampaigns(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('status') status?: any,
    @Query('search') search?: string,
  ) {
    return this.campaignsService.listCampaigns(user.organizationId, {
      campusId,
      status,
      search,
    });
  }

  @Get('campaigns/:id')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Get campaign details by ID' })
  async getCampaignById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.campaignsService.getCampaignById(user.organizationId, id);
  }

  @Post('campaigns/:id/send')
  @RequirePermissions('communication:send')
  @ApiOperation({ summary: 'Execute and dispatch a campaign across configured channels' })
  async sendCampaign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.campaignsService.executeCampaign(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Post('campaigns/:id/cancel')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Cancel a scheduled or queued campaign' })
  async cancelCampaign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.campaignsService.cancelCampaign(user.organizationId, id);
  }

  // ---------------------------------------------------------------------------
  // 3. Templates & Versioning
  // ---------------------------------------------------------------------------

  @Post('templates')
  @RequirePermissions('communication:templates:manage')
  @ApiOperation({ summary: 'Create a multi-channel template' })
  async createTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ICreateTemplateDto,
  ) {
    return this.templatesService.createTemplate(
      user.organizationId,
      dto,
      user.userId,
    );
  }

  @Get('templates')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'List templates with filters' })
  async listTemplates(
    @CurrentUser() user: CurrentUserPayload,
    @Query('channel') channel?: any,
    @Query('language') language?: any,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.templatesService.listTemplates(user.organizationId, {
      channel,
      language,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('templates/:id')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Get template details with version history' })
  async getTemplateById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.templatesService.getTemplateById(user.organizationId, id);
  }

  @Patch('templates/:id')
  @RequirePermissions('communication:templates:manage')
  @ApiOperation({ summary: 'Update a template and generate a new version record' })
  async updateTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: IUpdateTemplateDto,
  ) {
    return this.templatesService.updateTemplate(
      user.organizationId,
      id,
      dto,
      user.userId,
    );
  }

  @Delete('templates/:id')
  @RequirePermissions('communication:templates:manage')
  @ApiOperation({ summary: 'Delete a template' })
  async deleteTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.templatesService.deleteTemplate(user.organizationId, id);
  }

  @Post('templates/:id/preview')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Preview rendered template with sample variables' })
  async previewTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() sampleData: Record<string, any>,
  ) {
    return this.templatesService.previewTemplate(
      user.organizationId,
      id,
      sampleData,
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Audiences
  // ---------------------------------------------------------------------------

  @Post('audiences')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Create a saved audience segment' })
  async createAudience(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ICreateAudienceDto,
  ) {
    return this.audienceService.createAudience(user.organizationId, dto);
  }

  @Get('audiences')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'List saved audience segments' })
  async listAudiences(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
  ) {
    return this.audienceService.listAudiences(user.organizationId, search);
  }

  @Get('audiences/:id')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Get audience segment details by ID' })
  async getAudienceById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.audienceService.getAudienceById(user.organizationId, id);
  }

  @Patch('audiences/:id')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Update an audience segment' })
  async updateAudience(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.audienceService.updateAudience(user.organizationId, id, dto);
  }

  @Delete('audiences/:id')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Delete an audience segment' })
  async deleteAudience(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.audienceService.deleteAudience(user.organizationId, id);
  }

  @Post('audiences/preview')
  @RequirePermissions('communication:compose')
  @ApiOperation({ summary: 'Preview audience recipient count and samples' })
  async previewAudience(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { audienceType: any; filterCriteria?: any },
  ) {
    return this.audienceService.previewAudience(
      user.organizationId,
      dto.audienceType,
      dto.filterCriteria,
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Delivery Ledger & Logs
  // ---------------------------------------------------------------------------

  @Get('deliveries')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'List delivery ledger records with filtering and pagination' })
  async listDeliveries(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campaignId') campaignId?: string,
    @Query('channel') channel?: any,
    @Query('status') status?: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deliveryService.listDeliveries(user.organizationId, {
      campaignId,
      channel,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('deliveries/:id')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Get delivery record details' })
  async getDeliveryById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.deliveryService.getDeliveryById(id);
  }

  @Post('deliveries/:id/retry')
  @RequirePermissions('communication:send')
  @ApiOperation({ summary: 'Retry a failed delivery attempt' })
  async retryDelivery(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.deliveryService.retryDelivery(id);
  }

  // ---------------------------------------------------------------------------
  // 6. Webhooks (External Status Ingestion)
  // ---------------------------------------------------------------------------

  @Post('webhooks/:provider')
  @ApiOperation({ summary: 'Inbound delivery status webhook from external providers' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
  ) {
    return this.deliveryService.handleWebhookEvent(
      provider,
      payload.event || payload.type || 'DELIVERY_UPDATE',
      payload,
      payload.id || payload.eventId,
    );
  }

  // ---------------------------------------------------------------------------
  // 7. User Preferences & Device Registry
  // ---------------------------------------------------------------------------

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user communication preferences and quiet hours' })
  async getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.preferencesService.getUserPreferences(user.userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update current user communication preferences and quiet hours' })
  async updatePreferences(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IUpdatePreferenceDto,
  ) {
    return this.preferencesService.updateUserPreferences(user.userId, dto);
  }

  @Post('devices/register')
  @ApiOperation({ summary: 'Register a device push token for the current user' })
  async registerDevice(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IRegisterDeviceDto,
  ) {
    return this.preferencesService.registerDevice(user.userId, dto);
  }

  @Delete('devices/:token')
  @ApiOperation({ summary: 'Unregister a device push token' })
  async unregisterDevice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('token') token: string,
  ) {
    return this.preferencesService.unregisterDevice(user.userId, token);
  }

  // ---------------------------------------------------------------------------
  // 8. Reports & Diagnostics
  // ---------------------------------------------------------------------------

  @Get('reports/kpis')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Get institutional communication dashboard KPIs' })
  async getDashboardKpis(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.reportsService.getDashboardKpis(user.organizationId, campusId);
  }

  @Get('reports/providers')
  @RequirePermissions('communication:read')
  @ApiOperation({ summary: 'Get provider status and readiness summary' })
  async getProviderStatusSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getProviderStatusSummary();
  }
}
