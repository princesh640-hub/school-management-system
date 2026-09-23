// =============================================================================
// Phase 4K: Hostel Reports & Analytics Service
// =============================================================================
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class HostelReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(user: CurrentUserPayload) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalHostels,
      totalBuildings,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      activeResidents,
      studentsOnOuting,
      pendingOutings,
      openIncidents,
      openMaintenance,
      presentAttendance,
      absentAttendance,
      outAttendance,
      lateAttendance,
    ] = await Promise.all([
      this.prisma.hostel.count({ where: { organizationId: user.organizationId, status: 'ACTIVE' } }),
      this.prisma.hostelBuilding.count({ where: { hostel: { organizationId: user.organizationId } } }),
      this.prisma.hostelRoom.count({ where: { hostel: { organizationId: user.organizationId } } }),
      this.prisma.hostelBed.count({ where: { room: { hostel: { organizationId: user.organizationId } } } }),
      this.prisma.hostelBed.count({ where: { room: { hostel: { organizationId: user.organizationId } }, status: 'OCCUPIED' } }),
      this.prisma.hostelBed.count({ where: { room: { hostel: { organizationId: user.organizationId } }, status: 'AVAILABLE' } }),
      this.prisma.hostelAllocation.count({ where: { organizationId: user.organizationId, status: 'ACTIVE' } }),
      this.prisma.hostelOuting.count({ where: { organizationId: user.organizationId, status: 'OUT' } }),
      this.prisma.hostelOuting.count({ where: { organizationId: user.organizationId, status: 'SUBMITTED' } }),
      this.prisma.hostelIncident.count({ where: { organizationId: user.organizationId, status: 'OPEN' } }),
      this.prisma.hostelMaintenanceRequest.count({ where: { organizationId: user.organizationId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      this.prisma.hostelAttendance.count({ where: { organizationId: user.organizationId, date: today, status: 'PRESENT' } }),
      this.prisma.hostelAttendance.count({ where: { organizationId: user.organizationId, date: today, status: 'ABSENT' } }),
      this.prisma.hostelAttendance.count({ where: { organizationId: user.organizationId, date: today, status: 'OUT' } }),
      this.prisma.hostelAttendance.count({ where: { organizationId: user.organizationId, date: today, status: 'LATE' } }),
    ]);

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalHostels,
      totalBuildings,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
      activeResidents,
      studentsOnOuting,
      pendingOutings,
      openIncidents,
      openMaintenanceRequests: openMaintenance,
      todayAttendance: {
        present: presentAttendance,
        absent: absentAttendance,
        out: outAttendance,
        late: lateAttendance,
      },
    };
  }

  async getOccupancyReport(user: CurrentUserPayload, hostelId?: string) {
    const rooms = await this.prisma.hostelRoom.findMany({
      where: {
        hostel: { organizationId: user.organizationId },
        ...(hostelId ? { hostelId } : {}),
      },
      include: {
        hostel: { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
        _count: {
          select: {
            allocations: { where: { status: 'ACTIVE' } },
            beds: true,
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });

    return rooms.map((r) => {
      const occupied = r._count.allocations;
      const available = Math.max(0, r.capacity - occupied);
      return {
        roomId: r.id,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        hostelId: r.hostelId,
        hostelName: r.hostel.name,
        buildingName: r.building?.name,
        capacity: r.capacity,
        occupiedCount: occupied,
        availableCount: available,
        status: r.status,
      };
    });
  }

  async getMaintenanceCostReport(user: CurrentUserPayload, startDate?: string, endDate?: string) {
    const records = await this.prisma.hostelMaintenanceRequest.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['RESOLVED', 'CLOSED'] },
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
        hostel: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: { completedDate: 'desc' },
    });

    const totalCost = records.reduce(
      (sum, r) => sum + (r.cost ? parseFloat(r.cost.toString()) : 0),
      0,
    );

    const byCategory = records.reduce((acc: any, r) => {
      const cat = r.issueCategory;
      if (!acc[cat]) acc[cat] = { count: 0, cost: 0 };
      acc[cat].count++;
      acc[cat].cost += r.cost ? parseFloat(r.cost.toString()) : 0;
      return acc;
    }, {} as Record<string, { count: number; cost: number }>);

    return {
      records,
      totalCost: parseFloat(totalCost.toFixed(2)),
      byCategory,
    };
  }

  async getIncidentSummaryReport(user: CurrentUserPayload, startDate?: string, endDate?: string) {
    const incidents = await this.prisma.hostelIncident.findMany({
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
        hostel: { select: { id: true, name: true } },
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
      resolved: incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
      open: incidents.filter((i) => i.status === 'OPEN' || i.status === 'INVESTIGATING').length,
      bySeverity,
    };
  }

  async getDefaultersReport(user: CurrentUserPayload) {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const activeResidents = await this.prisma.hostelAllocation.findMany({
      where: { organizationId: user.organizationId, status: 'ACTIVE' },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        hostel: { select: { id: true, name: true } },
        room: { select: { roomNumber: true } },
      },
    });

    const results = await Promise.all(
      activeResidents.map(async (alloc) => {
        const recentAttendance = await this.prisma.hostelAttendance.findFirst({
          where: {
            studentId: alloc.studentId,
            organizationId: user.organizationId,
            date: { gte: threeDaysAgo },
            status: 'PRESENT',
          },
          orderBy: { date: 'desc' },
        });
        return { allocation: alloc, lastPresent: recentAttendance };
      }),
    );

    return results.filter((r) => !r.lastPresent);
  }
}
