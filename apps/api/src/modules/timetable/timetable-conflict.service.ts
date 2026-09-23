import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  DayOfWeek,
  TimetableConflict,
  TimetableConflictReport,
} from '@school/shared-types';

@Injectable()
export class TimetableConflictService {
  private readonly logger = new Logger(TimetableConflictService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check for conflicts on a single slot candidate before saving/moving
   */
  async detectSlotConflict(input: {
    timetableVersionId: string;
    dayOfWeek: DayOfWeek;
    periodId: string;
    sectionId: string;
    subjectId: string;
    teacherId?: string;
    roomId?: string;
    excludeEntryId?: string;
    allowCapacityOverride?: boolean;
  }): Promise<TimetableConflict[]> {
    const conflicts: TimetableConflict[] = [];

    // 1. Section Conflict: Section cannot have two classes at the same day + period
    const existingSectionEntry = await this.prisma.timetableEntry.findFirst({
      where: {
        timetableVersionId: input.timetableVersionId,
        dayOfWeek: input.dayOfWeek,
        periodId: input.periodId,
        sectionId: input.sectionId,
        ...(input.excludeEntryId ? { id: { not: input.excludeEntryId } } : {}),
      },
      include: {
        subject: true,
        period: true,
        section: true,
      },
    });

    if (existingSectionEntry) {
      conflicts.push({
        type: 'SECTION',
        severity: 'ERROR',
        message: `Section Conflict: Section ${existingSectionEntry.section.name} already has ${existingSectionEntry.subject.name} scheduled at this period.`,
        dayOfWeek: input.dayOfWeek,
        periodId: input.periodId,
        periodName: existingSectionEntry.period.name,
        sectionId: input.sectionId,
        sectionName: existingSectionEntry.section.name,
      });
    }

    // 2. Teacher Conflict: Teacher cannot teach two sections at the same day + period
    if (input.teacherId) {
      const existingTeacherEntry = await this.prisma.timetableEntry.findFirst({
        where: {
          timetableVersionId: input.timetableVersionId,
          dayOfWeek: input.dayOfWeek,
          periodId: input.periodId,
          teacherId: input.teacherId,
          ...(input.excludeEntryId ? { id: { not: input.excludeEntryId } } : {}),
        },
        include: {
          section: true,
          subject: true,
          teacher: { include: { user: true } },
          period: true,
        },
      });

      if (existingTeacherEntry) {
        const teacherName = existingTeacherEntry.teacher?.user
          ? `${existingTeacherEntry.teacher.user.firstName} ${existingTeacherEntry.teacher.user.lastName}`
          : 'Assigned Teacher';

        conflicts.push({
          type: 'TEACHER',
          severity: 'ERROR',
          message: `Teacher Conflict: ${teacherName} is already scheduled for Section ${existingTeacherEntry.section.name} (${existingTeacherEntry.subject.name}) at this time.`,
          dayOfWeek: input.dayOfWeek,
          periodId: input.periodId,
          periodName: existingTeacherEntry.period.name,
          teacherId: input.teacherId,
          teacherName,
          sectionId: existingTeacherEntry.sectionId,
          sectionName: existingTeacherEntry.section.name,
        });
      }

      // 2b. Teacher Availability Check
      const teacherUnavailability = await this.prisma.teacherAvailability.findFirst({
        where: {
          teacherId: input.teacherId,
          dayOfWeek: input.dayOfWeek,
          isAvailable: false,
          OR: [{ periodId: null }, { periodId: input.periodId }],
        },
      });

      if (teacherUnavailability) {
        conflicts.push({
          type: 'AVAILABILITY',
          severity: 'ERROR',
          message: `Teacher Availability: Teacher is marked unavailable on ${input.dayOfWeek}${teacherUnavailability.reason ? ` (${teacherUnavailability.reason})` : ''}.`,
          dayOfWeek: input.dayOfWeek,
          periodId: input.periodId,
          teacherId: input.teacherId,
        });
      }
    }

    // 3. Room Conflict: Room cannot be occupied by two classes at the same day + period
    if (input.roomId) {
      const existingRoomEntry = await this.prisma.timetableEntry.findFirst({
        where: {
          timetableVersionId: input.timetableVersionId,
          dayOfWeek: input.dayOfWeek,
          periodId: input.periodId,
          roomId: input.roomId,
          ...(input.excludeEntryId ? { id: { not: input.excludeEntryId } } : {}),
        },
        include: {
          section: true,
          room: true,
          period: true,
        },
      });

      if (existingRoomEntry) {
        conflicts.push({
          type: 'ROOM',
          severity: 'ERROR',
          message: `Room Conflict: Room ${existingRoomEntry.room?.name || 'Selected Room'} is already assigned to Section ${existingRoomEntry.section.name} at this time.`,
          dayOfWeek: input.dayOfWeek,
          periodId: input.periodId,
          periodName: existingRoomEntry.period.name,
          roomId: input.roomId,
          roomName: existingRoomEntry.room?.name,
          sectionId: existingRoomEntry.sectionId,
          sectionName: existingRoomEntry.section.name,
        });
      }

      // 3b. Room Availability Check
      const roomUnavailability = await this.prisma.roomAvailability.findFirst({
        where: {
          roomId: input.roomId,
          dayOfWeek: input.dayOfWeek,
          isAvailable: false,
          OR: [{ periodId: null }, { periodId: input.periodId }],
        },
      });

      if (roomUnavailability) {
        conflicts.push({
          type: 'AVAILABILITY',
          severity: 'ERROR',
          message: `Room Availability: Room is marked unavailable on ${input.dayOfWeek}${roomUnavailability.reason ? ` (${roomUnavailability.reason})` : ''}.`,
          dayOfWeek: input.dayOfWeek,
          periodId: input.periodId,
          roomId: input.roomId,
        });
      }

      // 4. Room Capacity Validation
      const room = await this.prisma.room.findUnique({ where: { id: input.roomId } });
      const section = await this.prisma.section.findUnique({
        where: { id: input.sectionId },
        include: { _count: { select: { enrollments: true } } },
      });

      if (room && section) {
        const enrolledCount = section._count.enrollments || section.capacity;
        if (enrolledCount > room.capacity && !input.allowCapacityOverride) {
          conflicts.push({
            type: 'CAPACITY',
            severity: 'WARNING',
            message: `Room Capacity Warning: Section ${section.name} enrollment (${enrolledCount} students) exceeds Room ${room.name} capacity (${room.capacity} seats).`,
            dayOfWeek: input.dayOfWeek,
            periodId: input.periodId,
            roomId: input.roomId,
            roomName: room.name,
            sectionId: input.sectionId,
            sectionName: section.name,
          });
        }
      }
    }

    // 5. Subject-Teacher Authorization Check
    if (input.teacherId) {
      const authorizedOffering = await this.prisma.subjectOffering.findFirst({
        where: {
          sectionId: input.sectionId,
          subjectId: input.subjectId,
          primaryTeacherId: input.teacherId,
        },
      });

      const authorizedSubjectTeacher = await this.prisma.subjectTeacher.findFirst({
        where: {
          sectionId: input.sectionId,
          subjectId: input.subjectId,
          teacherId: input.teacherId,
        },
      });

      if (!authorizedOffering && !authorizedSubjectTeacher) {
        conflicts.push({
          type: 'AUTHORIZATION',
          severity: 'WARNING',
          message: `Subject-Teacher Authorization: Selected teacher is not officially registered as the primary teacher for this subject in this section.`,
          dayOfWeek: input.dayOfWeek,
          periodId: input.periodId,
          teacherId: input.teacherId,
          sectionId: input.sectionId,
        });
      }
    }

    return conflicts;
  }

  /**
   * Validate entire timetable version for publishing readiness
   */
  async validateTimetableVersion(timetableVersionId: string): Promise<TimetableConflictReport> {
    const entries = await this.prisma.timetableEntry.findMany({
      where: { timetableVersionId },
      include: {
        section: true,
        subject: true,
        teacher: { include: { user: true } },
        room: true,
        period: true,
      },
    });

    const conflicts: TimetableConflict[] = [];

    // Track slots by keys to detect collisions
    const sectionSlots = new Map<string, string>(); // `${day}_${period}_${sectionId}` -> entryId
    const teacherSlots = new Map<string, { entryId: string; sectionName: string; teacherName: string }>(); // `${day}_${period}_${teacherId}`
    const roomSlots = new Map<string, { entryId: string; sectionName: string; roomName: string }>(); // `${day}_${period}_${roomId}`

    for (const entry of entries) {
      const slotKey = `${entry.dayOfWeek}_${entry.periodId}`;

      // Section collision
      const secKey = `${slotKey}_${entry.sectionId}`;
      if (sectionSlots.has(secKey)) {
        conflicts.push({
          type: 'SECTION',
          severity: 'ERROR',
          message: `Section Collision: Section ${entry.section.name} is double-booked at ${entry.period.name} on ${entry.dayOfWeek}.`,
          dayOfWeek: entry.dayOfWeek,
          periodId: entry.periodId,
          periodName: entry.period.name,
          sectionId: entry.sectionId,
          sectionName: entry.section.name,
        });
      } else {
        sectionSlots.set(secKey, entry.id);
      }

      // Teacher collision
      if (entry.teacherId) {
        const teachKey = `${slotKey}_${entry.teacherId}`;
        const existing = teacherSlots.get(teachKey);
        const tName = entry.teacher?.user
          ? `${entry.teacher.user.firstName} ${entry.teacher.user.lastName}`
          : 'Teacher';

        if (existing) {
          conflicts.push({
            type: 'TEACHER',
            severity: 'ERROR',
            message: `Teacher Collision: ${tName} is scheduled for both ${existing.sectionName} and ${entry.section.name} at ${entry.period.name} on ${entry.dayOfWeek}.`,
            dayOfWeek: entry.dayOfWeek,
            periodId: entry.periodId,
            periodName: entry.period.name,
            teacherId: entry.teacherId,
            teacherName: tName,
            sectionId: entry.sectionId,
            sectionName: entry.section.name,
          });
        } else {
          teacherSlots.set(teachKey, {
            entryId: entry.id,
            sectionName: entry.section.name,
            teacherName: tName,
          });
        }
      }

      // Room collision
      if (entry.roomId) {
        const rKey = `${slotKey}_${entry.roomId}`;
        const existingRoom = roomSlots.get(rKey);
        const rName = entry.room?.name || 'Room';

        if (existingRoom) {
          conflicts.push({
            type: 'ROOM',
            severity: 'ERROR',
            message: `Room Collision: Room ${rName} is booked for both ${existingRoom.sectionName} and ${entry.section.name} at ${entry.period.name} on ${entry.dayOfWeek}.`,
            dayOfWeek: entry.dayOfWeek,
            periodId: entry.periodId,
            periodName: entry.period.name,
            roomId: entry.roomId,
            roomName: rName,
            sectionId: entry.sectionId,
            sectionName: entry.section.name,
          });
        } else {
          roomSlots.set(rKey, {
            entryId: entry.id,
            sectionName: entry.section.name,
            roomName: rName,
          });
        }
      }
    }

    const errorCount = conflicts.filter((c) => c.severity === 'ERROR').length;
    const warningCount = conflicts.filter((c) => c.severity === 'WARNING').length;

    return {
      isValid: errorCount === 0,
      errorCount,
      warningCount,
      conflicts,
    };
  }
}
