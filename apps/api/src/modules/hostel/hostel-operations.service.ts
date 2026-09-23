// =============================================================================
// Phase 4K: Hostel Operations Service (Wardens, Incidents, Maintenance)
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

function nextOpCode(prefix: string, last: string | null): string {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  if (!last) return `${base}00001`;
  const lastNum = parseInt(last.split('-').pop() || '0', 10);
  return `${base}${String(lastNum + 1).padStart(5, '0')}`;
}

@Injectable()
export class HostelOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Wardens & Staff
  // ---------------------------------------------------------------------------

  async assignWarden(user: CurrentUserPayload, dto: any) {
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: dto.employeeId },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Employee profile not found');

    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    // Check if already actively assigned in same role
    const existing = await this.prisma.hostelWarden.findFirst({
      where: {
        employeeId: dto.employeeId,
        hostelId: dto.hostelId,
        role: dto.role ?? 'WARDEN',
        status: 'ACTIVE',
      },
    });
    if (existing) {
      throw new ConflictException('Employee is already assigned to this hostel in that role');
    }

    const warden = await this.prisma.hostelWarden.create({
      data: {
        organizationId: user.organizationId,
        employeeId: dto.employeeId,
        hostelId: dto.hostelId,
        buildingId: dto.buildingId,
        role: dto.role ?? 'WARDEN',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: 'ACTIVE',
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelWarden',
      entityId: warden.id,
      newValue: warden,
    });

    return warden;
  }

  async listWardens(user: CurrentUserPayload, hostelId?: string, status?: string) {
    return this.prisma.hostelWarden.findMany({
      where: {
        organizationId: user.organizationId,
        ...(hostelId ? { hostelId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        hostel: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async updateWarden(user: CurrentUserPayload, id: string, dto: any) {
    const warden = await this.prisma.hostelWarden.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!warden) throw new NotFoundException('Warden record not found');

    const updated = await this.prisma.hostelWarden.update({
      where: { id },
      data: {
        role: dto.role ?? warden.role,
        endDate: dto.endDate ? new Date(dto.endDate) : warden.endDate,
        status: dto.status ?? warden.status,
        notes: dto.notes ?? warden.notes,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelWarden',
      entityId: id,
      oldValue: warden,
      newValue: updated,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 2. Hostel Incidents
  // ---------------------------------------------------------------------------

  async reportIncident(user: CurrentUserPayload, dto: any) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const last = await this.prisma.hostelIncident.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { incidentNumber: true },
    });
    const incidentNumber = nextOpCode('HINC', last?.incidentNumber ?? null);

    const incident = await this.prisma.$transaction(async (tx) => {
      const inc = await tx.hostelIncident.create({
        data: {
          organizationId: user.organizationId,
          incidentNumber,
          incidentDate: new Date(dto.incidentDate),
          hostelId: dto.hostelId,
          buildingId: dto.buildingId,
          roomId: dto.roomId,
          category: dto.category,
          description: dto.description,
          severity: dto.severity ?? 'LOW',
          immediateAction: dto.immediateAction,
          followUp: dto.followUp,
          status: 'OPEN',
          reportedBy: user.userId,
          notes: dto.notes,
          createdBy: user.userId,
        },
      });

      if (dto.involvedStudentIds?.length) {
        await tx.hostelIncidentStudent.createMany({
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
      entity: 'HostelIncident',
      entityId: incident.id,
      newValue: incident,
    });

    return incident;
  }

  async resolveIncident(user: CurrentUserPayload, id: string, dto: any) {
    const incident = await this.prisma.hostelIncident.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    const updated = await this.prisma.hostelIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: user.userId,
        followUp: dto.followUp ?? incident.followUp,
        notes: dto.notes ? `${incident.notes ?? ''}\nResolution: ${dto.notes}`.trim() : incident.notes,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelIncident',
      entityId: id,
      oldValue: { status: incident.status },
      newValue: { status: 'RESOLVED' },
    });

    return updated;
  }

  async listIncidents(user: CurrentUserPayload, hostelId?: string, status?: string) {
    return this.prisma.hostelIncident.findMany({
      where: {
        organizationId: user.organizationId,
        ...(hostelId ? { hostelId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        hostel: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
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
    const incident = await this.prisma.hostelIncident.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        hostel: true,
        building: true,
        room: true,
        involvedStudents: {
          include: { student: { include: { user: true } } },
        },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  // ---------------------------------------------------------------------------
  // 3. Maintenance Requests
  // ---------------------------------------------------------------------------

  async createMaintenance(user: CurrentUserPayload, dto: any) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const last = await this.prisma.hostelMaintenanceRequest.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { requestNumber: true },
    });
    const requestNumber = nextOpCode('HMNT', last?.requestNumber ?? null);

    const request = await this.prisma.hostelMaintenanceRequest.create({
      data: {
        organizationId: user.organizationId,
        requestNumber,
        hostelId: dto.hostelId,
        buildingId: dto.buildingId,
        roomId: dto.roomId,
        issueCategory: dto.issueCategory,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        status: 'OPEN',
        reportedBy: user.userId,
        assignedToId: dto.assignedToId,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelMaintenanceRequest',
      entityId: request.id,
      newValue: request,
    });

    return request;
  }

  async updateMaintenanceStatus(user: CurrentUserPayload, id: string, dto: any) {
    const request = await this.prisma.hostelMaintenanceRequest.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!request) throw new NotFoundException('Maintenance request not found');

    const updated = await this.prisma.hostelMaintenanceRequest.update({
      where: { id },
      data: {
        status: dto.status,
        completedDate: dto.status === 'RESOLVED' || dto.status === 'CLOSED' ? (dto.completedDate ? new Date(dto.completedDate) : new Date()) : request.completedDate,
        cost: dto.cost ?? request.cost,
        notes: dto.notes ?? request.notes,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelMaintenanceRequest',
      entityId: id,
      oldValue: { status: request.status },
      newValue: { status: dto.status },
    });

    return updated;
  }

  async listMaintenance(user: CurrentUserPayload, hostelId?: string, status?: string) {
    return this.prisma.hostelMaintenanceRequest.findMany({
      where: {
        organizationId: user.organizationId,
        ...(hostelId ? { hostelId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        hostel: { select: { id: true, name: true } },
        building: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
        assignedTo: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMaintenance(user: CurrentUserPayload, id: string) {
    const request = await this.prisma.hostelMaintenanceRequest.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        hostel: true,
        building: true,
        room: true,
        assignedTo: { include: { user: true } },
      },
    });
    if (!request) throw new NotFoundException('Maintenance request not found');
    return request;
  }
}
