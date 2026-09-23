import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { GuardiansService } from './guardians.service';

@ApiTags('Guardians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Get()
  @RequirePermissions('guardians:read')
  @ApiOperation({ summary: 'List guardians' })
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.guardiansService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('guardians:read')
  @ApiOperation({ summary: 'Get guardian profile and wards' })
  async findOne(@Param('id') id: string) {
    return this.guardiansService.findOne(id);
  }

  @Post()
  @RequirePermissions('guardians:create')
  @ApiOperation({ summary: 'Register new guardian' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.guardiansService.create(user.organizationId, dto, user.id);
  }
}
