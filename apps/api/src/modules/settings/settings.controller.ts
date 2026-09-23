import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get organization system settings' })
  async getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.prisma.systemSetting.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { key: 'asc' },
    });
  }

  @Patch()
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Update or create organization system settings' })
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    const results = [];
    for (const item of dto.settings) {
      const setting = await this.prisma.systemSetting.upsert({
        where: {
          organizationId_key: {
            organizationId: user.organizationId,
            key: item.key,
          },
        },
        update: {
          value: item.value,
          ...(item.description !== undefined ? { description: item.description } : {}),
        },
        create: {
          organizationId: user.organizationId,
          key: item.key,
          value: item.value,
          description: item.description,
        },
      });
      results.push(setting);
    }

    return {
      message: `Updated ${results.length} settings successfully`,
      settings: results,
    };
  }
}
