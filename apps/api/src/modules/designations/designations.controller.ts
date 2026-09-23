import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecordStatus } from '@school/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@ApiTags('Designations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('designations')
export class DesignationsController {
  constructor(private readonly designationsService: DesignationsService) {}

  @Get()
  @RequirePermissions('designations:read')
  @ApiOperation({ summary: 'List designations for current organization' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
  ) {
    return this.designationsService.findAll(user.organizationId, departmentId, search);
  }

  @Get(':id')
  @RequirePermissions('designations:read')
  @ApiOperation({ summary: 'Get single designation by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.designationsService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermissions('designations:manage')
  @ApiOperation({ summary: 'Create new designation' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateDesignationDto) {
    return this.designationsService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('designations:manage')
  @ApiOperation({ summary: 'Update designation details' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateDesignationDto,
  ) {
    return this.designationsService.update(id, user.organizationId, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('designations:manage')
  @ApiOperation({ summary: 'Update designation status' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('status') status: RecordStatus,
  ) {
    return this.designationsService.updateStatus(id, user.organizationId, status, user.id);
  }

  @Delete(':id')
  @RequirePermissions('designations:manage')
  @ApiOperation({ summary: 'Archive designation' })
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.designationsService.delete(id, user.organizationId, user.id);
  }
}
