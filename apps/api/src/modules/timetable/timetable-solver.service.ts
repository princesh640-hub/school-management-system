import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TimetableConflictService } from './timetable-conflict.service';
import {
  DayOfWeek,
  RunAutomatedSchedulerDto,
  SchedulingDiagnostic,
} from '@school/shared-types';

@Injectable()
export class TimetableSolverService {
  private readonly logger = new Logger(TimetableSolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictService: TimetableConflictService,
  ) {}

  /**
   * Run deterministic constraint-satisfaction heuristic solver
   */
  async runScheduler(
    organizationId: string,
    dto: RunAutomatedSchedulerDto,
    userId?: string,
  ) {
    const startedAt = new Date();
    this.logger.log(`Starting automated scheduling run for version: ${dto.timetableVersionId}`);

    // 1. Fetch Version and Context
    const version = await this.prisma.timetableVersion.findUnique({
      where: { id: dto.timetableVersionId },
      include: { academicYear: true },
    });

    if (!version) {
      throw new Error(`Timetable version ${dto.timetableVersionId} not found`);
    }

    const campusId = dto.campusId || version.campusId || undefined;

    // 2. Fetch Working Days
    const workingDaysConfigs = await this.prisma.workingDayConfig.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        isWorking: true,
      },
    });

    const workingDays: DayOfWeek[] = workingDaysConfigs.length > 0
      ? workingDaysConfigs.map((w) => w.dayOfWeek)
      : ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    // 3. Fetch Teaching Periods
    const periods = await this.prisma.timetablePeriod.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        periodType: 'TEACHING',
        status: 'ACTIVE',
      },
      orderBy: { sequence: 'asc' },
    });

    if (periods.length === 0) {
      throw new Error('No active teaching periods found. Configure timetable periods before generating schedules.');
    }

    // 4. Fetch Available Rooms
    const rooms = await this.prisma.room.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        status: 'ACTIVE',
      },
      include: {
        availabilities: true,
      },
    });

    // 5. Fetch Target Sections & Subject Offerings
    const sections = await this.prisma.section.findMany({
      where: {
        class: { campusId: campusId || undefined },
        ...(dto.sectionIds && dto.sectionIds.length > 0 ? { id: { in: dto.sectionIds } } : {}),
        status: 'ACTIVE',
      },
      include: {
        class: true,
        subjectOfferings: {
          where: {
            academicYearId: version.academicYearId,
            ...(version.termId ? { termId: version.termId } : {}),
            status: 'ACTIVE',
          },
          include: {
            subject: {
              include: {
                schedulingConstraints: true,
              },
            },
            primaryTeacher: {
              include: {
                user: true,
                availabilities: true,
              },
            },
          },
        },
      },
    });

    // Compute total required slots
    let totalSlotsRequired = 0;
    sections.forEach((sec) => {
      sec.subjectOfferings.forEach((off) => {
        totalSlotsRequired += off.weeklyPeriods;
      });
    });

    // 6. Build In-Memory Grid Representation
    // Key: `${day}_${periodId}_${sectionId}` -> true
    const sectionOccupied = new Set<string>();
    // Key: `${day}_${periodId}_${teacherId}` -> true
    const teacherOccupied = new Set<string>();
    // Key: `${day}_${periodId}_${roomId}` -> true
    const roomOccupied = new Set<string>();

    // Load any pre-existing locked entries in this version
    const lockedEntries = await this.prisma.timetableEntry.findMany({
      where: { timetableVersionId: version.id, isLocked: true },
    });

    lockedEntries.forEach((le) => {
      sectionOccupied.add(`${le.dayOfWeek}_${le.periodId}_${le.sectionId}`);
      if (le.teacherId) teacherOccupied.add(`${le.dayOfWeek}_${le.periodId}_${le.teacherId}`);
      if (le.roomId) roomOccupied.add(`${le.dayOfWeek}_${le.periodId}_${le.roomId}`);
    });

    const entriesToCreate: Array<{
      timetableVersionId: string;
      dayOfWeek: DayOfWeek;
      periodId: string;
      sectionId: string;
      subjectOfferingId: string;
      subjectId: string;
      teacherId?: string | null;
      roomId?: string | null;
      customNotes?: string;
    }> = [];

    const diagnostics: SchedulingDiagnostic[] = [];
    let slotsScheduled = 0;

    // 7. Deterministic Placement with Heuristics
    // Process sections one by one
    for (const sec of sections) {
      // Sort offerings: higher weekly periods & lab subjects first (Most Constrained Variable heuristic)
      const sortedOfferings = [...sec.subjectOfferings].sort((a, b) => {
        const aIsLab = a.subject.category === 'LAB' ? 1 : 0;
        const bIsLab = b.subject.category === 'LAB' ? 1 : 0;
        if (aIsLab !== bIsLab) return bIsLab - aIsLab;
        return b.weeklyPeriods - a.weeklyPeriods;
      });

      for (const offering of sortedOfferings) {
        let periodsPlaced = 0;
        const required = offering.weeklyPeriods;
        const teacher = offering.primaryTeacher;
        const constraint = offering.subject.schedulingConstraints[0];

        // Track days already scheduled for this subject to balance weekly distribution (soft constraint)
        const scheduledDaysForSubject = new Set<DayOfWeek>();

        // Find candidate rooms
        const candidateRooms = rooms.filter((r) => {
          if (constraint?.preferredRoomType) {
            return r.roomType === constraint.preferredRoomType;
          }
          return r.roomType === 'CLASSROOM';
        });
        const fallbackRooms = rooms.length > 0 ? rooms : [];

        // Attempt allocation loop
        for (const day of workingDays) {
          if (periodsPlaced >= required) break;

          // Soft constraint: try to spread one period per day before doubling up
          if (scheduledDaysForSubject.has(day) && workingDays.length >= required) {
            continue;
          }

          for (const period of periods) {
            if (periodsPlaced >= required) break;

            const secKey = `${day}_${period.id}_${sec.id}`;
            if (sectionOccupied.has(secKey)) continue;

            // Teacher hard constraint
            if (teacher) {
              const teachKey = `${day}_${period.id}_${teacher.id}`;
              if (teacherOccupied.has(teachKey)) continue;

              // Teacher availability constraint
              const isTeacherUnavailable = teacher.availabilities.some(
                (a) => a.dayOfWeek === day && !a.isAvailable && (!a.periodId || a.periodId === period.id),
              );
              if (isTeacherUnavailable) continue;
            }

            // Room hard constraint
            let selectedRoomId: string | null = null;
            const roomsPool = candidateRooms.length > 0 ? candidateRooms : fallbackRooms;

            for (const r of roomsPool) {
              const rKey = `${day}_${period.id}_${r.id}`;
              if (!roomOccupied.has(rKey)) {
                // Room availability constraint
                const isRoomUnavailable = r.availabilities.some(
                  (a) => a.dayOfWeek === day && !a.isAvailable && (!a.periodId || a.periodId === period.id),
                );
                if (!isRoomUnavailable) {
                  selectedRoomId = r.id;
                  break;
                }
              }
            }

            // Commit slot placement
            sectionOccupied.add(secKey);
            if (teacher) teacherOccupied.add(`${day}_${period.id}_${teacher.id}`);
            if (selectedRoomId) roomOccupied.add(`${day}_${period.id}_${selectedRoomId}`);

            entriesToCreate.push({
              timetableVersionId: version.id,
              dayOfWeek: day,
              periodId: period.id,
              sectionId: sec.id,
              subjectOfferingId: offering.id,
              subjectId: offering.subjectId,
              teacherId: teacher?.id || null,
              roomId: selectedRoomId,
            });

            scheduledDaysForSubject.add(day);
            periodsPlaced++;
            slotsScheduled++;
          }
        }

        // Secondary pass if slots remain unplaced (allow multiple periods per day)
        if (periodsPlaced < required) {
          for (const day of workingDays) {
            if (periodsPlaced >= required) break;

            for (const period of periods) {
              if (periodsPlaced >= required) break;

              const secKey = `${day}_${period.id}_${sec.id}`;
              if (sectionOccupied.has(secKey)) continue;

              if (teacher) {
                const teachKey = `${day}_${period.id}_${teacher.id}`;
                if (teacherOccupied.has(teachKey)) continue;
              }

              let selectedRoomId: string | null = null;
              for (const r of fallbackRooms) {
                const rKey = `${day}_${period.id}_${r.id}`;
                if (!roomOccupied.has(rKey)) {
                  selectedRoomId = r.id;
                  break;
                }
              }

              sectionOccupied.add(secKey);
              if (teacher) teacherOccupied.add(`${day}_${period.id}_${teacher.id}`);
              if (selectedRoomId) roomOccupied.add(`${day}_${period.id}_${selectedRoomId}`);

              entriesToCreate.push({
                timetableVersionId: version.id,
                dayOfWeek: day,
                periodId: period.id,
                sectionId: sec.id,
                subjectOfferingId: offering.id,
                subjectId: offering.subjectId,
                teacherId: teacher?.id || null,
                roomId: selectedRoomId,
              });

              periodsPlaced++;
              slotsScheduled++;
            }
          }
        }

        // Explainable failure reporting for unscheduled cases
        if (periodsPlaced < required) {
          const missing = required - periodsPlaced;
          diagnostics.push({
            sectionId: sec.id,
            sectionName: `${sec.class.name} - ${sec.name}`,
            subjectId: offering.subjectId,
            subjectName: offering.subject.name,
            teacherId: teacher?.id,
            teacherName: teacher?.user ? `${teacher.user.firstName} ${teacher.user.lastName}` : 'Unassigned',
            requestedPeriods: required,
            scheduledPeriods: periodsPlaced,
            reason: `Could only schedule ${periodsPlaced}/${required} periods. Insufficient free slots without teacher, room, or section collision.`,
            conflictingConstraints: [
              teacher ? `Teacher availability or concurrent teaching assignments` : `No assigned teacher`,
              `Room availability in campus`,
              `Maximum weekly working day periods reached for section`,
            ],
            suggestedRemedy: `Increase weekly working days, add teaching periods, or distribute ${offering.subject.name} to an additional faculty member.`,
          });
        }
      }
    }

    // 8. Commit Generated Entries to Database in Transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete unlocked entries in this version
      await tx.timetableEntry.deleteMany({
        where: {
          timetableVersionId: version.id,
          isLocked: false,
        },
      });

      // Insert new entries in batches
      if (entriesToCreate.length > 0) {
        await tx.timetableEntry.createMany({
          data: entriesToCreate,
        });
      }
    });

    const completedAt = new Date();
    const unscheduledCount = totalSlotsRequired - slotsScheduled;
    const runStatus = unscheduledCount === 0 ? 'SUCCESS' : slotsScheduled > 0 ? 'PARTIAL' : 'FAILED';

    // 9. Save Audited Scheduling Run Record
    const run = await this.prisma.schedulingRun.create({
      data: {
        organizationId,
        campusId: campusId || null,
        timetableVersionId: version.id,
        status: runStatus,
        totalSlotsRequired,
        slotsScheduled,
        conflictsCount: 0,
        unscheduledCount,
        diagnostics: diagnostics.length > 0 ? JSON.parse(JSON.stringify(diagnostics)) : null,
        startedAt,
        completedAt,
        initiatedBy: userId || 'system',
      },
    });

    this.logger.log(`Completed scheduling run ${run.id}: ${slotsScheduled}/${totalSlotsRequired} slots scheduled (${runStatus})`);

    return {
      runId: run.id,
      status: runStatus,
      totalSlotsRequired,
      slotsScheduled,
      unscheduledCount,
      diagnostics,
      startedAt,
      completedAt,
    };
  }
}
