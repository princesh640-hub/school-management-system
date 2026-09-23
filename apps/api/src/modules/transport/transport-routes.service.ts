// =============================================================================
// Phase 4J: Routes & Student Assignments Service
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

function nextRouteCode(last: string | null): string {
  const year = new Date().getFullYear();
  const base = `ROUTE-${year}-`;
  if (!last) return `${base}00001`;
  const lastNum = parseInt(last.split('-').pop() || '0', 10);
  return `${base}${String(lastNum + 1).padStart(5, '0')}`;
}

@Injectable()
export class TransportRoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------- ROUTES ------------------------------------

  async createRoute(user: CurrentUserPayload, dto: any) {
    const last = await this.prisma.route.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { routeCode: true },
    });
    const routeCode = nextRouteCode(last?.routeCode ?? null);

    const route = await this.prisma.route.create({
      data: {
        organizationId: user.organizationId,
        facilityId: dto.facilityId,
        routeCode,
        name: dto.name,
        description: dto.description,
        startLocation: dto.startLocation,
        endLocation: dto.endLocation,
        totalDistance: dto.totalDistance,
        estimatedMinutes: dto.estimatedMinutes,
        feeAmount: dto.feeAmount,
        feeStructureId: dto.feeStructureId,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'Route',
      entityId: route.id,
      newValue: route,
    });

    return route;
  }

  async listRoutes(user: CurrentUserPayload, facilityId?: string, isActive?: string) {
    return this.prisma.route.findMany({
      where: {
        organizationId: user.organizationId,
        ...(facilityId ? { facilityId } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
        status: 'ACTIVE',
      },
      include: {
        facility: { select: { id: true, name: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
        _count: { select: { assignments: true, schedules: true } },
      },
      orderBy: { routeCode: 'asc' },
    });
  }

  async getRoute(user: CurrentUserPayload, id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        facility: { select: { id: true, name: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
        assignments: {
          where: { isActive: true },
          include: {
            student: { include: { user: { select: { firstName: true, lastName: true } } } },
            stop: { select: { id: true, stopName: true } },
          },
        },
        schedules: {
          where: { scheduleDate: { gte: new Date(new Date().toDateString()) } },
          take: 10,
          orderBy: { scheduleDate: 'asc' },
        },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  async updateRoute(user: CurrentUserPayload, id: string, dto: any) {
    const route = await this.prisma.route.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!route) throw new NotFoundException('Route not found');

    const updated = await this.prisma.route.update({
      where: { id },
      data: { ...dto, updatedBy: user.userId },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'Route',
      entityId: id,
      oldValue: route,
      newValue: updated,
    });

    return updated;
  }

  // ----------------------------- ROUTE STOPS --------------------------------

  async addStop(user: CurrentUserPayload, routeId: string, dto: any) {
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, organizationId: user.organizationId },
    });
    if (!route) throw new NotFoundException('Route not found');

    // Validate stopOrder uniqueness
    const existing = await this.prisma.routeStop.findFirst({
      where: { routeId, stopOrder: dto.stopOrder },
    });
    if (existing) throw new ConflictException(`Stop order ${dto.stopOrder} already exists on this route`);

    const stop = await this.prisma.routeStop.create({
      data: {
        routeId,
        stopName: dto.stopName,
        stopOrder: dto.stopOrder,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        pickupTime: dto.pickupTime,
        dropTime: dto.dropTime,
        landmarkNotes: dto.landmarkNotes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'RouteStop',
      entityId: stop.id,
      newValue: stop,
    });

    return stop;
  }

  async listStops(user: CurrentUserPayload, routeId: string) {
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, organizationId: user.organizationId },
    });
    if (!route) throw new NotFoundException('Route not found');
    return this.prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { stopOrder: 'asc' },
    });
  }

  async updateStop(user: CurrentUserPayload, routeId: string, stopId: string, dto: any) {
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, organizationId: user.organizationId },
    });
    if (!route) throw new NotFoundException('Route not found');

    const stop = await this.prisma.routeStop.findFirst({ where: { id: stopId, routeId } });
    if (!stop) throw new NotFoundException('Stop not found');

    return this.prisma.routeStop.update({ where: { id: stopId }, data: dto });
  }

  async deleteStop(user: CurrentUserPayload, routeId: string, stopId: string) {
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, organizationId: user.organizationId },
    });
    if (!route) throw new NotFoundException('Route not found');

    const stop = await this.prisma.routeStop.findFirst({ where: { id: stopId, routeId } });
    if (!stop) throw new NotFoundException('Stop not found');

    await this.prisma.routeStop.delete({ where: { id: stopId } });
    return { message: 'Stop removed successfully' };
  }

  // ----------------------------- STUDENT ASSIGNMENTS ------------------------

  async assignStudentToRoute(user: CurrentUserPayload, dto: any) {
    // Check student exists
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Check route exists and belongs to org
    const route = await this.prisma.route.findFirst({
      where: { id: dto.routeId, organizationId: user.organizationId },
    });
    if (!route) throw new NotFoundException('Route not found');

    // Check route capacity
    const currentAssignments = await this.prisma.studentTransportAssignment.count({
      where: { routeId: dto.routeId, isActive: true },
    });

    // Get vehicle capacity on this route
    const schedule = await this.prisma.transportSchedule.findFirst({
      where: { routeId: dto.routeId, status: 'SCHEDULED' },
      include: { vehicle: { select: { capacity: true } } },
    });
    if (schedule?.vehicle && currentAssignments >= schedule.vehicle.capacity) {
      throw new BadRequestException(
        `Route capacity (${schedule.vehicle.capacity}) has been reached. Use override to force-assign.`,
      );
    }

    // Deactivate any previous active assignment for this student on same route
    await this.prisma.studentTransportAssignment.updateMany({
      where: { studentId: dto.studentId, routeId: dto.routeId, isActive: true },
      data: { isActive: false, effectiveTo: new Date() },
    });

    const assignment = await this.prisma.studentTransportAssignment.create({
      data: {
        organizationId: user.organizationId,
        studentId: dto.studentId,
        routeId: dto.routeId,
        stopId: dto.stopId,
        academicYearId: dto.academicYearId,
        assignmentType: dto.assignmentType ?? 'BOTH',
        pickupAddress: dto.pickupAddress,
        dropAddress: dto.dropAddress,
        guardianContact: dto.guardianContact,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'StudentTransportAssignment',
      entityId: assignment.id,
      newValue: assignment,
    });

    return assignment;
  }

  async listStudentAssignments(user: CurrentUserPayload, routeId?: string, studentId?: string) {
    return this.prisma.studentTransportAssignment.findMany({
      where: {
        organizationId: user.organizationId,
        ...(routeId ? { routeId } : {}),
        ...(studentId ? { studentId } : {}),
        isActive: true,
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
        route: { select: { id: true, routeCode: true, name: true } },
        stop: { select: { id: true, stopName: true, pickupTime: true, dropTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivateAssignment(user: CurrentUserPayload, id: string, reason?: string) {
    const assignment = await this.prisma.studentTransportAssignment.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const updated = await this.prisma.studentTransportAssignment.update({
      where: { id },
      data: {
        isActive: false,
        effectiveTo: new Date(),
        notes: reason ? `${assignment.notes ?? ''}\nDeactivated: ${reason}`.trim() : assignment.notes,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'StudentTransportAssignment',
      entityId: id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
    });

    return updated;
  }

  async getRouteOccupancy(user: CurrentUserPayload) {
    const routes = await this.prisma.route.findMany({
      where: { organizationId: user.organizationId, status: 'ACTIVE', isActive: true },
      include: {
        _count: { select: { assignments: true } },
        schedules: {
          where: { status: 'SCHEDULED' },
          include: { vehicle: { select: { capacity: true } } },
          take: 1,
          orderBy: { scheduleDate: 'asc' },
        },
      },
    });

    return routes.map((r) => {
      const capacity = r.schedules[0]?.vehicle?.capacity ?? 0;
      const assigned = r._count.assignments;
      return {
        routeId: r.id,
        routeCode: r.routeCode,
        routeName: r.name,
        capacity,
        assignedStudents: assigned,
        occupancyPercent: capacity > 0 ? Math.round((assigned / capacity) * 100) : 0,
      };
    });
  }
}
