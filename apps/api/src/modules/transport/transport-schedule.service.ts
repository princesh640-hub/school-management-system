// =============================================================================
// Phase 4J: Transport Schedules & Boarding Events Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class TransportScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------- SCHEDULES ----------------------------------

  async createSchedule(user: CurrentUserPayload, dto: any) {
    // Validate route exists
    const route = await this.prisma.route.findFirst({
      where: { id: dto.routeId, organizationId: user.organizationId },
    });
    if (!route) throw new NotFoundException('Route not found');

    // Validate vehicle exists (if provided)
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, organizationId: user.organizationId },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');

      // Check vehicle conflict: same vehicle, same date, overlapping trip type
      const vehicleConflict = await this.prisma.transportSchedule.findFirst({
        where: {
          vehicleId: dto.vehicleId,
          scheduleDate: new Date(dto.scheduleDate),
          tripType: dto.tripType ?? 'MORNING',
          status: { not: 'CANCELLED' },
        },
      });
      if (vehicleConflict)
        throw new ConflictException(
          `Vehicle is already scheduled for ${dto.tripType ?? 'MORNING'} trip on ${dto.scheduleDate}`,
        );
    }

    // Check driver conflict
    if (dto.driverId) {
      const driverConflict = await this.prisma.transportSchedule.findFirst({
        where: {
          driverId: dto.driverId,
          scheduleDate: new Date(dto.scheduleDate),
          tripType: dto.tripType ?? 'MORNING',
          status: { not: 'CANCELLED' },
        },
      });
      if (driverConflict)
        throw new ConflictException(
          `Driver is already assigned to another route for ${dto.tripType ?? 'MORNING'} trip on ${dto.scheduleDate}`,
        );
    }

    const schedule = await this.prisma.transportSchedule.create({
      data: {
        organizationId: user.organizationId,
        routeId: dto.routeId,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        attendantId: dto.attendantId,
        scheduleDate: new Date(dto.scheduleDate),
        departureTime: dto.departureTime,
        arrivalTime: dto.arrivalTime,
        tripType: dto.tripType ?? 'MORNING',
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'TransportSchedule',
      entityId: schedule.id,
      newValue: schedule,
    });

    return schedule;
  }

  async listSchedules(
    user: CurrentUserPayload,
    routeId?: string,
    vehicleId?: string,
    date?: string,
    status?: string,
  ) {
    const scheduleDate = date ? new Date(date) : undefined;
    return this.prisma.transportSchedule.findMany({
      where: {
        organizationId: user.organizationId,
        ...(routeId ? { routeId } : {}),
        ...(vehicleId ? { vehicleId } : {}),
        ...(scheduleDate ? { scheduleDate } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        route: { select: { id: true, routeCode: true, name: true } },
        vehicle: { select: { id: true, vehicleNumber: true, capacity: true } },
        driver: { select: { id: true, driverCode: true, licenseNumber: true } },
        attendant: { select: { id: true, attendantCode: true } },
        _count: { select: { boardingEvents: true } },
      },
      orderBy: [{ scheduleDate: 'desc' }, { tripType: 'asc' }],
    });
  }

  async getSchedule(user: CurrentUserPayload, id: string) {
    const schedule = await this.prisma.transportSchedule.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        route: { include: { stops: { orderBy: { stopOrder: 'asc' } } } },
        vehicle: true,
        driver: true,
        attendant: true,
        boardingEvents: {
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
            stop: { select: { id: true, stopName: true } },
          },
          orderBy: { eventTime: 'asc' },
        },
      },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async updateScheduleStatus(user: CurrentUserPayload, id: string, dto: any) {
    const schedule = await this.prisma.transportSchedule.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    const updated = await this.prisma.transportSchedule.update({
      where: { id },
      data: {
        status: dto.status,
        delayMinutes: dto.delayMinutes,
        notes: dto.notes,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'TransportSchedule',
      entityId: id,
      oldValue: { status: schedule.status },
      newValue: { status: dto.status },
    });

    return updated;
  }

  // ----------------------------- BOARDING EVENTS ----------------------------

  async recordBoardingEvent(user: CurrentUserPayload, dto: any) {
    // Validate student
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Check student is assigned to transport
    const assignment = await this.prisma.studentTransportAssignment.findFirst({
      where: { studentId: dto.studentId, isActive: true },
    });
    if (!assignment)
      throw new BadRequestException('Student is not assigned to any transport route');

    const event = await this.prisma.boardingEvent.create({
      data: {
        organizationId: user.organizationId,
        scheduleId: dto.scheduleId,
        vehicleId: dto.vehicleId,
        studentId: dto.studentId,
        stopId: dto.stopId,
        eventType: dto.eventType,
        eventTime: dto.eventTime ? new Date(dto.eventTime) : new Date(),
        recordedBy: user.userId,
        guardianName: dto.guardianName,
        notes: dto.notes,
      },
    });

    return event;
  }

  async listBoardingEvents(
    user: CurrentUserPayload,
    scheduleId?: string,
    studentId?: string,
    date?: string,
  ) {
    const startOfDay = date ? new Date(date) : undefined;
    const endOfDay = date
      ? new Date(new Date(date).setDate(new Date(date).getDate() + 1))
      : undefined;

    return this.prisma.boardingEvent.findMany({
      where: {
        organizationId: user.organizationId,
        ...(scheduleId ? { scheduleId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(startOfDay && endOfDay
          ? { eventTime: { gte: startOfDay, lt: endOfDay } }
          : {}),
      },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        schedule: { select: { id: true, tripType: true, scheduleDate: true } },
        stop: { select: { id: true, stopName: true } },
        vehicle: { select: { id: true, vehicleNumber: true } },
      },
      orderBy: { eventTime: 'desc' },
    });
  }

  async getTodayBoardingSummary(user: CurrentUserPayload) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalScheduled, boarded, noShow, droppedOff] = await Promise.all([
      this.prisma.transportSchedule.count({
        where: {
          organizationId: user.organizationId,
          scheduleDate: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
      }),
      this.prisma.boardingEvent.count({
        where: {
          organizationId: user.organizationId,
          eventTime: { gte: today, lt: tomorrow },
          eventType: 'BOARDING',
        },
      }),
      this.prisma.boardingEvent.count({
        where: {
          organizationId: user.organizationId,
          eventTime: { gte: today, lt: tomorrow },
          eventType: 'NO_SHOW',
        },
      }),
      this.prisma.boardingEvent.count({
        where: {
          organizationId: user.organizationId,
          eventTime: { gte: today, lt: tomorrow },
          eventType: 'DROPPED_OFF',
        },
      }),
    ]);

    return { date: today, totalScheduled, boarded, noShow, droppedOff };
  }
}
