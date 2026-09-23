import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounts')
export class AccountsController {
  @Get('summary')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Get accounts ledger summary' })
  async getSummary(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Accounts domain boundary active', organizationId: user.organizationId };
  }
}
