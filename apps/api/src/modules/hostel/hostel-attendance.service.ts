// =============================================================================
// Phase 4K: Hostel Attendance & Roll Call Service
// =============================================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class HostelAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async markAttendance(user: CurrentUserPayload, dto: any) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const session = dto.session ?? 'NIGHT_ROLL_CALL';

    const record = await this.prisma.hostelAttendance.upsert({
      where: {
        studentId_date_session: {
          studentId: dto.studentId,
          date,
          session,
        },
      },
      update: {
        status: dto.status,
        roomId: dto.roomId,
        notes: dto.notes,
        recordedBy: user.userId,
      },
      create: {
        organizationId: user.organizationId,
        hostelId: dto.hostelId,
        studentId: dto.studentId,
        roomId: dto.roomId,
        date,
        session,
        status: dto.status,
        notes: dto.notes,
        recordedBy: user.userId,
      },
    });

    return record;
  }

  async bulkMarkAttendance(user: CurrentUserPayload, dto: any) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const session = dto.session ?? 'NIGHT_ROLL_CALL';

    const savedRecords: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const rec of dto.records || []) {
        const item = await tx.hostelAttendance.upsert({
          where: {
            studentId_date_session: {
              studentId: rec.studentId,
              date,
              session,
            },
          },
          update: {
            status: rec.status,
            roomId: rec.roomId,
            notes: rec.notes,
            recordedBy: user.userId,
          },
          create: {
            organizationId: user.organizationId,
            hostelId: dto.hostelId,
            studentId: rec.studentId,
            roomId: rec.roomId,
            date,
            session,
            status: rec.status,
            notes: rec.notes,
            recordedBy: user.userId,
          },
        });
        savedRecords.push(item);
      }
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelAttendance',
      entityId: `${dto.hostelId}_${dto.date}`,
      newValue: { count: savedRecords.length, date: dto.date, session },
    });

    return { success: true, count: savedRecords.length, records: savedRecords };
  }

  async getRoster(user: CurrentUserPayload, hostelId: string, dateStr?: string, sessionStr?: string) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);
    const session = sessionStr ?? 'NIGHT_ROLL_CALL';

    // 1. Get all active allocations in this hostel
    const activeAllocations = await this.prisma.hostelAllocation.findMany({
      where: {
        hostelId,
        status: 'ACTIVE',
        organizationId: user.organizationId,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        room: { select: { id: true, roomNumber: true } },
        bed: { select: { id: true, bedNumber: true } },
      },
      orderBy: [{ room: { roomNumber: 'asc' } }, { bed: { bedNumber: 'asc' } }],
    });

    // 2. Get recorded attendance for this date & session
    const recordedAttendance = await this.prisma.hostelAttendance.findMany({
      where: {
        hostelId,
        date,
        session,
        organizationId: user.organizationId,
      },
    });
    const attendanceMap = new Map(recordedAttendance.map((a) => [a.studentId, a]));

    return activeAllocations.map((alloc) => {
      const existing = attendanceMap.get(alloc.studentId);
      return {
        studentId: alloc.studentId,
        admissionNumber: alloc.student.admissionNumber,
        studentName: `${alloc.student.user?.firstName || ''} ${alloc.student.user?.lastName || ''}`.trim(),
        roomId: alloc.roomId,
        roomNumber: alloc.room.roomNumber,
        bedNumber: alloc.bed?.bedNumber,
        status: existing ? existing.status : 'PRESENT',
        notes: existing?.notes || '',
      };
    });
  }

  async listAttendance(
    user: CurrentUserPayload,
    hostelId?: string,
    studentId?: string,
    dateStr?: string,
    session?: string,
  ) {
    const date = dateStr ? new Date(dateStr) : undefined;
    if (date) date.setHours(0, 0, 0, 0);

    return this.prisma.hostelAttendance.findMany({
      where: {
        organizationId: user.organizationId,
        ...(hostelId ? { hostelId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(date ? { date } : {}),
        ...(session ? { session } : {}),
      },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        hostel: { select: { id: true, name: true, code: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getTodayAttendanceSummary(user: CurrentUserPayload) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [present, absent, out, late] = await Promise.all([
      this.prisma.hostelAttendance.count({
        where: { organizationId: user.organizationId, date: today, status: 'PRESENT' },
      }),
      this.prisma.hostelAttendance.count({
        where: { organizationId: user.organizationId, date: today, status: 'ABSENT' },
      }),
      this.prisma.hostelAttendance.count({
        where: { organizationId: user.organizationId, date: today, status: 'OUT' },
      }),
      this.prisma.hostelAttendance.count({
        where: { organizationId: user.organizationId, date: today, status: 'LATE' },
      }),
    ]);

    return { date: today, present, absent, out, late, totalMarked: present + absent + out + late };
  }
}
