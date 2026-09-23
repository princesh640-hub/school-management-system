import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionsService } from './permissions.service';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all system-level fine-grained permissions' })
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get('grouped')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all permissions grouped by domain module' })
  async findGrouped() {
    return this.permissionsService.findGroupedByModule();
  }
}
