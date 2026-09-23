import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { TeachersService } from './teachers.service';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'List teachers directory' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.teachersService.findAll(user.organizationId, user.campusId ?? undefined);
  }

  @Get(':id')
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'Get teacher profile with assignments' })
  async findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }

  @Post()
  @RequirePermissions('teachers:create')
  @ApiOperation({ summary: 'Register new teacher' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.teachersService.create(user.organizationId, dto, user.id);
  }
}
