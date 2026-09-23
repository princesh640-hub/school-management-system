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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { TimetableService } from './timetable.service';
import {
  CreatePeriodDto,
  UpdatePeriodDto,
  CreateRoomDto,
  UpdateRoomDto,
  SetTeacherAvailabilityDto,
  SetRoomAvailabilityDto,
  CreateTimetableVersionDto,
  CreateTimetableEntryDto,
  PublishTimetableDto,
  CopyDayScheduleDto,
  CopySectionScheduleDto,
  RunAutomatedSchedulerDto,
  DayOfWeek,
} from '@school/shared-types';

@ApiTags('Timetable & Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  @RequirePermissions('timetable:read')
  @ApiOperation({ summary: 'Query timetable schedules root' })
  async getTimetable(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Timetable domain boundary active', organizationId: user.organizationId };
  }

  // ---------------------------------------------------------------------------
  // Working Days Configuration
  // ---------------------------------------------------------------------------

  @Get('working-days')
  @RequirePermissions('timetable:read')
  @ApiOperation({ summary: 'Get working days configuration' })
  @ApiQuery({ name: 'campusId', required: false })
  async getWorkingDays(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.timetableService.getWorkingDays(user.organizationId, campusId || user.campusId || undefined);
  }

  @Post('working-days')
  @RequirePermissions('timetable:manage')
  @ApiOperation({ summary: 'Update working days configuration' })
  async updateWorkingDays(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { campusId?: string; configs: Array<{ dayOfWeek: DayOfWeek; isWorking: boolean; startTime?: string; endTime?: string }> },
  ) {
    return this.timetableService.updateWorkingDays(
      user.organizationId,
      dto.campusId || user.campusId || undefined,
      dto.configs,
      user.id,
    );
  }

  // ---------------------------------------------------------------------------
  // Timetable Periods
  // ---------------------------------------------------------------------------

  @Get('periods')
  @RequirePermissions('timetable:read')
  @ApiOperation({ summary: 'List timetable periods' })
  @ApiQuery({ name: 'campusId', required: false })
  async getPeriods(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.timetableService.getPeriods(user.organizationId, campusId || user.campusId || undefined);
  }

  @Post('periods')
  @RequirePermissions('timetable:manage')
  @ApiOperation({ summary: 'Create timetable period' })
  async createPeriod(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePeriodDto,
  ) {
    return this.timetableService.createPeriod(user.organizationId, dto, user.id);
  }

  @Patch('periods/:id')
  @RequirePermissions('timetable:manage')
  @ApiOperation({ summary: 'Update timetable period' })
  async updatePeriod(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdatePeriodDto,
  ) {
    return this.timetableService.updatePeriod(id, dto, user.id);
  }

  @Delete('periods/:id')
  @RequirePermissions('timetable:manage')
  @ApiOperation({ summary: 'Delete timetable period' })
  async deletePeriod(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timetableService.deletePeriod(id, user.id);
  }

  // ---------------------------------------------------------------------------
  // Rooms Management
  // ---------------------------------------------------------------------------

  @Get('rooms')
  @RequirePermissions('timetable:read')
  @ApiOperation({ summary: 'List campus rooms' })
  @ApiQuery({ name: 'campusId', required: false })
  async getRooms(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.timetableService.getRooms(user.organizationId, campusId || user.campusId || undefined);
  }

  @Post('rooms')
  @RequirePermissions('room-scheduling:manage')
  @ApiOperation({ summary: 'Create classroom or laboratory' })
  async createRoom(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateRoomDto,
  ) {
    return this.timetableService.createRoom(user.organizationId, dto, user.id);
  }

  @Patch('rooms/:id')
  @RequirePermissions('room-scheduling:manage')
  @ApiOperation({ summary: 'Update room details or capacity' })
  async updateRoom(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.timetableService.updateRoom(id, dto, user.id);
  }

  @Delete('rooms/:id')
  @RequirePermissions('room-scheduling:manage')
  @ApiOperation({ summary: 'Delete room' })
  async deleteRoom(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timetableService.deleteRoom(id, user.id);
  }

  // ---------------------------------------------------------------------------
  // Teacher & Room Availability
  // ---------------------------------------------------------------------------

  @Get('availability/teacher/:id')
  @RequirePermissions('teacher-availability:view')
  @ApiOperation({ summary: 'Get teacher availability rules' })
  async getTeacherAvailability(@Param('id') teacherId: string) {
    return this.timetableService.getTeacherAvailability(teacherId);
  }

  @Post('availability/teacher')
  @RequirePermissions('teacher-availability:manage')
  @ApiOperation({ summary: 'Set teacher availability constraint' })
  async setTeacherAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SetTeacherAvailabilityDto,
  ) {
    return this.timetableService.setTeacherAvailability(dto, user.id);
  }

  @Get('availability/room/:id')
  @RequirePermissions('room-scheduling:view')
  @ApiOperation({ summary: 'Get room availability rules' })
  async getRoomAvailability(@Param('id') roomId: string) {
    return this.timetableService.getRoomAvailability(roomId);
  }

  @Post('availability/room')
  @RequirePermissions('room-scheduling:manage')
  @ApiOperation({ summary: 'Set room availability constraint' })
  async setRoomAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SetRoomAvailabilityDto,
  ) {
    return this.timetableService.setRoomAvailability(dto, user.id);
  }

  // ---------------------------------------------------------------------------
  // Timetable Versions & Publishing
  // ---------------------------------------------------------------------------

  @Get('versions')
  @RequirePermissions('timetable:read')
  @ApiOperation({ summary: 'List timetable versions' })
  @ApiQuery({ name: 'campusId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getVersions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.timetableService.getVersions(
      user.organizationId,
      campusId || user.campusId || undefined,
      academicYearId,
    );
  }

  @Post('versions/draft')
  @RequirePermissions('timetable:create')
  @ApiOperation({ summary: 'Create new timetable draft version' })
  async createDraftVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTimetableVersionDto,
  ) {
    return this.timetableService.createDraftVersion(user.organizationId, dto, user.id);
  }

  @Post('versions/:id/publish')
  @RequirePermissions('timetable:publish')
  @ApiOperation({ summary: 'Publish timetable draft version' })
  async publishVersion(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PublishTimetableDto,
  ) {
    return this.timetableService.publishVersion(id, dto, user.id);
  }

  @Post('versions/:id/archive')
  @RequirePermissions('timetable:archive')
  @ApiOperation({ summary: 'Archive timetable version' })
  async archiveVersion(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timetableService.archiveVersion(id, user.id);
  }

  @Post('versions/:id/validate')
  @RequirePermissions('timetable:validate')
  @ApiOperation({ summary: 'Validate timetable version for conflicts' })
  async validateVersion(@Param('id') id: string) {
    return this.timetableService.validateVersion(id);
  }

  // ---------------------------------------------------------------------------
  // Timetable Entries CRUD & Copy
  // ---------------------------------------------------------------------------

  @Get('entries')
  @RequirePermissions('timetable:read')
  @ApiOperation({ summary: 'Get timetable schedule entries' })
  @ApiQuery({ name: 'timetableVersionId', required: true })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  @ApiQuery({ name: 'dayOfWeek', required: false })
  async getEntries(
    @Query('timetableVersionId') timetableVersionId: string,
    @Query('sectionId') sectionId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('roomId') roomId?: string,
    @Query('dayOfWeek') dayOfWeek?: DayOfWeek,
  ) {
    return this.timetableService.getEntries({
      timetableVersionId,
      sectionId,
      teacherId,
      roomId,
      dayOfWeek,
    });
  }

  @Post('entries')
  @RequirePermissions('timetable:update')
  @ApiOperation({ summary: 'Create timetable schedule entry' })
  async createEntry(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTimetableEntryDto,
  ) {
    return this.timetableService.createEntry(dto, user.id);
  }

  @Patch('entries/:id')
  @RequirePermissions('timetable:update')
  @ApiOperation({ summary: 'Update timetable schedule entry' })
  async updateEntry(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: Partial<CreateTimetableEntryDto>,
  ) {
    return this.timetableService.updateEntry(id, dto, user.id);
  }

  @Delete('entries/:id')
  @RequirePermissions('timetable:delete')
  @ApiOperation({ summary: 'Delete timetable schedule entry' })
  async deleteEntry(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.timetableService.deleteEntry(id, user.id);
  }

  @Post('entries/copy-day')
  @RequirePermissions('timetable:update')
  @ApiOperation({ summary: 'Copy day schedule to another day' })
  async copyDay(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CopyDayScheduleDto,
  ) {
    return this.timetableService.copyDay(dto, user.id);
  }

  @Post('entries/copy-section')
  @RequirePermissions('timetable:update')
  @ApiOperation({ summary: 'Copy weekly section timetable to another section' })
  async copySection(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CopySectionScheduleDto,
  ) {
    return this.timetableService.copySection(dto, user.id);
  }

  // ---------------------------------------------------------------------------
  // Automated Scheduling Engine
  // ---------------------------------------------------------------------------

  @Post('generate')
  @RequirePermissions('timetable:generate')
  @ApiOperation({ summary: 'Run automated constraint-aware scheduling solver' })
  async generateTimetable(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RunAutomatedSchedulerDto,
  ) {
    return this.timetableService.runAutomatedScheduler(user.organizationId, dto, user.id);
  }
}
