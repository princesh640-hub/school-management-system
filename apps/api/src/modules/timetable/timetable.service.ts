import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TimetableConflictService } from './timetable-conflict.service';
import { TimetableSolverService } from './timetable-solver.service';
import {
  DayOfWeek,
  PeriodType,
  RoomType,
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
} from '@school/shared-types';

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly conflictService: TimetableConflictService,
    private readonly solverService: TimetableSolverService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Working Days Configuration
  // ---------------------------------------------------------------------------

  async getWorkingDays(organizationId: string, campusId?: string) {
    const days = await this.prisma.workingDayConfig.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
      },
      orderBy: { dayOfWeek: 'asc' },
    });

    if (days.length === 0) {
      // Return default 5-day standard configuration
      const defaults: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      return defaults.map((day) => ({
        dayOfWeek: day,
        isWorking: true,
        startTime: '08:00',
        endTime: '15:00',
      }));
    }

    return days;
  }

  async updateWorkingDays(
    organizationId: string,
    campusId: string | undefined,
    configs: Array<{ dayOfWeek: DayOfWeek; isWorking: boolean; startTime?: string; endTime?: string }>,
    userId?: string,
  ) {
    const results = [];
    for (const c of configs) {
      const rec = await this.prisma.workingDayConfig.upsert({
        where: {
          organizationId_campusId_dayOfWeek: {
            organizationId,
            campusId: campusId || null,
            dayOfWeek: c.dayOfWeek,
          },
        },
        update: {
          isWorking: c.isWorking,
          startTime: c.startTime || null,
          endTime: c.endTime || null,
        },
        create: {
          organizationId,
          campusId: campusId || null,
          dayOfWeek: c.dayOfWeek,
          isWorking: c.isWorking,
          startTime: c.startTime || null,
          endTime: c.endTime || null,
        },
      });
      results.push(rec);
    }

    await this.auditService.log({
      organizationId,
      campusId,
      userId: userId || 'system',
      action: 'UPDATE_WORKING_DAYS',
      module: 'timetable',
      resourceId: campusId || organizationId,
      newValues: configs,
    });

    return results;
  }

  // ---------------------------------------------------------------------------
  // 2. Timetable Periods / Time Slots
  // ---------------------------------------------------------------------------

  async getPeriods(organizationId: string, campusId?: string) {
    return this.prisma.timetablePeriod.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
      },
      orderBy: { sequence: 'asc' },
    });
  }

  async createPeriod(organizationId: string, dto: CreatePeriodDto, userId?: string) {
    // Validate sequence uniqueness
    const existing = await this.prisma.timetablePeriod.findFirst({
      where: {
        organizationId,
        campusId: dto.campusId || null,
        sequence: dto.sequence,
      },
    });

    if (existing) {
      throw new ConflictException(`Period sequence ${dto.sequence} already exists for this campus`);
    }

    const period = await this.prisma.timetablePeriod.create({
      data: {
        organizationId,
        campusId: dto.campusId || null,
        name: dto.name,
        sequence: dto.sequence,
        startTime: dto.startTime,
        endTime: dto.endTime,
        durationMinutes: dto.durationMinutes,
        periodType: dto.periodType || 'TEACHING',
      },
    });

    await this.auditService.log({
      organizationId,
      campusId: dto.campusId,
      userId: userId || 'system',
      action: 'CREATE_TIMETABLE_PERIOD',
      module: 'timetable',
      resourceId: period.id,
      newValues: dto,
    });

    return period;
  }

  async updatePeriod(id: string, dto: UpdatePeriodDto, userId?: string) {
    const period = await this.prisma.timetablePeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException(`Period ${id} not found`);

    const updated = await this.prisma.timetablePeriod.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.sequence ? { sequence: dto.sequence } : {}),
        ...(dto.startTime ? { startTime: dto.startTime } : {}),
        ...(dto.endTime ? { endTime: dto.endTime } : {}),
        ...(dto.durationMinutes ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.periodType ? { periodType: dto.periodType } : {}),
        ...(dto.status ? { status: dto.status as any } : {}),
      },
    });

    await this.auditService.log({
      organizationId: period.organizationId,
      campusId: period.campusId || undefined,
      userId: userId || 'system',
      action: 'UPDATE_TIMETABLE_PERIOD',
      module: 'timetable',
      resourceId: id,
      newValues: dto,
    });

    return updated;
  }

  async deletePeriod(id: string, userId?: string) {
    const period = await this.prisma.timetablePeriod.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });
    if (!period) throw new NotFoundException(`Period ${id} not found`);

    if (period._count.entries > 0) {
      throw new BadRequestException('Cannot delete period that contains active timetable entries. Clear entries first.');
    }

    await this.prisma.timetablePeriod.delete({ where: { id } });

    await this.auditService.log({
      organizationId: period.organizationId,
      campusId: period.campusId || undefined,
      userId: userId || 'system',
      action: 'DELETE_TIMETABLE_PERIOD',
      module: 'timetable',
      resourceId: id,
      newValues: { name: period.name },
    });

    return { message: `Period ${period.name} deleted successfully` };
  }

  // ---------------------------------------------------------------------------
  // 3. Room Management
  // ---------------------------------------------------------------------------

  async getRooms(organizationId: string, campusId?: string) {
    return this.prisma.room.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
      },
      include: {
        availabilities: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async createRoom(organizationId: string, dto: CreateRoomDto, userId?: string) {
    const existing = await this.prisma.room.findFirst({
      where: {
        organizationId,
        campusId: dto.campusId || null,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException(`Room code ${dto.code} already exists for this campus`);
    }

    const room = await this.prisma.room.create({
      data: {
        organizationId,
        campusId: dto.campusId || null,
        name: dto.name,
        code: dto.code,
        building: dto.building || null,
        floor: dto.floor || null,
        capacity: dto.capacity || 40,
        roomType: dto.roomType || 'CLASSROOM',
        facilities: dto.facilities || [],
      },
    });

    await this.auditService.log({
      organizationId,
      campusId: dto.campusId,
      userId: userId || 'system',
      action: 'CREATE_ROOM',
      module: 'timetable',
      resourceId: room.id,
      newValues: dto,
    });

    return room;
  }

  async updateRoom(id: string, dto: UpdateRoomDto, userId?: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException(`Room ${id} not found`);

    const updated = await this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.code ? { code: dto.code } : {}),
        ...(dto.building !== undefined ? { building: dto.building } : {}),
        ...(dto.floor !== undefined ? { floor: dto.floor } : {}),
        ...(dto.capacity ? { capacity: dto.capacity } : {}),
        ...(dto.roomType ? { roomType: dto.roomType } : {}),
        ...(dto.facilities ? { facilities: dto.facilities } : {}),
        ...(dto.status ? { status: dto.status as any } : {}),
      },
    });

    await this.auditService.log({
      organizationId: room.organizationId,
      campusId: room.campusId || undefined,
      userId: userId || 'system',
      action: 'UPDATE_ROOM',
      module: 'timetable',
      resourceId: id,
      newValues: dto,
    });

    return updated;
  }

  async deleteRoom(id: string, userId?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });
    if (!room) throw new NotFoundException(`Room ${id} not found`);

    if (room._count.entries > 0) {
      throw new BadRequestException('Cannot delete room that has scheduled timetable slots');
    }

    await this.prisma.room.delete({ where: { id } });

    await this.auditService.log({
      organizationId: room.organizationId,
      campusId: room.campusId || undefined,
      userId: userId || 'system',
      action: 'DELETE_ROOM',
      module: 'timetable',
      resourceId: id,
      newValues: { code: room.code },
    });

    return { message: `Room ${room.code} deleted successfully` };
  }

  // ---------------------------------------------------------------------------
  // 4. Availability Management
  // ---------------------------------------------------------------------------

  async getTeacherAvailability(teacherId: string) {
    return this.prisma.teacherAvailability.findMany({
      where: { teacherId },
      include: { period: true },
    });
  }

  async setTeacherAvailability(dto: SetTeacherAvailabilityDto, userId?: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: dto.teacherId },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException(`Teacher ${dto.teacherId} not found`);

    const availability = await this.prisma.teacherAvailability.create({
      data: {
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        periodId: dto.periodId || null,
        isAvailable: dto.isAvailable,
        reason: dto.reason || null,
      },
    });

    await this.auditService.log({
      organizationId: teacher.user.organizationId,
      campusId: teacher.user.campusId || undefined,
      userId: userId || 'system',
      action: 'SET_TEACHER_AVAILABILITY',
      module: 'timetable',
      resourceId: availability.id,
      newValues: dto,
    });

    return availability;
  }

  async getRoomAvailability(roomId: string) {
    return this.prisma.roomAvailability.findMany({
      where: { roomId },
      include: { period: true },
    });
  }

  async setRoomAvailability(dto: SetRoomAvailabilityDto, userId?: string) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException(`Room ${dto.roomId} not found`);

    const availability = await this.prisma.roomAvailability.create({
      data: {
        roomId: dto.roomId,
        dayOfWeek: dto.dayOfWeek,
        periodId: dto.periodId || null,
        isAvailable: dto.isAvailable,
        reason: dto.reason || null,
      },
    });

    await this.auditService.log({
      organizationId: room.organizationId,
      campusId: room.campusId || undefined,
      userId: userId || 'system',
      action: 'SET_ROOM_AVAILABILITY',
      module: 'timetable',
      resourceId: availability.id,
      newValues: dto,
    });

    return availability;
  }

  // ---------------------------------------------------------------------------
  // 5. Timetable Versions & Publishing Lifecycle
  // ---------------------------------------------------------------------------

  async getVersions(organizationId: string, campusId?: string, academicYearId?: string) {
    return this.prisma.timetableVersion.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async createDraftVersion(organizationId: string, dto: CreateTimetableVersionDto, userId?: string) {
    // Find latest version number
    const latest = await this.prisma.timetableVersion.findFirst({
      where: {
        organizationId,
        campusId: dto.campusId || null,
        academicYearId: dto.academicYearId,
      },
      orderBy: { versionNumber: 'desc' },
    });

    const nextNumber = latest ? latest.versionNumber + 1 : 1;

    const version = await this.prisma.timetableVersion.create({
      data: {
        organizationId,
        campusId: dto.campusId || null,
        academicYearId: dto.academicYearId,
        termId: dto.termId || null,
        versionNumber: nextNumber,
        name: dto.name || `Timetable Version ${nextNumber} (Draft)`,
        status: 'DRAFT',
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdBy: userId || 'system',
      },
    });

    await this.auditService.log({
      organizationId,
      campusId: dto.campusId,
      userId: userId || 'system',
      action: 'CREATE_TIMETABLE_VERSION',
      module: 'timetable',
      resourceId: version.id,
      newValues: { versionNumber: nextNumber, name: version.name },
    });

    return version;
  }

  async publishVersion(id: string, dto: PublishTimetableDto, userId?: string) {
    const version = await this.prisma.timetableVersion.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });

    if (!version) throw new NotFoundException(`Timetable version ${id} not found`);

    if (version._count.entries === 0) {
      throw new BadRequestException('Cannot publish an empty timetable with 0 schedule entries');
    }

    // Run hard conflict validation before publishing
    const validation = await this.conflictService.validateTimetableVersion(id);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Cannot publish timetable with ${validation.errorCount} unresolved hard conflicts. Resolve errors first.`,
      );
    }

    // In transaction: Archive previously published version and publish current
    const updated = await this.prisma.$transaction(async (tx) => {
      // Archive current active
      await tx.timetableVersion.updateMany({
        where: {
          academicYearId: version.academicYearId,
          campusId: version.campusId,
          status: 'PUBLISHED',
          id: { not: id },
        },
        data: {
          status: 'ARCHIVED',
        },
      });

      return tx.timetableVersion.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishedBy: userId || 'system',
          ...(dto.effectiveFrom ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
          ...(dto.effectiveTo ? { effectiveTo: new Date(dto.effectiveTo) } : {}),
        },
      });
    });

    await this.auditService.log({
      organizationId: version.organizationId,
      campusId: version.campusId || undefined,
      userId: userId || 'system',
      action: 'PUBLISH_TIMETABLE',
      module: 'timetable',
      resourceId: id,
      newValues: { versionNumber: version.versionNumber, publishedAt: updated.publishedAt },
    });

    if (dto.notifyStakeholders) {
      await this.notificationsService.broadcast(version.organizationId, {
        title: 'New Timetable Published',
        message: `Academic timetable ${version.name} has been published and is now in effect.`,
        type: 'ACADEMIC',
      });
    }

    return updated;
  }

  async archiveVersion(id: string, userId?: string) {
    const version = await this.prisma.timetableVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException(`Timetable version ${id} not found`);

    const updated = await this.prisma.timetableVersion.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.log({
      organizationId: version.organizationId,
      campusId: version.campusId || undefined,
      userId: userId || 'system',
      action: 'ARCHIVE_TIMETABLE_VERSION',
      module: 'timetable',
      resourceId: id,
      newValues: { status: 'ARCHIVED' },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 6. Timetable Entries CRUD & Conflicts
  // ---------------------------------------------------------------------------

  async getEntries(query: {
    timetableVersionId: string;
    sectionId?: string;
    teacherId?: string;
    roomId?: string;
    dayOfWeek?: DayOfWeek;
  }) {
    return this.prisma.timetableEntry.findMany({
      where: {
        timetableVersionId: query.timetableVersionId,
        ...(query.sectionId ? { sectionId: query.sectionId } : {}),
        ...(query.teacherId ? { teacherId: query.teacherId } : {}),
        ...(query.roomId ? { roomId: query.roomId } : {}),
        ...(query.dayOfWeek ? { dayOfWeek: query.dayOfWeek } : {}),
      },
      include: {
        period: true,
        section: { include: { class: true } },
        subject: true,
        teacher: { include: { user: true } },
        room: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { sequence: 'asc' } }],
    });
  }

  async createEntry(dto: CreateTimetableEntryDto, userId?: string) {
    // Check version status
    const version = await this.prisma.timetableVersion.findUnique({
      where: { id: dto.timetableVersionId },
    });
    if (!version) throw new NotFoundException(`Version ${dto.timetableVersionId} not found`);

    if (version.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot modify an archived timetable version');
    }

    // Run conflict detection
    const conflicts = await this.conflictService.detectSlotConflict({
      timetableVersionId: dto.timetableVersionId,
      dayOfWeek: dto.dayOfWeek,
      periodId: dto.periodId,
      sectionId: dto.sectionId,
      subjectId: dto.subjectId,
      teacherId: dto.teacherId,
      roomId: dto.roomId,
      allowCapacityOverride: dto.allowOverride,
    });

    const hardConflict = conflicts.find((c) => c.severity === 'ERROR');
    if (hardConflict && !dto.allowOverride) {
      throw new ConflictException(hardConflict.message);
    }

    const entry = await this.prisma.timetableEntry.create({
      data: {
        timetableVersionId: dto.timetableVersionId,
        dayOfWeek: dto.dayOfWeek,
        periodId: dto.periodId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        subjectOfferingId: dto.subjectOfferingId || null,
        teacherId: dto.teacherId || null,
        roomId: dto.roomId || null,
        customNotes: dto.customNotes || null,
      },
      include: {
        period: true,
        section: true,
        subject: true,
        teacher: { include: { user: true } },
        room: true,
      },
    });

    await this.auditService.log({
      organizationId: version.organizationId,
      campusId: version.campusId || undefined,
      userId: userId || 'system',
      action: 'CREATE_TIMETABLE_ENTRY',
      module: 'timetable',
      resourceId: entry.id,
      newValues: dto,
    });

    return { entry, warnings: conflicts.filter((c) => c.severity === 'WARNING') };
  }

  async updateEntry(id: string, dto: Partial<CreateTimetableEntryDto>, userId?: string) {
    const existing = await this.prisma.timetableEntry.findUnique({
      where: { id },
      include: { timetableVersion: true },
    });
    if (!existing) throw new NotFoundException(`Timetable entry ${id} not found`);

    if (existing.timetableVersion.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot modify entries in an archived timetable');
    }

    const dayOfWeek = dto.dayOfWeek || existing.dayOfWeek;
    const periodId = dto.periodId || existing.periodId;
    const sectionId = dto.sectionId || existing.sectionId;
    const subjectId = dto.subjectId || existing.subjectId;
    const teacherId = dto.teacherId !== undefined ? dto.teacherId : existing.teacherId || undefined;
    const roomId = dto.roomId !== undefined ? dto.roomId : existing.roomId || undefined;

    // Detect conflict excluding current entry
    const conflicts = await this.conflictService.detectSlotConflict({
      timetableVersionId: existing.timetableVersionId,
      dayOfWeek,
      periodId,
      sectionId,
      subjectId,
      teacherId,
      roomId,
      excludeEntryId: id,
      allowCapacityOverride: dto.allowOverride,
    });

    const hardConflict = conflicts.find((c) => c.severity === 'ERROR');
    if (hardConflict && !dto.allowOverride) {
      throw new ConflictException(hardConflict.message);
    }

    const updated = await this.prisma.timetableEntry.update({
      where: { id },
      data: {
        dayOfWeek,
        periodId,
        sectionId,
        subjectId,
        teacherId: teacherId || null,
        roomId: roomId || null,
        ...(dto.customNotes !== undefined ? { customNotes: dto.customNotes } : {}),
      },
      include: {
        period: true,
        section: true,
        subject: true,
        teacher: { include: { user: true } },
        room: true,
      },
    });

    await this.auditService.log({
      organizationId: existing.timetableVersion.organizationId,
      campusId: existing.timetableVersion.campusId || undefined,
      userId: userId || 'system',
      action: 'UPDATE_TIMETABLE_ENTRY',
      module: 'timetable',
      resourceId: id,
      newValues: dto,
    });

    return { entry: updated, warnings: conflicts.filter((c) => c.severity === 'WARNING') };
  }

  async deleteEntry(id: string, userId?: string) {
    const existing = await this.prisma.timetableEntry.findUnique({
      where: { id },
      include: { timetableVersion: true },
    });
    if (!existing) throw new NotFoundException(`Timetable entry ${id} not found`);

    if (existing.timetableVersion.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot delete entries in an archived timetable');
    }

    await this.prisma.timetableEntry.delete({ where: { id } });

    await this.auditService.log({
      organizationId: existing.timetableVersion.organizationId,
      campusId: existing.timetableVersion.campusId || undefined,
      userId: userId || 'system',
      action: 'DELETE_TIMETABLE_ENTRY',
      module: 'timetable',
      resourceId: id,
      newValues: { dayOfWeek: existing.dayOfWeek, periodId: existing.periodId },
    });

    return { message: 'Timetable entry deleted successfully' };
  }

  // ---------------------------------------------------------------------------
  // 7. Copy & Duplication Workflows
  // ---------------------------------------------------------------------------

  async copyDay(dto: CopyDayScheduleDto, userId?: string) {
    const version = await this.prisma.timetableVersion.findUnique({
      where: { id: dto.timetableVersionId },
    });
    if (!version) throw new NotFoundException(`Version ${dto.timetableVersionId} not found`);

    const sourceEntries = await this.prisma.timetableEntry.findMany({
      where: {
        timetableVersionId: dto.timetableVersionId,
        dayOfWeek: dto.sourceDay,
        ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
      },
    });

    if (sourceEntries.length === 0) {
      throw new BadRequestException(`No entries found to copy on ${dto.sourceDay}`);
    }

    // In transaction: remove target day unlocked entries and copy
    const copiedCount = await this.prisma.$transaction(async (tx) => {
      await tx.timetableEntry.deleteMany({
        where: {
          timetableVersionId: dto.timetableVersionId,
          dayOfWeek: dto.targetDay,
          isLocked: false,
          ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
        },
      });

      const newEntries = sourceEntries.map((e) => ({
        timetableVersionId: dto.timetableVersionId,
        dayOfWeek: dto.targetDay,
        periodId: e.periodId,
        sectionId: e.sectionId,
        subjectOfferingId: e.subjectOfferingId,
        subjectId: e.subjectId,
        teacherId: e.teacherId,
        roomId: e.roomId,
        customNotes: e.customNotes,
      }));

      await tx.timetableEntry.createMany({ data: newEntries });
      return newEntries.length;
    });

    await this.auditService.log({
      organizationId: version.organizationId,
      campusId: version.campusId || undefined,
      userId: userId || 'system',
      action: 'COPY_DAY_TIMETABLE',
      module: 'timetable',
      resourceId: dto.timetableVersionId,
      newValues: dto,
    });

    return { message: `Copied ${copiedCount} entries from ${dto.sourceDay} to ${dto.targetDay}` };
  }

  async copySection(dto: CopySectionScheduleDto, userId?: string) {
    const version = await this.prisma.timetableVersion.findUnique({
      where: { id: dto.timetableVersionId },
    });
    if (!version) throw new NotFoundException(`Version ${dto.timetableVersionId} not found`);

    const sourceEntries = await this.prisma.timetableEntry.findMany({
      where: {
        timetableVersionId: dto.timetableVersionId,
        sectionId: dto.sourceSectionId,
      },
    });

    if (sourceEntries.length === 0) {
      throw new BadRequestException('No schedule entries found in source section to copy');
    }

    const copiedCount = await this.prisma.$transaction(async (tx) => {
      await tx.timetableEntry.deleteMany({
        where: {
          timetableVersionId: dto.timetableVersionId,
          sectionId: dto.targetSectionId,
          isLocked: false,
        },
      });

      const newEntries = sourceEntries.map((e) => ({
        timetableVersionId: dto.timetableVersionId,
        dayOfWeek: e.dayOfWeek,
        periodId: e.periodId,
        sectionId: dto.targetSectionId,
        subjectOfferingId: e.subjectOfferingId,
        subjectId: e.subjectId,
        teacherId: e.teacherId,
        roomId: e.roomId,
        customNotes: e.customNotes,
      }));

      await tx.timetableEntry.createMany({ data: newEntries });
      return newEntries.length;
    });

    await this.auditService.log({
      organizationId: version.organizationId,
      campusId: version.campusId || undefined,
      userId: userId || 'system',
      action: 'COPY_SECTION_TIMETABLE',
      module: 'timetable',
      resourceId: dto.timetableVersionId,
      newValues: dto,
    });

    return { message: `Copied ${copiedCount} schedule slots to target section` };
  }

  // ---------------------------------------------------------------------------
  // 8. Automated Solver & Validation Delegation
  // ---------------------------------------------------------------------------

  async validateVersion(versionId: string) {
    return this.conflictService.validateTimetableVersion(versionId);
  }

  async runAutomatedScheduler(
    organizationId: string,
    dto: RunAutomatedSchedulerDto,
    userId?: string,
  ) {
    return this.solverService.runScheduler(organizationId, dto, userId);
  }
}
