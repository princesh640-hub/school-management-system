import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecordStatus } from '@school/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CampusesService } from './campuses.service';

@ApiTags('Campuses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('campuses')
export class CampusesController {
  constructor(private readonly campusesService: CampusesService) {}

  @Get()
  @RequirePermissions('campuses:read')
  @ApiOperation({ summary: 'List campuses under organization' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.campusesService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('campuses:read')
  @ApiOperation({ summary: 'Get single campus details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.campusesService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermissions('campuses:manage')
  @ApiOperation({ summary: 'Create new campus' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.campusesService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('campuses:manage')
  @ApiOperation({ summary: 'Update campus details' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    return this.campusesService.update(id, user.organizationId, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('campuses:manage')
  @ApiOperation({ summary: 'Activate or deactivate campus' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('status') status: RecordStatus,
  ) {
    return this.campusesService.updateStatus(id, user.organizationId, status, user.id);
  }
}
