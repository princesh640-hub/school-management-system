import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@ApiTags('Grading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('grading')
export class GradingController {
  @Get()
  @RequirePermissions('grading:read')
  @ApiOperation({ summary: 'List grading criteria and scales' })
  async getGrading(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Grading domain boundary active', organizationId: user.organizationId };
  }
}
