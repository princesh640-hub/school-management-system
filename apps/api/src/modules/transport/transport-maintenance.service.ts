// =============================================================================
// Phase 4J: Transport Maintenance, Fuel & Incidents Service
// =============================================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

function nextCode(prefix: string, last: string | null): string {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  if (!last) return `${base}00001`;
  const lastNum = parseInt(last.split('-').pop() || '0', 10);
  return `${base}${String(lastNum + 1).padStart(5, '0')}`;
}

@Injectable()
export class TransportMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------- MAINTENANCE --------------------------------

  async createMaintenance(user: CurrentUserPayload, dto: any) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: user.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const last = await this.prisma.vehicleMaintenance.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { maintenanceNumber: true },
    });
    const maintenanceNumber = nextCode('MNT', last?.maintenanceNumber ?? null);

    const maintenance = await this.prisma.vehicleMaintenance.create({
      data: {
        organizationId: user.organizationId,
        vehicleId: dto.vehicleId,
        maintenanceNumber,
        maintenanceType: dto.maintenanceType ?? 'ROUTINE_SERVICE',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        description: dto.description,
        serviceProvider: dto.serviceProvider,
        cost: dto.cost,
        odometerAtService: dto.odometerAtService,
        nextServiceDue: dto.nextServiceDue ? new Date(dto.nextServiceDue) : undefined,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    // Update vehicle status to MAINTENANCE if not already
    if (vehicle.status === 'ACTIVE' || vehicle.status === 'IN_SERVICE') {
      await this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data: { status: 'MAINTENANCE', updatedBy: user.userId },
      });
    }

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'VehicleMaintenance',
      entityId: maintenance.id,
      newValue: maintenance,
    });

    return maintenance;
  }

  async completeMaintenance(user: CurrentUserPayload, id: string, dto: any) {
    const maintenance = await this.prisma.vehicleMaintenance.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!maintenance) throw new NotFoundException('Maintenance record not found');

    const updated = await this.prisma.vehicleMaintenance.update({
      where: { id },
      data: {
        isCompleted: true,
        completedDate: dto.completedDate ? new Date(dto.completedDate) : new Date(),
        cost: dto.cost ?? maintenance.cost,
        odometerAtService: dto.odometerAtService ?? maintenance.odometerAtService,
        nextServiceDue: dto.nextServiceDue ? new Date(dto.nextServiceDue) : undefined,
        notes: dto.notes ?? maintenance.notes,
      },
    });

    // Set vehicle back to ACTIVE and update service dates
    await this.prisma.vehicle.update({
      where: { id: maintenance.vehicleId },
      data: {
        status: 'ACTIVE',
        lastServiceDate: updated.completedDate,
        nextServiceDue: updated.nextServiceDue,
        odometer: dto.odometerAtService ?? undefined,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'VehicleMaintenance',
      entityId: id,
      oldValue: { isCompleted: false },
      newValue: { isCompleted: true, completedDate: updated.completedDate },
    });

    return updated;
  }

  async listMaintenances(user: CurrentUserPayload, vehicleId?: string, isCompleted?: string) {
    return this.prisma.vehicleMaintenance.findMany({
      where: {
        organizationId: user.organizationId,
        ...(vehicleId ? { vehicleId } : {}),
        ...(isCompleted !== undefined ? { isCompleted: isCompleted === 'true' } : {}),
      },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, registrationNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMaintenance(user: CurrentUserPayload, id: string) {
    const maintenance = await this.prisma.vehicleMaintenance.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        vehicle: true,
      },
    });
    if (!maintenance) throw new NotFoundException('Maintenance record not found');
    return maintenance;
  }

  // ----------------------------- FUEL RECORDS -------------------------------

  async recordFuel(user: CurrentUserPayload, dto: any) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: user.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const totalCost =
      dto.totalCost ??
      (dto.liters && dto.pricePerLiter
        ? parseFloat((dto.liters * dto.pricePerLiter).toFixed(2))
        : undefined);

    const record = await this.prisma.vehicleFuelRecord.create({
      data: {
        organizationId: user.organizationId,
        vehicleId: dto.vehicleId,
        fuelDate: new Date(dto.fuelDate),
        liters: dto.liters,
        pricePerLiter: dto.pricePerLiter,
        totalCost,
        odometer: dto.odometer,
        fuelStation: dto.fuelStation,
        recordedBy: user.userId,
        notes: dto.notes,
      },
    });

    // Update odometer
    if (dto.odometer) {
      await this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data: { odometer: dto.odometer, updatedBy: user.userId },
      });
    }

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'VehicleFuelRecord',
      entityId: record.id,
      newValue: record,
    });

    return record;
  }

  async listFuelRecords(user: CurrentUserPayload, vehicleId?: string, startDate?: string, endDate?: string) {
    return this.prisma.vehicleFuelRecord.findMany({
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
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
      },
      orderBy: { fuelDate: 'desc' },
    });
  }

  // ----------------------------- INCIDENTS ----------------------------------

  async reportIncident(user: CurrentUserPayload, dto: any) {
    const last = await this.prisma.transportIncident.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { incidentNumber: true },
    });
    const incidentNumber = nextCode('INC', last?.incidentNumber ?? null);

    const incident = await this.prisma.$transaction(async (tx) => {
      const inc = await tx.transportIncident.create({
        data: {
          organizationId: user.organizationId,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          incidentNumber,
          incidentDate: new Date(dto.incidentDate),
          location: dto.location,
          description: dto.description,
          severity: dto.severity ?? 'LOW',
          reportedBy: user.userId,
          actionTaken: dto.actionTaken,
          notes: dto.notes,
          createdBy: user.userId,
        },
      });

      // Link involved students
      if (dto.involvedStudentIds?.length) {
        await tx.incidentStudent.createMany({
          data: dto.involvedStudentIds.map((sid: string) => ({
            incidentId: inc.id,
            studentId: sid,
          })),
          skipDuplicates: true,
        });
      }

      return inc;
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'TransportIncident',
      entityId: incident.id,
      newValue: incident,
    });

    return incident;
  }

  async resolveIncident(user: CurrentUserPayload, id: string, dto: any) {
    const incident = await this.prisma.transportIncident.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const updated = await this.prisma.transportIncident.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: user.userId,
        actionTaken: dto.actionTaken ?? incident.actionTaken,
        notes: dto.notes ?? incident.notes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'TransportIncident',
      entityId: id,
      oldValue: { isResolved: false },
      newValue: { isResolved: true },
    });

    return updated;
  }

  async listIncidents(user: CurrentUserPayload, vehicleId?: string, isResolved?: string) {
    return this.prisma.transportIncident.findMany({
      where: {
        organizationId: user.organizationId,
        ...(vehicleId ? { vehicleId } : {}),
        ...(isResolved !== undefined ? { isResolved: isResolved === 'true' } : {}),
      },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
        driver: { select: { id: true, driverCode: true } },
        involvedStudents: {
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async getIncident(user: CurrentUserPayload, id: string) {
    const incident = await this.prisma.transportIncident.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        vehicle: true,
        driver: true,
        involvedStudents: {
          include: {
            student: { include: { user: true } },
          },
        },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }
}
