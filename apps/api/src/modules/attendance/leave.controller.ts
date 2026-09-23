import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { LeaveService } from './leave.service';

@ApiTags('Leave Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attendance/leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('types')
  @RequirePermissions('leave:read')
  @ApiOperation({ summary: 'List institutional leave types' })
  async getLeaveTypes(@CurrentUser() user: CurrentUserPayload) {
    return this.leaveService.getLeaveTypes(user.organizationId);
  }

  @Post('types')
  @RequirePermissions('leave:manage-policies')
  @ApiOperation({ summary: 'Create institutional leave type' })
  async createLeaveType(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.leaveService.createLeaveType(user.organizationId, dto);
  }

  @Get('balances')
  @RequirePermissions('leave:read')
  @ApiOperation({ summary: 'Get leave balances for an employee' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'year', required: false })
  async getBalances(@Query('employeeId') employeeId: string, @Query('year') year?: string) {
    return this.leaveService.getEmployeeBalances(employeeId, year ? parseInt(year, 10) : undefined);
  }

  @Post('balances/allocate')
  @RequirePermissions('leave:manage-policies')
  @ApiOperation({ summary: 'Allocate or adjust leave balance' })
  async allocateBalance(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.leaveService.allocateBalance(user.organizationId, dto, user.id);
  }

  @Post('apply')
  @RequirePermissions('leave:apply')
  @ApiOperation({ summary: 'Submit employee leave application' })
  async applyLeave(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.leaveService.applyLeave(user, dto);
  }

  @Patch('applications/:id/review')
  @RequirePermissions('leave:approve')
  @ApiOperation({ summary: 'Approve or reject leave application' })
  async reviewLeave(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: { decision: 'APPROVE' | 'REJECT'; decisionNotes?: string },
  ) {
    return this.leaveService.reviewLeave(user, id, dto);
  }

  @Post('applications/:id/cancel')
  @RequirePermissions('leave:apply')
  @ApiOperation({ summary: 'Cancel pending leave application' })
  async cancelLeave(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leaveService.cancelLeave(user, id);
  }

  @Get('applications')
  @RequirePermissions('leave:read')
  @ApiOperation({ summary: 'List leave applications' })
  @ApiQuery({ name: 'campusId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async getApplications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: any,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.leaveService.getLeaveApplications(user.organizationId, {
      campusId: campusId || user.campusId || undefined,
      employeeId,
      status,
      departmentId,
    });
  }

  @Get('calendar')
  @RequirePermissions('leave:read')
  @ApiOperation({ summary: 'Get leave calendar of approved absences' })
  @ApiQuery({ name: 'campusId', required: false })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  async getCalendar(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.leaveService.getLeaveCalendar(
      user.organizationId,
      campusId || user.campusId || undefined,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }
}
