import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'List security and mutation audit logs with filtering' })
  @ApiQuery({ name: 'module', required: false, description: 'Filter by domain module (e.g. users, roles)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action (e.g. CREATE, LIFECYCLE_SUSPEND)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by actor user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date ISO string' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date ISO string' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationQueryDto & {
      module?: string;
      action?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.auditService.findAll(user.organizationId, query);
  }
}
