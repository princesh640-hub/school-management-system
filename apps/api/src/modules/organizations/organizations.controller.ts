import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get('current')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get current organization details' })
  async getCurrent(@CurrentUser() user: CurrentUserPayload) {
    return this.orgService.getCurrent(user.organizationId);
  }

  @Patch('current')
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Update current organization settings' })
  async updateCurrent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { name?: string; domain?: string; currency?: string; timezone?: string },
  ) {
    return this.orgService.updateCurrent(user.organizationId, dto, user.id);
  }
}
