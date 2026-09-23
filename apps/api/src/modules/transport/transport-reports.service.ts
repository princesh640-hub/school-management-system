// =============================================================================
// Phase 4J: Transport Reports & Analytics Service
// =============================================================================
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class TransportReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFleetSummary(user: CurrentUserPayload) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      outOfServiceVehicles,
      totalDrivers,
      activeDrivers,
      totalRoutes,
      activeRoutes,
      totalAssigned,
      scheduledToday,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: { organizationId: user.organizationId } }),
      this.prisma.vehicle.count({ where: { organizationId: user.organizationId, status: 'ACTIVE' } }),
      this.prisma.vehicle.count({ where: { organizationId: user.organizationId, status: 'MAINTENANCE' } }),
      this.prisma.vehicle.count({ where: { organizationId: user.organizationId, status: 'OUT_OF_SERVICE' } }),
      this.prisma.transportDriver.count({ where: { organizationId: user.organizationId } }),
      this.prisma.transportDriver.count({ where: { organizationId: user.organizationId, status: 'ACTIVE' } }),
      this.prisma.route.count({ where: { organizationId: user.organizationId, status: 'ACTIVE' } }),
      this.prisma.route.count({ where: { organizationId: user.organizationId, status: 'ACTIVE', isActive: true } }),
      this.prisma.studentTransportAssignment.count({
        where: { organizationId: user.organizationId, isActive: true },
      }),
      this.prisma.transportSchedule.count({
        where: {
          organizationId: user.organizationId,
          scheduleDate: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
      }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      outOfServiceVehicles,
      totalDrivers,
      activeDrivers,
      totalRoutes,
      activeRoutes,
      totalAssignedStudents: totalAssigned,
      scheduledToday,
    };
  }

  async getMaintenanceCostReport(user: CurrentUserPayload, startDate?: string, endDate?: string) {
    const records = await this.prisma.vehicleMaintenance.findMany({
      where: {
        organizationId: user.organizationId,
        isCompleted: true,
        ...(startDate || endDate
          ? {
              completedDate: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, registrationNumber: true } },
      },
      orderBy: { completedDate: 'desc' },
    });

    const totalCost = records.reduce(
      (sum, r) => sum + (r.cost ? parseFloat(r.cost.toString()) : 0),
      0,
    );

    const byType = records.reduce(
      (acc: any, r) => {
        const t = r.maintenanceType;
        if (!acc[t]) acc[t] = { count: 0, totalCost: 0 };
        acc[t].count++;
        acc[t].totalCost += r.cost ? parseFloat(r.cost.toString()) : 0;
        return acc;
      },
      {} as Record<string, { count: number; totalCost: number }>,
    );

    return { records, totalCost: parseFloat(totalCost.toFixed(2)), byType };
  }

  async getFuelConsumptionReport(
    user: CurrentUserPayload,
    vehicleId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const records = await this.prisma.vehicleFuelRecord.findMany({
      where: {
        organizationId: user.organizationId,
        ...(vehicleId ? { vehicleId } : {}),
        ...(startDate || endDate
          ? {
              fuelDate: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      include: { vehicle: { select: { id: true, vehicleNumber: true } } },
      orderBy: { fuelDate: 'desc' },
    });

    const totalLiters = records.reduce((sum, r) => sum + parseFloat(r.liters.toString()), 0);
    const totalCost = records.reduce(
      (sum, r) => sum + (r.totalCost ? parseFloat(r.totalCost.toString()) : 0),
      0,
    );

    const byVehicle = records.reduce((acc: any, r) => {
      const vn = r.vehicle.vehicleNumber;
      if (!acc[vn]) acc[vn] = { vehicleId: r.vehicleId, totalLiters: 0, totalCost: 0, fillUps: 0 };
      acc[vn].totalLiters += parseFloat(r.liters.toString());
      acc[vn].totalCost += r.totalCost ? parseFloat(r.totalCost.toString()) : 0;
      acc[vn].fillUps++;
      return acc;
    }, {} as Record<string, any>);

    return {
      records,
      totalLiters: parseFloat(totalLiters.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      byVehicle,
    };
  }

  async getIncidentReport(user: CurrentUserPayload, startDate?: string, endDate?: string) {
    const incidents = await this.prisma.transportIncident.findMany({
      where: {
        organizationId: user.organizationId,
        ...(startDate || endDate
          ? {
              incidentDate: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
        driver: { select: { id: true, driverCode: true } },
        involvedStudents: { select: { studentId: true } },
      },
      orderBy: { incidentDate: 'desc' },
    });

    const bySeverity = incidents.reduce((acc: any, i) => {
      if (!acc[i.severity]) acc[i.severity] = 0;
      acc[i.severity]++;
      return acc;
    }, {} as Record<string, number>);

    return {
      incidents,
      total: incidents.length,
      resolved: incidents.filter((i) => i.isResolved).length,
      unresolved: incidents.filter((i) => !i.isResolved).length,
      bySeverity,
    };
  }

  async getDefaultersReport(user: CurrentUserPayload) {
    // Students assigned to transport but with no boarding events in last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const assigned = await this.prisma.studentTransportAssignment.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        route: { select: { routeCode: true, name: true } },
      },
    });

    const results = await Promise.all(
      assigned.map(async (a) => {
        const recentEvent = await this.prisma.boardingEvent.findFirst({
          where: {
            studentId: a.studentId,
            organizationId: user.organizationId,
            eventTime: { gte: threeDaysAgo },
          },
          orderBy: { eventTime: 'desc' },
        });
        return { assignment: a, lastBoardingEvent: recentEvent };
      }),
    );

    return results.filter((r) => !r.lastBoardingEvent);
  }
}
