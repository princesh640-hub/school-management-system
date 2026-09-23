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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { ExaminationsService } from './examinations.service';
import { ExamSessionsService } from './exam-sessions.service';
import { MarksEntryService } from './marks-entry.service';
import { ResultProcessingService } from './result-processing.service';
import { ReportCardService } from './report-card.service';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { EnterResultsDto } from './dto/enter-results.dto';
import {
  CreateExamTypeDto,
  CreateExamSessionDto,
  ExamSessionStatus,
  CreateExamScheduleExtendedDto,
  AssignInvigilatorDto,
  CreateAssessmentComponentDto,
  EnterMarksBatchDto,
  SubmitMarksDto,
  RequestMarksCorrectionDto,
  ReviewMarksCorrectionDto,
  CreateGradeScaleDto,
  CalculateSessionResultDto,
  PublishResultsDto,
  GenerateReportCardDto,
  GenerateTranscriptDto,
} from '@school/shared-types';

@ApiTags('Examinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('examinations')
export class ExaminationsController {
  constructor(
    private readonly examinationsService: ExaminationsService,
    private readonly examSessionsService: ExamSessionsService,
    private readonly marksEntryService: MarksEntryService,
    private readonly resultProcessingService: ResultProcessingService,
    private readonly reportCardService: ReportCardService,
  ) {}

  // ===========================================================================
  // 1. Phase 2 Legacy Schedule & Results Endpoints (100% Preserved)
  // ===========================================================================

  @Post('schedules')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Create new exam schedule (Legacy compatible)' })
  async createSchedule(@Body() dto: CreateExamScheduleDto) {
    return this.examinationsService.createSchedule(dto);
  }

  @Get('schedules')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'List exam schedules' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'examSessionId', required: false })
  async getSchedules(
    @Query('academicYearId') academicYearId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('examSessionId') examSessionId?: string,
  ) {
    return this.examinationsService.getSchedules(academicYearId, subjectId, examSessionId);
  }

  @Get('schedules/:id')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'Get exam schedule details by ID' })
  async getScheduleById(@Param('id') id: string) {
    return this.examinationsService.getScheduleById(id);
  }

  @Post('results/entry')
  @RequirePermissions('examinations:grade')
  @ApiOperation({ summary: 'Enter or update marks for an exam schedule (Legacy compatible)' })
  async enterResults(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: EnterResultsDto,
  ) {
    return this.examinationsService.enterResults(user, dto);
  }

  @Get('schedules/:id/results')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'Get student results and grade sheet for an exam schedule' })
  async getScheduleResults(@Param('id') id: string) {
    return this.examinationsService.getScheduleResults(id);
  }

  // ===========================================================================
  // 2. Exam Types & Sessions
  // ===========================================================================

  @Post('types')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Create new exam type' })
  async createExamType(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExamTypeDto,
  ) {
    return this.examSessionsService.createExamType(user, dto);
  }

  @Get('types')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'List exam types' })
  @ApiQuery({ name: 'campusId', required: false })
  async getExamTypes(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.examSessionsService.getExamTypes(user, campusId);
  }

  @Post('sessions')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Create new exam session' })
  async createExamSession(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExamSessionDto,
  ) {
    return this.examSessionsService.createExamSession(user, dto);
  }

  @Get('sessions')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'List exam sessions' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getExamSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('academicYearId') academicYearId?: string,
    @Query('status') status?: ExamSessionStatus,
  ) {
    return this.examSessionsService.getExamSessions(user, academicYearId, status);
  }

  @Get('sessions/:id')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'Get exam session by ID with schedules' })
  async getExamSessionById(@Param('id') id: string) {
    return this.examSessionsService.getExamSessionById(id);
  }

  @Patch('sessions/:id/status')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Transition exam session lifecycle state' })
  async updateSessionStatus(
    @Param('id') id: string,
    @Body('status') status: ExamSessionStatus,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.examSessionsService.updateSessionStatus(id, status, user);
  }

  // ===========================================================================
  // 3. Extended Schedules & Invigilation
  // ===========================================================================

  @Post('schedules/extended')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Create extended exam schedule with room and session' })
  async createScheduleExtended(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExamScheduleExtendedDto,
  ) {
    return this.examinationsService.createScheduleExtended(user, dto);
  }

  @Post('schedules/:id/invigilators')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Assign invigilator to exam schedule' })
  async assignInvigilator(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') scheduleId: string,
    @Body() body: { teacherId: string; roomId?: string; role?: string },
  ) {
    return this.examinationsService.assignInvigilator(user, {
      examScheduleId: scheduleId,
      teacherId: body.teacherId,
      roomId: body.roomId,
      role: body.role,
    });
  }

  // ===========================================================================
  // 4. Assessment Components & Advanced Marks Entry
  // ===========================================================================

  @Post('schedules/:id/components')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Create assessment component for exam schedule' })
  async createComponent(
    @Param('id') scheduleId: string,
    @Body() dto: Omit<CreateAssessmentComponentDto, 'examScheduleId'>,
  ) {
    return this.marksEntryService.createAssessmentComponent({
      ...dto,
      examScheduleId: scheduleId,
    });
  }

  @Get('schedules/:id/components')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'List assessment components for exam schedule' })
  async getScheduleComponents(@Param('id') scheduleId: string) {
    return this.marksEntryService.getScheduleComponents(scheduleId);
  }

  @Post('marks/batch')
  @RequirePermissions('examinations:grade')
  @ApiOperation({ summary: 'Batch enter or update marks with component breakdowns' })
  async enterMarksBatch(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: EnterMarksBatchDto,
  ) {
    return this.marksEntryService.enterMarksBatch(user, dto);
  }

  @Post('marks/submit')
  @RequirePermissions('examinations:grade')
  @ApiOperation({ summary: 'Submit completed marks sheet for review' })
  async submitMarks(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SubmitMarksDto,
  ) {
    return this.marksEntryService.submitMarks(user, dto);
  }

  @Post('marks/corrections')
  @RequirePermissions('examinations:grade')
  @ApiOperation({ summary: 'Request a formal marks correction' })
  async requestCorrection(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RequestMarksCorrectionDto,
  ) {
    return this.marksEntryService.requestCorrection(user, dto);
  }

  @Patch('marks/corrections/:id/review')
  @RequirePermissions('examinations:review')
  @ApiOperation({ summary: 'Review and approve or reject marks correction request' })
  async reviewCorrection(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') correctionId: string,
    @Body() dto: Omit<ReviewMarksCorrectionDto, 'correctionId'>,
  ) {
    return this.marksEntryService.reviewCorrection(user, {
      ...dto,
      correctionId,
    });
  }

  // ===========================================================================
  // 5. Dynamic Grading Scales & Rules
  // ===========================================================================

  @Post('grading/scales')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Create configurable grading scale with rules' })
  async createGradeScale(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateGradeScaleDto,
  ) {
    return this.resultProcessingService.createGradeScale(user, dto);
  }

  @Get('grading/scales')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'List grading scales' })
  @ApiQuery({ name: 'campusId', required: false })
  async getGradeScales(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.resultProcessingService.getGradeScales(user, campusId);
  }

  // ===========================================================================
  // 6. Session Results Aggregation, Approval, Locking & Publication Gates
  // ===========================================================================

  @Post('results/calculate')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Calculate consolidated session results and student ranks' })
  async calculateSessionResults(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CalculateSessionResultDto,
  ) {
    return this.resultProcessingService.calculateSessionResults(user, dto);
  }

  @Post('results/approve')
  @RequirePermissions('examinations:approve')
  @ApiOperation({ summary: 'Approve session examination results' })
  async approveResults(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { examSessionId: string; sectionId?: string },
  ) {
    return this.resultProcessingService.approveResults(
      user,
      body.examSessionId,
      body.sectionId,
    );
  }

  @Post('results/lock')
  @RequirePermissions('examinations:approve')
  @ApiOperation({ summary: 'Lock results to prevent modifications without correction workflow' })
  async lockResults(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { examSessionId: string; sectionId?: string },
  ) {
    return this.resultProcessingService.lockResults(
      user,
      body.examSessionId,
      body.sectionId,
    );
  }

  @Post('results/publish')
  @RequirePermissions('examinations:publish')
  @ApiOperation({ summary: 'Publish results to student and parent portals' })
  async publishResults(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PublishResultsDto,
  ) {
    return this.resultProcessingService.publishResults(user, dto);
  }

  @Get('results/session/:sessionId/student/:studentId')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'Get privacy-governed session results for student' })
  async getStudentSessionResult(
    @Param('sessionId') sessionId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const isStaff = ['SUPER_ADMIN', 'CAMPUS_ADMIN', 'PRINCIPAL', 'TEACHER', 'COORDINATOR'].includes(
      user.role,
    );
    return this.resultProcessingService.getStudentSessionResult(sessionId, studentId, isStaff);
  }

  @Get('analytics/session/:sessionId')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'Get session/section examination performance analytics' })
  @ApiQuery({ name: 'sectionId', required: false })
  async getSectionAnalytics(
    @Param('sessionId') sessionId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.resultProcessingService.getSectionAnalytics(sessionId, sectionId);
  }

  // ===========================================================================
  // 7. Report Cards & Cumulative Transcripts
  // ===========================================================================

  @Post('report-cards/generate')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Generate print-ready student report card with attendance integration' })
  async generateReportCard(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateReportCardDto,
  ) {
    return this.reportCardService.generateReportCard(user, dto);
  }

  @Get('report-cards/:id')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'Get report card record by ID' })
  async getReportCardById(@Param('id') id: string) {
    return this.reportCardService.getReportCardById(id);
  }

  @Post('transcripts/generate')
  @RequirePermissions('examinations:manage')
  @ApiOperation({ summary: 'Generate cumulative multi-year academic transcript' })
  async generateTranscript(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateTranscriptDto,
  ) {
    return this.reportCardService.generateTranscript(user, dto);
  }

  @Get('transcripts/student/:studentId')
  @RequirePermissions('examinations:read')
  @ApiOperation({ summary: 'Get cumulative transcripts for student' })
  async getStudentTranscripts(@Param('studentId') studentId: string) {
    return this.reportCardService.getStudentTranscripts(studentId);
  }
}
