import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { RolesService } from './roles.service';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all roles and assigned permissions for current organization' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.findAll(user.organizationId);
  }

  @Post()
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Create new custom role' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { name: string; code: string; description?: string; permissionCodes?: string[] },
  ) {
    return this.rolesService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Update custom role' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { name?: string; description?: string },
  ) {
    return this.rolesService.update(id, user.organizationId, dto, user.id);
  }

  @Post(':id/permissions')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Assign permission set to role' })
  async assignPermissions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('permissionCodes') permissionCodes: string[],
  ) {
    return this.rolesService.assignPermissions(id, user.organizationId, permissionCodes, user.id);
  }

  @Delete(':id')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Delete custom role (blocks system roles)' })
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.delete(id, user.organizationId, user.id);
  }
}
