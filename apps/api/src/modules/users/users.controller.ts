import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecordStatus } from '@school/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto, PermissionOverrideDto } from './dto/assign-roles.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List users with pagination and search' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.usersService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get single user profile by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create new user account' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update user profile' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, user.organizationId, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('users:delete')
  @ApiOperation({ summary: 'Activate or deactivate user account' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('status') status: RecordStatus,
  ) {
    return this.usersService.updateStatus(id, user.organizationId, status, user.id);
  }

  @Post(':id/roles')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Assign roles to user' })
  async assignRoles(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignRolesDto,
  ) {
    return this.usersService.assignRoles(id, user.organizationId, dto.roleCodes);
  }

  @Post(':id/permissions/override')
  @RequirePermissions('roles:manage')
  @ApiOperation({ summary: 'Grant or revoke custom permission override for user' })
  async overridePermission(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PermissionOverrideDto,
  ) {
    return this.usersService.overridePermission(
      id,
      user.organizationId,
      dto.permissionCode,
      dto.isGranted,
    );
  }

  @Post(':id/lifecycle')
  @RequirePermissions('users:manage')
  @ApiOperation({ summary: 'Apply lifecycle transition: ACTIVATE, DEACTIVATE, SUSPEND, RESTORE, ARCHIVE' })
  async applyLifecycle(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    return this.usersService.applyLifecycle(id, user.organizationId, dto, user.id);
  }
}
