// =============================================================================
// Phase 4J: Transport Facilities & Vehicles Service
// =============================================================================
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class TransportFacilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createFacility(user: CurrentUserPayload, dto: any) {
    const existing = await this.prisma.transportFacility.findFirst({
      where: { organizationId: user.organizationId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Facility code '${dto.code}' already exists`);

    const facility = await this.prisma.transportFacility.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId,
        name: dto.name,
        code: dto.code,
        address: dto.address,
        city: dto.city,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'TransportFacility',
      entityId: facility.id,
      newValue: facility,
    });

    return facility;
  }

  async listFacilities(user: CurrentUserPayload, campusId?: string) {
    return this.prisma.transportFacility.findMany({
      where: {
        organizationId: user.organizationId,
        ...(campusId ? { campusId } : {}),
        status: 'ACTIVE',
      },
      include: { campus: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getFacility(user: CurrentUserPayload, id: string) {
    const facility = await this.prisma.transportFacility.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        campus: { select: { id: true, name: true } },
        vehicles: { where: { status: { not: 'RETIRED' } }, select: { id: true, vehicleNumber: true, status: true, capacity: true } },
        routes: { where: { status: 'ACTIVE' }, select: { id: true, routeCode: true, name: true } },
      },
    });
    if (!facility) throw new NotFoundException('Transport facility not found');
    return facility;
  }

  async updateFacility(user: CurrentUserPayload, id: string, dto: any) {
    const facility = await this.prisma.transportFacility.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!facility) throw new NotFoundException('Transport facility not found');

    const updated = await this.prisma.transportFacility.update({
      where: { id },
      data: { ...dto, updatedBy: user.userId },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'TransportFacility',
      entityId: id,
      oldValue: facility,
      newValue: updated,
    });

    return updated;
  }
}

@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async registerVehicle(user: CurrentUserPayload, dto: any) {
    const existingVN = await this.prisma.vehicle.findUnique({ where: { vehicleNumber: dto.vehicleNumber } });
    if (existingVN) throw new ConflictException(`Vehicle number '${dto.vehicleNumber}' already registered`);

    const existingReg = await this.prisma.vehicle.findUnique({ where: { registrationNumber: dto.registrationNumber } });
    if (existingReg) throw new ConflictException(`Registration number '${dto.registrationNumber}' already registered`);

    if (dto.capacity <= 0) throw new BadRequestException('Capacity must be greater than 0');

    const vehicle = await this.prisma.vehicle.create({
      data: {
        organizationId: user.organizationId,
        facilityId: dto.facilityId,
        vehicleNumber: dto.vehicleNumber,
        registrationNumber: dto.registrationNumber,
        vehicleType: dto.vehicleType ?? 'BUS',
        make: dto.make,
        model: dto.model,
        year: dto.year,
        color: dto.color,
        capacity: dto.capacity,
        fuelType: dto.fuelType,
        engineNumber: dto.engineNumber,
        chassisNumber: dto.chassisNumber,
        insuranceNumber: dto.insuranceNumber,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : undefined,
        taxExpiry: dto.taxExpiry ? new Date(dto.taxExpiry) : undefined,
        permitExpiry: dto.permitExpiry ? new Date(dto.permitExpiry) : undefined,
        gpsDeviceId: dto.gpsDeviceId,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'Vehicle',
      entityId: vehicle.id,
      newValue: vehicle,
    });

    return vehicle;
  }

  async listVehicles(user: CurrentUserPayload, facilityId?: string, status?: string) {
    return this.prisma.vehicle.findMany({
      where: {
        organizationId: user.organizationId,
        ...(facilityId ? { facilityId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        facility: { select: { id: true, name: true, code: true } },
        driverAssignments: {
          where: { status: 'ACTIVE' },
          select: { id: true, driverCode: true, licenseNumber: true },
          take: 1,
        },
      },
      orderBy: { vehicleNumber: 'asc' },
    });
  }

  async getVehicle(user: CurrentUserPayload, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        facility: { select: { id: true, name: true } },
        documents: { where: { status: 'ACTIVE' } },
        driverAssignments: { where: { status: 'ACTIVE' } },
        attendantAssignments: { where: { status: 'ACTIVE' } },
        maintenances: { orderBy: { createdAt: 'desc' }, take: 5 },
        fuelRecords: { orderBy: { fuelDate: 'desc' }, take: 10 },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async updateVehicleStatus(user: CurrentUserPayload, id: string, dto: any) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes ?? vehicle.notes, updatedBy: user.userId },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'Vehicle',
      entityId: id,
      oldValue: { status: vehicle.status },
      newValue: { status: dto.status },
    });

    return updated;
  }

  async updateVehicle(user: CurrentUserPayload, id: string, dto: any) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dto,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : undefined,
        taxExpiry: dto.taxExpiry ? new Date(dto.taxExpiry) : undefined,
        permitExpiry: dto.permitExpiry ? new Date(dto.permitExpiry) : undefined,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'Vehicle',
      entityId: id,
      oldValue: vehicle,
      newValue: updated,
    });

    return updated;
  }

  async addVehicleDocument(user: CurrentUserPayload, vehicleId: string, dto: any) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId: user.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const doc = await this.prisma.vehicleDocument.create({
      data: {
        vehicleId,
        title: dto.title,
        documentType: dto.documentType,
        fileUrl: dto.fileUrl,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'VehicleDocument',
      entityId: doc.id,
      newValue: doc,
    });

    return doc;
  }

  async listVehicleDocuments(user: CurrentUserPayload, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId: user.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return this.prisma.vehicleDocument.findMany({
      where: { vehicleId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExpiryAlerts(user: CurrentUserPayload) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + 30);
    const today = new Date();

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['ACTIVE', 'IN_SERVICE'] },
      },
    });

    const alerts: any[] = [];
    for (const v of vehicles) {
      const fields: { field: keyof typeof v; type: string }[] = [
        { field: 'insuranceExpiry', type: 'INSURANCE' },
        { field: 'fitnessExpiry', type: 'FITNESS' },
        { field: 'taxExpiry', type: 'TAX' },
        { field: 'permitExpiry', type: 'PERMIT' },
        { field: 'nextServiceDue', type: 'SERVICE' },
      ];
      for (const { field, type } of fields) {
        const dt = v[field] as Date | null;
        if (dt && dt <= thresholdDate) {
          const daysUntilExpiry = Math.ceil((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          alerts.push({
            vehicleId: v.id,
            vehicleNumber: v.vehicleNumber,
            registrationNumber: v.registrationNumber,
            alertType: type,
            expiryDate: dt,
            daysUntilExpiry,
          });
        }
      }
    }

    return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }
}
