import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { HrReportsService } from './hr-reports.service';

@ApiTags('HR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrReportsService: HrReportsService) {}

  @Get('departments')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List HR departments' })
  async getDepartments(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'HR domain boundary active', organizationId: user.organizationId };
  }

  @Get('analytics')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get consolidated HR analytics and metrics summary' })
  async getHrAnalytics(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.hrReportsService.getHrAnalyticsSummary(user, campusId);
  }

  @Get('headcount')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get headcount breakdowns by lifecycle status' })
  async getHeadcount(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.hrReportsService.getHeadcountAnalytics(user, campusId);
  }

  @Get('distribution')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get employee distribution by department' })
  async getDepartmentDistribution(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.hrReportsService.getDepartmentDistribution(user, campusId);
  }

  @Get('contracts/expiring')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get contracts expiring soon' })
  async getExpiringContracts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days?: string,
  ) {
    const d = days ? parseInt(days, 10) : 30;
    return this.hrReportsService.getContractsExpiringSoon(user, d);
  }
}
