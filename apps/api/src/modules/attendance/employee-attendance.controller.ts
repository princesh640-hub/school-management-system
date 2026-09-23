import {
  Controller,
  Get,
  Post,
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
import { EmployeeAttendanceService } from './employee-attendance.service';

@ApiTags('Employee Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attendance/employees')
export class EmployeeAttendanceController {
  constructor(private readonly employeeAttendanceService: EmployeeAttendanceService) {}

  @Get('roster')
  @RequirePermissions('employee-attendance:read')
  @ApiOperation({ summary: 'Get employee attendance roster for date' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'campusId', required: false })
  async getRoster(
    @CurrentUser() user: CurrentUserPayload,
    @Query('date') date?: string,
    @Query('departmentId') departmentId?: string,
    @Query('campusId') campusId?: string,
  ) {
    const targetCampus = campusId || user.campusId || undefined;
    return this.employeeAttendanceService.getRosterForDate(
      user.organizationId,
      targetCampus,
      departmentId,
      date,
    );
  }

  @Post('mark')
  @RequirePermissions('employee-attendance:mark')
  @ApiOperation({ summary: 'Mark employee attendance record' })
  async markAttendance(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.employeeAttendanceService.markAttendance(user, dto);
  }

  @Post('punch')
  @RequirePermissions('employee-attendance:mark')
  @ApiOperation({ summary: 'Log employee check-in or check-out punch' })
  async logPunch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { employeeId: string; punchType: 'CHECK_IN' | 'CHECK_OUT'; timestamp?: string; source?: any },
  ) {
    return this.employeeAttendanceService.logPunch(user, dto);
  }

  @Get(':id/summary')
  @RequirePermissions('employee-attendance:read')
  @ApiOperation({ summary: 'Get employee attendance statistics summary' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSummary(
    @Param('id') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.employeeAttendanceService.getEmployeeSummary(employeeId, startDate, endDate);
  }

  @Get('department-summary')
  @RequirePermissions('employee-attendance:read')
  @ApiOperation({ summary: 'Get department attendance summary for date' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'date', required: false })
  async getDepartmentSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Query('departmentId') departmentId?: string,
    @Query('date') date?: string,
  ) {
    return this.employeeAttendanceService.getDepartmentSummary(user.organizationId, departmentId, date);
  }
}
