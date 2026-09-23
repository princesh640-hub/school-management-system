// =============================================================================
// Phase 4N: Parent & Guardian Portal Controller
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
import { ParentChildrenService } from './parent-children.service';
import { ParentAcademicService } from './parent-academic.service';
import { ParentFinanceService } from './parent-finance.service';
import { ParentServicesService } from './parent-services.service';
import { ParentCommunicationService } from './parent-communication.service';
import { ParentProfileService } from './parent-profile.service';
import {
  IUpdateParentProfileDto,
  IParentMessageDto,
} from '@school/shared-types';

@ApiTags('Parent Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parent')
export class ParentController {
  constructor(
    private readonly childrenService: ParentChildrenService,
    private readonly academicService: ParentAcademicService,
    private readonly financeService: ParentFinanceService,
    private readonly servicesService: ParentServicesService,
    private readonly communicationService: ParentCommunicationService,
    private readonly profileService: ParentProfileService,
  ) {}

  private getUserId(user: CurrentUserPayload): string {
    return (user as any).userId || user.id;
  }

  // ---------------------------------------------------------------------------
  // 1. Children Roster & Child Switcher
  // ---------------------------------------------------------------------------

  @Get('children')
  @RequirePermissions('parent:children:view')
  @ApiOperation({ summary: 'List all authorized children linked to this guardian' })
  async getChildren(@CurrentUser() user: CurrentUserPayload) {
    return this.childrenService.getChildren(this.getUserId(user));
  }

  @Get('children/:studentId/overview')
  @RequirePermissions('parent:portal:view')
  @ApiOperation({ summary: 'Aggregated dashboard overview for the selected child' })
  async getChildOverview(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.childrenService.getChildOverview(this.getUserId(user), studentId);
  }

  @Get('children/:studentId/profile')
  @RequirePermissions('parent:children:view')
  @ApiOperation({ summary: 'Get child profile and enrollment details' })
  async getChildProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.childrenService.getChildProfile(this.getUserId(user), studentId);
  }

  // ---------------------------------------------------------------------------
  // 2. Academic Information (Attendance, Timetable, Exams, Results, Report Cards)
  // ---------------------------------------------------------------------------

  @Get('children/:studentId/attendance')
  @RequirePermissions('parent:attendance:view')
  @ApiOperation({ summary: 'Get child attendance history and summary percentage' })
  async getChildAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.academicService.getChildAttendance(
      this.getUserId(user),
      studentId,
      startDate,
      endDate,
    );
  }

  @Get('children/:studentId/timetable')
  @RequirePermissions('parent:timetable:view')
  @ApiOperation({ summary: 'Get published weekly class timetable for child' })
  async getChildTimetable(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.academicService.getChildTimetable(this.getUserId(user), studentId);
  }

  @Get('children/:studentId/exams')
  @RequirePermissions('parent:exams:view')
  @ApiOperation({ summary: 'List upcoming examinations eligible for child' })
  async getChildExams(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.academicService.getChildExams(this.getUserId(user), studentId);
  }

  @Get('children/:studentId/results')
  @RequirePermissions('parent:results:view')
  @ApiOperation({ summary: 'View official published examination results for child' })
  async getChildResults(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.academicService.getChildResults(this.getUserId(user), studentId);
  }

  @Get('children/:studentId/report-cards')
  @RequirePermissions('parent:report-cards:view')
  @ApiOperation({ summary: 'View published official report cards for child' })
  async getChildReportCards(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.academicService.getChildReportCards(
      this.getUserId(user),
      studentId,
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Finance & Invoices
  // ---------------------------------------------------------------------------

  @Get('children/:studentId/fees')
  @RequirePermissions('parent:fees:view')
  @ApiOperation({ summary: 'View child fee invoices, balances, and payment receipts' })
  async getChildFees(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.financeService.getChildFeeSummary(this.getUserId(user), studentId);
  }

  @Post('children/:studentId/fees/:invoiceId/pay')
  @RequirePermissions('parent:payments:create')
  @ApiOperation({ summary: 'Initiate online payment for child fee invoice' })
  async initiatePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.financeService.initiateOnlinePayment(
      this.getUserId(user),
      studentId,
      invoiceId,
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Transport, Hostel, Library & Documents
  // ---------------------------------------------------------------------------

  @Get('children/:studentId/transport')
  @RequirePermissions('parent:transport:view')
  @ApiOperation({ summary: 'View child school bus route, stops, and boarding history' })
  async getChildTransport(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.servicesService.getChildTransport(this.getUserId(user), studentId);
  }

  @Get('children/:studentId/hostel')
  @RequirePermissions('parent:hostel:view')
  @ApiOperation({ summary: 'View child hostel allocation, attendance, and outings' })
  async getChildHostel(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.servicesService.getChildHostel(this.getUserId(user), studentId);
  }

  @Get('children/:studentId/library')
  @RequirePermissions('parent:library:view')
  @ApiOperation({ summary: 'View child library book loans and due dates' })
  async getChildLibrary(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.servicesService.getChildLibrary(this.getUserId(user), studentId);
  }

  @Get('children/:studentId/documents')
  @RequirePermissions('parent:documents:view')
  @ApiOperation({ summary: 'Access authorized student documents and certificates' })
  async getChildDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.servicesService.getChildDocuments(this.getUserId(user), studentId);
  }

  // ---------------------------------------------------------------------------
  // 5. Notices, Notifications & School Communication
  // ---------------------------------------------------------------------------

  @Get('notices')
  @RequirePermissions('parent:notices:view')
  @ApiOperation({ summary: 'View institutional announcements targeted to parent or children' })
  async getNotices(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.getParentNotices(this.getUserId(user));
  }

  @Get('notifications')
  @RequirePermissions('parent:portal:view')
  @ApiOperation({ summary: 'Get parent notification inbox' })
  async getNotifications(@CurrentUser() user: CurrentUserPayload) {
    return this.communicationService.getParentNotifications(this.getUserId(user));
  }

  @Post('messages')
  @RequirePermissions('parent:messages:create')
  @ApiOperation({ summary: 'Send inquiry or communication regarding child to school staff' })
  async sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IParentMessageDto,
  ) {
    return this.communicationService.sendSchoolMessage(this.getUserId(user), dto);
  }

  // ---------------------------------------------------------------------------
  // 6. Guardian Profile & Preferences
  // ---------------------------------------------------------------------------

  @Get('profile')
  @RequirePermissions('parent:portal:view')
  @ApiOperation({ summary: 'Get guardian personal profile and children count' })
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getGuardianProfile(this.getUserId(user));
  }

  @Patch('profile')
  @RequirePermissions('parent:profile:update')
  @ApiOperation({ summary: 'Update guardian contact information' })
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: IUpdateParentProfileDto,
  ) {
    return this.profileService.updateGuardianProfile(this.getUserId(user), dto);
  }

  @Get('preferences')
  @RequirePermissions('parent:portal:view')
  @ApiOperation({ summary: 'Get parent notification and quiet-hour preferences' })
  async getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getParentPreferences(this.getUserId(user));
  }
}
