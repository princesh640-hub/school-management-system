import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecordStatus } from '@school/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions('departments:read')
  @ApiOperation({ summary: 'List departments for campus or organization' })
  @ApiQuery({ name: 'campusId', required: false })
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query('campusId') campusId?: string) {
    const targetCampus = campusId || user.campusId || undefined;
    return this.departmentsService.findAll(user.organizationId, targetCampus);
  }

  @Get(':id')
  @RequirePermissions('departments:read')
  @ApiOperation({ summary: 'Get single department details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.departmentsService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermissions('departments:manage')
  @ApiOperation({ summary: 'Create new department' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(user.organizationId, user.campusId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('departments:manage')
  @ApiOperation({ summary: 'Update department information' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, user.organizationId, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('departments:manage')
  @ApiOperation({ summary: 'Update department status' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('status') status: RecordStatus,
  ) {
    return this.departmentsService.updateStatus(id, user.organizationId, status, user.id);
  }

  @Delete(':id')
  @RequirePermissions('departments:manage')
  @ApiOperation({ summary: 'Archive department' })
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.departmentsService.delete(id, user.organizationId, user.id);
  }
}
