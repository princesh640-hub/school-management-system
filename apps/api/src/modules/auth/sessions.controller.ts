import { Controller, Get, Post, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { SessionsService } from './sessions.service';

@ApiTags('Authentication & Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('auth')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions for current user' })
  async getMySessions(@CurrentUser() user: CurrentUserPayload) {
    return this.sessionsService.listUserSessions(user.id);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.sessionsService.revokeSession(id, user.id, user.id);
  }

  @Delete('sessions')
  @ApiOperation({ summary: 'Revoke all other active sessions' })
  async revokeAllOtherSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.sessionsService.revokeAllOtherSessions(user.id);
  }

  @Post('impersonate/:userId')
  @RequirePermissions('users:manage', 'settings:manage')
  @ApiOperation({ summary: 'Impersonate a user account (Super Admin only, strictly audited)' })
  async impersonate(
    @Param('userId') targetUserId: string,
    @CurrentUser() actor: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers?.['x-forwarded-for'];
    const ua = req.headers?.['user-agent'];
    return this.sessionsService.impersonate(targetUserId, actor, ip, ua);
  }
}
