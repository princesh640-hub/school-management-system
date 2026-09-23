import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { NotificationsService } from './notifications.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'List notifications for the current authenticated user' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getMyNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const isUnreadOnly = unreadOnly === 'true';
    return this.notificationsService.getMyNotifications(user.id, isUnreadOnly);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  async markAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @RequirePermissions('notifications:read')
  @ApiOperation({ summary: 'Mark all notifications for the current user as read' })
  async markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('broadcast')
  @RequirePermissions('notifications:send')
  @ApiOperation({ summary: 'Broadcast notification to users' })
  async broadcast(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BroadcastNotificationDto,
  ) {
    return this.notificationsService.broadcast(user, dto);
  }
}
