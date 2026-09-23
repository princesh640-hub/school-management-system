// =============================================================================
// Phase 4O: Student Portal Controller
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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { StudentDashboardService } from './student-dashboard.service';
import { StudentProfileService } from './student-profile.service';
import { StudentAcademicService } from './student-academic.service';
import { StudentFinanceService } from './student-finance.service';
import { StudentServicesService } from './student-services.service';
import { StudentCommunicationService } from './student-communication.service';
import {
  IUpdateStudentProfileDto,
  IStudentPreferencesDto,
  IStudentMessageDto,
} from '@school/shared-types';

@ApiTags('Student Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('student')
export class StudentController {
  constructor(
    private readonly dashboardService: StudentDashboardService,
    private readonly profileService: StudentProfileService,
    private readonly academicService: StudentAcademicService,
    private readonly financeService: StudentFinanceService,
    private readonly servicesService: StudentServicesService,
    private readonly communicationService: StudentCommunicationService,
  ) {}

  private getUserId(user: CurrentUserPayload): string {
    return (user as any).userId || user.id;
  }

  // ---------------------------------------------------------------------------
  // 1. Dashboard & Academic Overview
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @RequirePermissions('student:portal:view')
  @ApiOperation({ summary: 'Aggregated dashboard overview for authenticated student' })
  async getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getDashboardOverview(this.getUserId(user));
  }

  @Get('overview')
  @RequirePermissions('student:portal:view')
  @ApiOperation({ summary: 'Alias for dashboard overview' })
  async getOverview(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getDashboardOverview(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 2. Profile Basics & Preferences
  // ---------------------------------------------------------------------------

  @Get('profile')
  @RequirePermissions('student:profile:view')
  @ApiOperation({ summary: 'Sanitized profile of the authenticated student' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getStudentProfile(this.getUserId(user));
  }

  @Patch('profile')
  @RequirePermissions('student:profile:update-limited')
  @ApiOperation({ summary: 'Limited self-service contact details update' })
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IUpdateStudentProfileDto,
  ) {
    return this.profileService.updateStudentProfile(this.getUserId(user), dto);
  }

  @Get('preferences')
  @RequirePermissions('student:portal:view')
  @ApiOperation({ summary: 'Notification preferences & quiet hours' })
  async getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getStudentPreferences(this.getUserId(user));
  }

  @Patch('preferences')
  @RequirePermissions('student:preferences:update')
  @ApiOperation({ summary: 'Update notification preferences & quiet hours' })
  async updatePreferences(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IStudentPreferencesDto,
  ) {
    return this.profileService.updateStudentPreferences(this.getUserId(user), dto);
  }

  // ---------------------------------------------------------------------------
  // 3. Academics, Subjects & Timetable
  // ---------------------------------------------------------------------------

  @Get('academics')
  @RequirePermissions('student:academics:view')
  @ApiOperation({ summary: 'Class, section, and class teacher details' })
  async getAcademics(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getAcademicDetails(this.getUserId(user));
  }

  @Get('subjects')
  @RequirePermissions('student:subjects:view')
  @ApiOperation({ summary: 'Enrolled subjects and assigned teachers' })
  async getSubjects(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getSubjects(this.getUserId(user));
  }

  @Get('timetable')
  @RequirePermissions('student:timetable:view')
  @ApiOperation({ summary: 'Currently published weekly timetable for enrolled section' })
  async getTimetable(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getTimetable(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 4. Attendance & Alerts
  // ---------------------------------------------------------------------------

  @Get('attendance')
  @RequirePermissions('student:attendance:view')
  @ApiOperation({ summary: 'Attendance statistics, recent records, and attendance alerts' })
  async getAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.academicService.getAttendance(this.getUserId(user), { startDate, endDate });
  }

  // ---------------------------------------------------------------------------
  // 5. Examinations, Published Results & Report Cards
  // ---------------------------------------------------------------------------

  @Get('exams')
  @RequirePermissions('student:exams:view')
  @ApiOperation({ summary: 'Upcoming published examinations' })
  async getExams(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getUpcomingExams(this.getUserId(user));
  }

  @Get('results')
  @RequirePermissions('student:results:view')
  @ApiOperation({ summary: 'Official published examination results' })
  async getResults(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getPublishedResults(this.getUserId(user));
  }

  @Get('report-cards')
  @RequirePermissions('student:report-cards:view')
  @ApiOperation({ summary: 'Official published report cards' })
  async getReportCards(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getReportCards(this.getUserId(user));
  }

  @Get('history')
  @RequirePermissions('student:academics:view')
  @ApiOperation({ summary: 'Historical enrollments and academic performance' })
  async getHistory(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getAcademicHistory(this.getUserId(user));
  }

  @Get('calendar')
  @RequirePermissions('student:calendar:view')
  @ApiOperation({ summary: 'Student-targeted academic calendar events and holidays' })
  async getCalendar(@CurrentUser() user: CurrentUserPayload) {
    return this.academicService.getAcademicCalendar(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 6. Fees & Payments
  // ---------------------------------------------------------------------------

  @Get('fees')
  @RequirePermissions('student:fees:view')
  @ApiOperation({ summary: 'Fee invoices, payment history, and gateway readiness' })
  async getFees(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.getFeeSummary(this.getUserId(user));
  }

  @Post('fees/:invoiceId/pay')
  @RequirePermissions('student:payments:create')
  @ApiOperation({ summary: 'Initiate online payment for own fee invoice' })
  async initiatePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('invoiceId') invoiceId: string,
    @Body('amount') amount?: number,
  ) {
    return this.financeService.initiatePayment(this.getUserId(user), invoiceId, amount);
  }

  // ---------------------------------------------------------------------------
  // 7. Library, Transport & Hostel
  // ---------------------------------------------------------------------------

  @Get('library')
  @RequirePermissions('student:library:view')
  @ApiOperation({ summary: 'Active library loans, due dates, and fines' })
  async getLibrary(@CurrentUser() user: CurrentUserPayload) {
    return this.servicesService.getLibrary(this.getUserId(user));
  }

  @Get('transport')
  @RequirePermissions('student:transport:view')
  @ApiOperation({ summary: 'Assigned bus route, pickup/drop stop, and schedule' })
  async getTransport(@CurrentUser() user: CurrentUserPayload) {
    return this.servicesService.getTransport(this.getUserId(user));
  }

  @Get('hostel')
  @RequirePermissions('student:hostel:view')
  @ApiOperation({ summary: 'Hostel room allocation, roll calls, and outings' })
  async getHostel(@CurrentUser() user: CurrentUserPayload) {
    return this.servicesService.getHostel(this.getUserId(user));
  }

  @Get('documents')
  @RequirePermissions('student:documents:view')
  @ApiOperation({ summary: 'Authorized and verified student documents' })
  async getDocuments(@CurrentUser() user: CurrentUserPayload) {
    return this.servicesService.getDocuments(this.getUserId(user));
  }

  // ---------------------------------------------------------------------------
  // 8. Notices, Notifications & Messaging
  // ---------------------------------------------------------------------------

  @Get('notices')
  @RequirePermissions('student:notices:view')
  @ApiOperation({ summary: 'School announcements and circulars' })
  async getNotices(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.getNotices(this.getUserId(user));
  }

  @Get('notifications')
  @RequirePermissions('student:notifications:view')
  @ApiOperation({ summary: 'Student personal notifications inbox' })
  async getNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.getNotifications(this.getUserId(user));
  }

  @Patch('notifications/:id/read')
  @RequirePermissions('student:notifications:view')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.communicationService.markNotificationAsRead(this.getUserId(user), id);
  }

  @Post('notifications/read-all')
  @RequirePermissions('student:notifications:view')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.markAllNotificationsAsRead(this.getUserId(user));
  }

  @Post('messages')
  @RequirePermissions('student:messages:create')
  @ApiOperation({ summary: 'Send controlled message to class teacher or administration' })
  async sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IStudentMessageDto,
  ) {
    return this.communicationService.sendMessage(this.getUserId(user), dto);
  }
}
