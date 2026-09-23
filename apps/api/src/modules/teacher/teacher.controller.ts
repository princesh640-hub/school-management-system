// =============================================================================
// Phase 4P: Teacher Portal Controller
// =============================================================================
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
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeacherClassesService } from './teacher-classes.service';
import { TeacherAcademicsService } from './teacher-academics.service';
import { TeacherSelfServiceService } from './teacher-self-service.service';
import { TeacherCommunicationService } from './teacher-communication.service';
import {
  ITeacherMarkAttendanceDto,
  ITeacherAttendanceCorrectionDto,
  ITeacherSubmitMarksDto,
  ITeacherMarksCorrectionDto,
  ITeacherLeaveApplicationDto,
  ITeacherClassMessageDto,
} from '@school/shared-types';

@ApiTags('Teacher Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('teacher')
export class TeacherController {
  constructor(
    private readonly dashboardService: TeacherDashboardService,
    private readonly classesService: TeacherClassesService,
    private readonly academicsService: TeacherAcademicsService,
    private readonly selfService: TeacherSelfServiceService,
    private readonly communicationService: TeacherCommunicationService,
  ) {}

  private getUserId(user: CurrentUserPayload): string {
    return (user as any).userId || user.id;
  }

  // ---------------------------------------------------------------------------
  // 1. Dashboard & Today's Schedule
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @RequirePermissions('teacher:portal:view')
  @ApiOperation({ summary: 'Teacher dashboard overview with today schedule and pending tasks' })
  async getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getDashboardOverview(this.getUserId(user));
  }

  @Get('overview')
  @RequirePermissions('teacher:portal:view')
  @ApiOperation({ summary: 'Alias for teacher dashboard overview' })
  async getOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getDashboardOverview(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 2. Profile & Teaching Assignments
  // ---------------------------------------------------------------------------

  @Get('profile')
  @RequirePermissions('teacher:profile:view')
  @ApiOperation({ summary: 'Sanitized teacher profile' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.classesService.getTeacherProfile(this.getUserId(user));
  }

  @Get('assignments')
  @RequirePermissions('teacher:assignments:view')
  @ApiOperation({ summary: 'List of assigned classes, sections, and subjects' })
  async getAssignments(@CurrentUser() user: CurrentUserPayload) {
    return this.classesService.getAssignedSections(this.getUserId(user));
  }

  @Get('classes')
  @RequirePermissions('teacher:classes:view')
  @ApiOperation({ summary: 'Assigned sections and student counts' })
  async getClasses(@CurrentUser() user: CurrentUserPayload) {
    return this.classesService.getAssignedSections(this.getUserId(user));
  }

  @Get('subjects')
  @RequirePermissions('teacher:classes:view')
  @ApiOperation({ summary: 'Assigned subjects and sections' })
  async getSubjects(@CurrentUser() user: CurrentUserPayload) {
    return this.classesService.getAssignedSubjects(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 3. Students Scope
  // ---------------------------------------------------------------------------

  @Get('students')
  @RequirePermissions('teacher:students:view')
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiOperation({ summary: 'List students enrolled in teacher assigned sections' })
  async getStudents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.classesService.getStudentsRoster(this.getUserId(user), sectionId);
  }

  @Get('classes/:sectionId/students')
  @RequirePermissions('teacher:students:view')
  @ApiOperation({ summary: 'List students enrolled in specific assigned section' })
  async getSectionStudents(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sectionId') sectionId: string,
  ) {
    return this.classesService.getStudentsRoster(this.getUserId(user), sectionId);
  }

  @Get('students/:studentId')
  @RequirePermissions('teacher:students:view')
  @ApiOperation({ summary: 'Educational student detail (attendance, subjects, performance)' })
  async getStudentDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.getStudentDetail(this.getUserId(user), studentId);
  }

  // ---------------------------------------------------------------------------
  // 4. Timetable
  // ---------------------------------------------------------------------------

  @Get('timetable')
  @RequirePermissions('teacher:timetable:view')
  @ApiOperation({ summary: 'Published teaching timetable (today and weekly)' })
  async getTimetable(@CurrentUser() user: CurrentUserPayload) {
    return this.academicsService.getTimetable(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 5. Fast Attendance & Correction
  // ---------------------------------------------------------------------------

  @Get('attendance/roster')
  @RequirePermissions('teacher:attendance:view')
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiOperation({ summary: 'Load student attendance roster for fast daily roll-call' })
  async getAttendanceRoster(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
  ) {
    return this.academicsService.getAttendanceRoster(this.getUserId(user), sectionId, date);
  }

  @Get('attendance')
  @RequirePermissions('teacher:attendance:view')
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiOperation({ summary: 'Load student attendance roster' })
  async getAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
  ) {
    return this.academicsService.getAttendanceRoster(this.getUserId(user), sectionId, date);
  }

  @Post('attendance/mark')
  @RequirePermissions('teacher:attendance:mark')
  @ApiOperation({ summary: 'Save daily student attendance for assigned section' })
  async markAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherMarkAttendanceDto,
  ) {
    return this.academicsService.markAttendance(this.getUserId(user), dto);
  }

  @Post('attendance')
  @RequirePermissions('teacher:attendance:mark')
  @ApiOperation({ summary: 'Save daily student attendance for assigned section' })
  async postAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherMarkAttendanceDto,
  ) {
    return this.academicsService.markAttendance(this.getUserId(user), dto);
  }

  @Post('attendance/correct')
  @RequirePermissions('teacher:attendance:correct')
  @ApiOperation({ summary: 'Submit attendance correction request for locked attendance' })
  async requestAttendanceCorrection(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherAttendanceCorrectionDto,
  ) {
    return this.academicsService.requestAttendanceCorrection(this.getUserId(user), dto);
  }

  @Post('attendance/corrections')
  @RequirePermissions('teacher:attendance:correct')
  @ApiOperation({ summary: 'Submit attendance correction request' })
  async postAttendanceCorrection(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherAttendanceCorrectionDto,
  ) {
    return this.academicsService.requestAttendanceCorrection(this.getUserId(user), dto);
  }

  // ---------------------------------------------------------------------------
  // 6. Examinations & Marks Entry
  // ---------------------------------------------------------------------------

  @Get('exams')
  @RequirePermissions('teacher:exams:view')
  @ApiOperation({ summary: 'List exam tasks assigned for teaching subjects or invigilation' })
  async getExams(@CurrentUser() user: CurrentUserPayload) {
    return this.academicsService.getExamTasks(this.getUserId(user));
  }

  @Get('exams/:examScheduleId/roster')
  @RequirePermissions('teacher:marks:view')
  @ApiOperation({ summary: 'Load student roster for marks entry' })
  async getMarksRoster(
    @CurrentUser() user: CurrentUserPayload,
    @Param('examScheduleId') examScheduleId: string,
  ) {
    return this.academicsService.getMarksRoster(this.getUserId(user), examScheduleId);
  }

  @Get('marks/:examScheduleId')
  @RequirePermissions('teacher:marks:view')
  @ApiOperation({ summary: 'Load student roster for marks entry' })
  async getMarks(
    @CurrentUser() user: CurrentUserPayload,
    @Param('examScheduleId') examScheduleId: string,
  ) {
    return this.academicsService.getMarksRoster(this.getUserId(user), examScheduleId);
  }

  @Post('marks/submit')
  @RequirePermissions('teacher:marks:enter')
  @ApiOperation({ summary: 'Save draft or submit final exam marks' })
  async submitMarks(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherSubmitMarksDto,
  ) {
    return this.academicsService.submitMarks(this.getUserId(user), dto);
  }

  @Post('marks')
  @RequirePermissions('teacher:marks:enter')
  @ApiOperation({ summary: 'Save draft or submit final exam marks' })
  async postMarks(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherSubmitMarksDto,
  ) {
    return this.academicsService.submitMarks(this.getUserId(user), dto);
  }

  @Post('marks/correct')
  @RequirePermissions('teacher:marks:correct')
  @ApiOperation({ summary: 'Request marks correction for submitted/reviewed marks' })
  async requestMarksCorrection(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherMarksCorrectionDto,
  ) {
    return this.academicsService.requestMarksCorrection(this.getUserId(user), dto);
  }

  @Post('marks/corrections')
  @RequirePermissions('teacher:marks:correct')
  @ApiOperation({ summary: 'Request marks correction for submitted/reviewed marks' })
  async postMarksCorrection(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherMarksCorrectionDto,
  ) {
    return this.academicsService.requestMarksCorrection(this.getUserId(user), dto);
  }

  @Get('results/:examScheduleId')
  @RequirePermissions('teacher:results:view')
  @ApiOperation({ summary: 'Class performance summary for completed exam' })
  async getResultSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Param('examScheduleId') examScheduleId: string,
  ) {
    return this.academicsService.getResultSummary(this.getUserId(user), examScheduleId);
  }

  @Get('results/classes/:sectionId/exams/:examScheduleId')
  @RequirePermissions('teacher:results:view')
  @ApiOperation({ summary: 'Class performance summary for completed exam in section' })
  async getClassResultSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sectionId') sectionId: string,
    @Param('examScheduleId') examScheduleId: string,
  ) {
    return this.academicsService.getResultSummary(this.getUserId(user), examScheduleId);
  }

  // ---------------------------------------------------------------------------
  // 7. Leave & Employee Self-Service
  // ---------------------------------------------------------------------------

  @Get('leave')
  @RequirePermissions('teacher:leave:view')
  @ApiOperation({ summary: 'Personal leave balances and application history' })
  async getLeave(@CurrentUser() user: CurrentUserPayload) {
    return this.selfService.getLeaveSummary(this.getUserId(user));
  }

  @Post('leave/apply')
  @RequirePermissions('teacher:leave:apply')
  @ApiOperation({ summary: 'Submit personal leave application' })
  async applyForLeave(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherLeaveApplicationDto,
  ) {
    return this.selfService.applyForLeave(this.getUserId(user), dto);
  }

  @Get('staff-attendance')
  @RequirePermissions('teacher:leave:view')
  @ApiOperation({ summary: 'Teacher personal staff attendance records' })
  async getStaffAttendance(@CurrentUser() user: CurrentUserPayload) {
    return this.selfService.getStaffAttendance(this.getUserId(user));
  }

  @Get('timesheets')
  @RequirePermissions('teacher:leave:view')
  @ApiOperation({ summary: 'Teacher personal staff attendance timesheets' })
  async getTimesheets(@CurrentUser() user: CurrentUserPayload) {
    return this.selfService.getStaffAttendance(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 8. Notices & Communication
  // ---------------------------------------------------------------------------

  @Get('notices')
  @RequirePermissions('teacher:notices:view')
  @ApiOperation({ summary: 'School announcements and faculty circulars' })
  async getNotices(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.getNotices(this.getUserId(user));
  }

  @Post('notices/class')
  @RequirePermissions('teacher:notices:create')
  @ApiOperation({ summary: 'Post announcement to assigned section' })
  async postClassAnnouncement(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherClassMessageDto,
  ) {
    return this.communicationService.sendClassAnnouncement(this.getUserId(user), dto);
  }

  @Post('communication/send')
  @RequirePermissions('teacher:notices:create')
  @ApiOperation({ summary: 'Post announcement to assigned section' })
  async sendSectionMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ITeacherClassMessageDto,
  ) {
    return this.communicationService.sendClassAnnouncement(this.getUserId(user), dto);
  }

  @Get('notifications')
  @RequirePermissions('teacher:notifications:view')
  @ApiOperation({ summary: 'Teacher notification inbox' })
  async getNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.getNotifications(this.getUserId(user));
  }

  @Patch('notifications/:id/read')
  @RequirePermissions('teacher:notifications:view')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.communicationService.markNotificationAsRead(this.getUserId(user), id);
  }

  @Post('notifications/read-all')
  @RequirePermissions('teacher:notifications:view')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.markAllNotificationsAsRead(this.getUserId(user));
  }
}
