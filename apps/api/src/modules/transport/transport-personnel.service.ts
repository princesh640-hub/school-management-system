// =============================================================================
// Phase 4J: Transport Drivers & Attendants Service
// =============================================================================
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
export class TransportPersonnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------- DRIVERS ------------------------------------

  async createDriver(user: CurrentUserPayload, dto: any) {
    const existingLicense = await this.prisma.transportDriver.findUnique({
      where: { licenseNumber: dto.licenseNumber },
    });
    if (existingLicense) throw new ConflictException(`License number '${dto.licenseNumber}' already registered`);

    // Auto-generate driver code
    const last = await this.prisma.transportDriver.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { driverCode: true },
    });
    const driverCode = nextCode('DRV', last?.driverCode ?? null);

    // Verify collision
    const existing = await this.prisma.transportDriver.findUnique({ where: { driverCode } });
    if (existing) throw new ConflictException('Driver code collision, please retry');

    const driver = await this.prisma.transportDriver.create({
      data: {
        organizationId: user.organizationId,
        vehicleId: dto.vehicleId,
        employeeId: dto.employeeId,
        driverCode,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
        licenseClass: dto.licenseClass,
        experienceYears: dto.experienceYears ?? 0,
        contactPhone: dto.contactPhone,
        address: dto.address,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'TransportDriver',
      entityId: driver.id,
      newValue: driver,
    });

    return driver;
  }

  async listDrivers(user: CurrentUserPayload, status?: string) {
    return this.prisma.transportDriver.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, capacity: true } },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { driverCode: 'asc' },
    });
  }

  async getDriver(user: CurrentUserPayload, id: string) {
    const driver = await this.prisma.transportDriver.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        vehicle: true,
        employee: { include: { user: true } },
        schedules: { take: 10, orderBy: { scheduleDate: 'desc' } },
        incidents: { take: 5, orderBy: { incidentDate: 'desc' } },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async updateDriver(user: CurrentUserPayload, id: string, dto: any) {
    const driver = await this.prisma.transportDriver.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const updated = await this.prisma.transportDriver.update({
      where: { id },
      data: {
        vehicleId: dto.vehicleId,
        employeeId: dto.employeeId,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
        licenseClass: dto.licenseClass,
        experienceYears: dto.experienceYears,
        contactPhone: dto.contactPhone,
        address: dto.address,
        notes: dto.notes,
        status: dto.status,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'TransportDriver',
      entityId: id,
      oldValue: driver,
      newValue: updated,
    });

    return updated;
  }

  async getDriverLicenseAlerts(user: CurrentUserPayload) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + 60);
    const today = new Date();

    const drivers = await this.prisma.transportDriver.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'ACTIVE',
        licenseExpiry: { lte: thresholdDate },
      },
      orderBy: { licenseExpiry: 'asc' },
    });

    return drivers.map((d) => ({
      driverId: d.id,
      driverCode: d.driverCode,
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry,
      daysUntilExpiry: d.licenseExpiry
        ? Math.ceil((d.licenseExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }

  // ----------------------------- ATTENDANTS ---------------------------------

  async createAttendant(user: CurrentUserPayload, dto: any) {
    const last = await this.prisma.transportAttendant.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { attendantCode: true },
    });
    const attendantCode = nextCode('ATT', last?.attendantCode ?? null);

    const attendant = await this.prisma.transportAttendant.create({
      data: {
        organizationId: user.organizationId,
        vehicleId: dto.vehicleId,
        employeeId: dto.employeeId,
        attendantCode,
        contactPhone: dto.contactPhone,
        address: dto.address,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'TransportAttendant',
      entityId: attendant.id,
      newValue: attendant,
    });

    return attendant;
  }

  async listAttendants(user: CurrentUserPayload, status?: string) {
    return this.prisma.transportAttendant.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { attendantCode: 'asc' },
    });
  }

  async updateAttendant(user: CurrentUserPayload, id: string, dto: any) {
    const attendant = await this.prisma.transportAttendant.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!attendant) throw new NotFoundException('Attendant not found');

    const updated = await this.prisma.transportAttendant.update({
      where: { id },
      data: {
        vehicleId: dto.vehicleId,
        employeeId: dto.employeeId,
        contactPhone: dto.contactPhone,
        address: dto.address,
        notes: dto.notes,
        status: dto.status,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'TransportAttendant',
      entityId: id,
      oldValue: attendant,
      newValue: updated,
    });

    return updated;
  }
}
