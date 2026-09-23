import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { AcademicsService } from './academics.service';

@ApiTags('Academics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('academics')
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  @Get('overview')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'Get academic metrics and summary overview' })
  async getOverview(@CurrentUser() user: CurrentUserPayload, @Query('campusId') campusId?: string) {
    const targetCampus = campusId || user.campusId || undefined;
    return this.academicsService.getAcademicOverview(user.organizationId, targetCampus);
  }

  // ---------------------------------------------------------------------------
  // Years
  // ---------------------------------------------------------------------------

  @Get('years')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List academic sessions' })
  async getYears(@CurrentUser() user: CurrentUserPayload) {
    return this.academicsService.getYears(user.organizationId, user.campusId ?? undefined);
  }

  @Post('years')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create new academic year' })
  async createYear(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.academicsService.createYear(user.organizationId, dto, user.id);
  }

  @Patch('years/:id/set-current')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Set active academic year' })
  async setCurrentYear(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.academicsService.setCurrentYear(id, user.organizationId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Terms
  // ---------------------------------------------------------------------------

  @Get('years/:yearId/terms')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List academic terms for year' })
  async getTerms(@Param('yearId') yearId: string) {
    return this.academicsService.getTerms(yearId);
  }

  @Post('years/:yearId/terms')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create new academic term' })
  async createTerm(
    @Param('yearId') yearId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    return this.academicsService.createTerm(yearId, dto, user.id);
  }

  @Patch('terms/:id')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Update academic term' })
  async updateTerm(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    return this.academicsService.updateTerm(id, dto, user.id);
  }

  @Patch('years/:yearId/terms/:id/set-current')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Set active academic term' })
  async setCurrentTerm(
    @Param('yearId') yearId: string,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.academicsService.setCurrentTerm(id, yearId, user.id);
  }

  // ---------------------------------------------------------------------------
  // Classes
  // ---------------------------------------------------------------------------

  @Get('classes')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List classes for current campus' })
  async getClasses(@CurrentUser() user: CurrentUserPayload, @Query('campusId') campusId?: string) {
    const targetCampus = campusId || user.campusId;
    return this.academicsService.getClasses(targetCampus!);
  }

  @Post('classes')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create new class grade' })
  async createClass(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    const targetCampus = dto.campusId || user.campusId;
    return this.academicsService.createClass(targetCampus, dto, user.id);
  }

  @Patch('classes/:id')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Update class grade' })
  async updateClass(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.academicsService.updateClass(id, dto, user.id);
  }

  // ---------------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------------

  @Get('sections')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List sections for a class' })
  async getSections(@Query('classId') classId: string) {
    return this.academicsService.getSections(classId);
  }

  @Post('sections')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create new section in class' })
  async createSection(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.academicsService.createSection(dto, user.id);
  }

  @Patch('sections/:id')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Update section details' })
  async updateSection(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.academicsService.updateSection(id, dto, user.id);
  }

  // ---------------------------------------------------------------------------
  // Subjects
  // ---------------------------------------------------------------------------

  @Get('subjects')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List curriculum subjects' })
  async getSubjects(@Query('category') category?: string) {
    return this.academicsService.getSubjects(category);
  }

  @Post('subjects')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create subject' })
  async createSubject(@Body() dto: any) {
    return this.academicsService.createSubject(dto);
  }

  @Patch('subjects/:id')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Update subject' })
  async updateSubject(@Param('id') id: string, @Body() dto: any) {
    return this.academicsService.updateSubject(id, dto);
  }

  @Post('subjects/assign-teacher')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Assign teacher to subject and section' })
  async assignSubjectTeacher(@Body() dto: { subjectId: string; teacherId: string; sectionId: string }) {
    return this.academicsService.assignSubjectTeacher(dto);
  }

  // ---------------------------------------------------------------------------
  // Curricula
  // ---------------------------------------------------------------------------

  @Get('curricula')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List curricula' })
  async getCurricula(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.academicsService.getCurricula(user.organizationId, {
      campusId: campusId || user.campusId || undefined,
      academicYearId,
      classId,
    });
  }

  @Post('curricula')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create curriculum study plan' })
  async createCurriculum(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.academicsService.createCurriculum(user.organizationId, dto, user.id);
  }

  @Post('curricula/:id/subjects')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Add subject to curriculum' })
  async addSubjectToCurriculum(@Param('id') id: string, @Body() dto: any) {
    return this.academicsService.addSubjectToCurriculum(id, dto);
  }

  @Delete('curricula/:id/subjects/:subjectId')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Remove subject from curriculum' })
  async removeSubjectFromCurriculum(@Param('id') id: string, @Param('subjectId') subjectId: string) {
    return this.academicsService.removeSubjectFromCurriculum(id, subjectId);
  }

  // ---------------------------------------------------------------------------
  // Subject Offerings
  // ---------------------------------------------------------------------------

  @Get('offerings')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List subject offerings' })
  async getOfferings(
    @CurrentUser() user: CurrentUserPayload,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.academicsService.getSubjectOfferings(user.organizationId, {
      academicYearId,
      termId,
      classId,
      sectionId,
      teacherId,
    });
  }

  @Post('offerings')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create or update subject offering' })
  async createOffering(@Body() dto: any) {
    return this.academicsService.createSubjectOffering(dto);
  }

  // ---------------------------------------------------------------------------
  // Class Teacher & Workload
  // ---------------------------------------------------------------------------

  @Post('sections/:id/class-teacher')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Assign class teacher to section' })
  async assignClassTeacher(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { teacherId: string; academicYearId: string },
  ) {
    return this.academicsService.assignClassTeacher(id, dto.teacherId, dto.academicYearId, user.id);
  }

  @Get('sections/:id/class-teacher/history')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'Get class teacher assignment history for section' })
  async getClassTeacherHistory(@Param('id') id: string) {
    return this.academicsService.getClassTeacherHistory(id);
  }

  @Get('teachers/:id/workload')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'Get teacher course workload and assignments' })
  async getTeacherWorkload(@Param('id') id: string, @Query('academicYearId') academicYearId?: string) {
    return this.academicsService.getTeacherWorkload(id, academicYearId);
  }

  // ---------------------------------------------------------------------------
  // Enrollments
  // ---------------------------------------------------------------------------

  @Post('enrollments')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Enroll student into class section' })
  async enrollStudent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { academicYearId: string; studentId: string; sectionId: string; rollNumber?: string; allowCapacityOverride?: boolean },
  ) {
    return this.academicsService.enrollStudent(dto, user.id);
  }

  @Patch('enrollments/:id/transfer')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Transfer student to another section' })
  async transferSection(@Param('id') id: string, @Body('newSectionId') newSectionId: string) {
    return this.academicsService.transferSection(id, newSectionId);
  }

  @Get('sections/:id/roster')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'Get section roster students' })
  async getSectionRoster(@Param('id') id: string, @Query('academicYearId') academicYearId?: string) {
    return this.academicsService.getSectionRoster(id, academicYearId);
  }

  // ---------------------------------------------------------------------------
  // Academic Calendar & Events
  // ---------------------------------------------------------------------------

  @Get('calendar')
  @RequirePermissions('academics:read')
  @ApiOperation({ summary: 'List academic calendar events' })
  async getCalendarEvents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('termId') termId?: string,
    @Query('category') category?: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.academicsService.getCalendarEvents(user.organizationId, {
      campusId: campusId || user.campusId || undefined,
      academicYearId,
      termId,
      category,
      startDate,
      endDate,
    });
  }

  @Post('calendar')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Create academic calendar event' })
  async createCalendarEvent(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.academicsService.createCalendarEvent(user.organizationId, dto, user.id);
  }

  @Patch('calendar/:id')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Update academic calendar event' })
  async updateCalendarEvent(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    return this.academicsService.updateCalendarEvent(id, user.organizationId, dto, user.id);
  }

  @Delete('calendar/:id')
  @RequirePermissions('academics:manage')
  @ApiOperation({ summary: 'Delete academic calendar event' })
  async deleteCalendarEvent(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.academicsService.deleteCalendarEvent(id, user.organizationId);
  }
}
