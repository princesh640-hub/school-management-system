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
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ---------------------------------------------------------------------------
  // Core Student Roster & Marking (Phase 2 & Acceptance QA preserved)
  // ---------------------------------------------------------------------------

  @Get('roster')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Get student roster and attendance status for a date' })
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'date', required: true, example: '2026-09-17' })
  async getRoster(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getRosterForDate(user, sectionId, date);
  }

  @Post('mark')
  @RequirePermissions('attendance:mark')
  @ApiOperation({ summary: 'Mark student attendance for a section and date' })
  async markAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.attendanceService.markAttendance(user, dto.sectionId, dto.date, dto.records);
  }

  @Get('summary')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Get section attendance summary and analytics' })
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSummary(
    @Query('sectionId') sectionId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getSummary(sectionId, startDate, endDate);
  }

  // ---------------------------------------------------------------------------
  // Attendance Sessions
  // ---------------------------------------------------------------------------

  @Post('sessions')
  @RequirePermissions('attendance:mark')
  @ApiOperation({ summary: 'Create or initialize attendance session' })
  async createSession(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.attendanceService.getOrCreateSession(user.organizationId, user.campusId ?? undefined, dto, user.id);
  }

  @Get('sessions')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Get attendance sessions for a section and date' })
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'date', required: true })
  async getSessions(@Query('sectionId') sectionId: string, @Query('date') date: string) {
    return this.attendanceService.getSessions(sectionId, date);
  }

  // ---------------------------------------------------------------------------
  // Attendance Locking
  // ---------------------------------------------------------------------------

  @Post('lock')
  @RequirePermissions('attendance:lock')
  @ApiOperation({ summary: 'Lock attendance records for a scope' })
  async lockAttendance(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.attendanceService.lockAttendance(user.organizationId, user.campusId ?? undefined, dto, user.id);
  }

  @Post('unlock/:id')
  @RequirePermissions('attendance:unlock')
  @ApiOperation({ summary: 'Unlock attendance records with justification' })
  async unlockAttendance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('reason') reason: string,
  ) {
    return this.attendanceService.unlockAttendance(id, reason || 'Authorized unlock', user.id);
  }

  // ---------------------------------------------------------------------------
  // Attendance Corrections Workflow
  // ---------------------------------------------------------------------------

  @Post('corrections')
  @RequirePermissions('attendance:correct')
  @ApiOperation({ summary: 'Request attendance correction' })
  async requestCorrection(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.attendanceService.requestCorrection(user, dto);
  }

  @Patch('corrections/:id/review')
  @RequirePermissions('attendance:approve-correction')
  @ApiOperation({ summary: 'Approve or reject attendance correction' })
  async reviewCorrection(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { decision: 'APPROVE' | 'REJECT'; decisionReason?: string },
  ) {
    return this.attendanceService.reviewCorrection(user, id, dto);
  }

  @Get('corrections')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'List attendance correction requests' })
  async getCorrections(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: any,
    @Query('targetType') targetType?: any,
  ) {
    return this.attendanceService.getCorrections(user.organizationId, { status, targetType });
  }

  // ---------------------------------------------------------------------------
  // Thresholds & Streaks
  // ---------------------------------------------------------------------------

  @Get('thresholds')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Get institutional attendance thresholds' })
  async getThresholds(@CurrentUser() user: CurrentUserPayload, @Query('campusId') campusId?: string) {
    return this.attendanceService.getThresholds(user.organizationId, campusId || user.campusId || undefined);
  }

  @Post('thresholds')
  @RequirePermissions('attendance:manage')
  @ApiOperation({ summary: 'Configure institutional attendance thresholds' })
  async updateThresholds(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { minimumPercentage: number; warningPercentage: number; criticalPercentage: number; campusId?: string },
  ) {
    const campusId = dto.campusId || user.campusId || undefined;
    return this.attendanceService.updateThresholds(user.organizationId, campusId, dto);
  }

  @Get('streaks')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Get absence streaks for a section' })
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'threshold', required: false })
  async getStreaks(@Query('sectionId') sectionId: string, @Query('threshold') threshold?: string) {
    return this.attendanceService.getAbsenceStreaks(sectionId, threshold ? parseInt(threshold, 10) : 3);
  }
}
