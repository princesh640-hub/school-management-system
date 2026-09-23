// =============================================================================
// Phase 4K: Hostel Movement & Curfew Service (Outings, Leaves, Visitors)
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

function nextMovementCode(prefix: string, last: string | null): string {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  if (!last) return `${base}00001`;
  const lastNum = parseInt(last.split('-').pop() || '0', 10);
  return `${base}${String(lastNum + 1).padStart(5, '0')}`;
}

@Injectable()
export class HostelMovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Outings & Curfew Movement
  // ---------------------------------------------------------------------------

  async createOuting(user: CurrentUserPayload, dto: any) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const last = await this.prisma.hostelOuting.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { outingNumber: true },
    });
    const outingNumber = nextMovementCode('OUT', last?.outingNumber ?? null);

    const outing = await this.prisma.hostelOuting.create({
      data: {
        organizationId: user.organizationId,
        outingNumber,
        studentId: dto.studentId,
        hostelId: dto.hostelId,
        outingType: dto.outingType ?? 'DAY_OUTING',
        startDate: new Date(dto.startDate),
        expectedReturn: new Date(dto.expectedReturn),
        destination: dto.destination,
        reason: dto.reason,
        guardianConsent: !!dto.guardianConsent,
        guardianContact: dto.guardianContact,
        status: dto.status ?? 'SUBMITTED',
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelOuting',
      entityId: outing.id,
      newValue: outing,
    });

    return outing;
  }

  async approveOuting(user: CurrentUserPayload, id: string, dto: any) {
    const outing = await this.prisma.hostelOuting.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!outing) throw new NotFoundException('Outing request not found');

    const newStatus = dto.approved ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.hostelOuting.update({
      where: { id },
      data: {
        status: newStatus,
        approvedBy: user.userId,
        approvalNotes: dto.approvalNotes,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelOuting',
      entityId: id,
      oldValue: { status: outing.status },
      newValue: { status: newStatus },
    });

    return updated;
  }

  async recordOutingDeparture(user: CurrentUserPayload, id: string) {
    const outing = await this.prisma.hostelOuting.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!outing) throw new NotFoundException('Outing request not found');
    if (outing.status !== 'APPROVED') {
      throw new BadRequestException('Only approved outings can depart');
    }

    return this.prisma.hostelOuting.update({
      where: { id },
      data: {
        status: 'OUT',
        recordedBy: user.userId,
        updatedBy: user.userId,
      },
    });
  }

  async recordOutingReturn(user: CurrentUserPayload, id: string, dto: any) {
    const outing = await this.prisma.hostelOuting.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!outing) throw new NotFoundException('Outing request not found');

    const returnTime = dto?.actualReturn ? new Date(dto.actualReturn) : new Date();
    const isLate = returnTime.getTime() > outing.expectedReturn.getTime();
    const finalStatus = isLate ? 'LATE_RETURN' : 'RETURNED';

    const updated = await this.prisma.hostelOuting.update({
      where: { id },
      data: {
        status: finalStatus,
        actualReturn: returnTime,
        notes: dto?.notes ? `${outing.notes ?? ''}\nReturn Note: ${dto.notes}`.trim() : outing.notes,
        recordedBy: user.userId,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelOuting',
      entityId: id,
      oldValue: { status: outing.status },
      newValue: { status: finalStatus, actualReturn: returnTime },
    });

    return updated;
  }

  async listOutings(
    user: CurrentUserPayload,
    hostelId?: string,
    studentId?: string,
    status?: string,
  ) {
    return this.prisma.hostelOuting.findMany({
      where: {
        organizationId: user.organizationId,
        ...(hostelId ? { hostelId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true, phone: true } } },
        },
        hostel: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOuting(user: CurrentUserPayload, id: string) {
    const outing = await this.prisma.hostelOuting.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        student: { include: { user: true } },
        hostel: true,
      },
    });
    if (!outing) throw new NotFoundException('Outing request not found');
    return outing;
  }

  // ---------------------------------------------------------------------------
  // 2. Visitors Management
  // ---------------------------------------------------------------------------

  async createVisitor(user: CurrentUserPayload, dto: any) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const last = await this.prisma.hostelVisitor.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { visitorNumber: true },
    });
    const visitorNumber = nextMovementCode('VIS', last?.visitorNumber ?? null);

    const visitor = await this.prisma.hostelVisitor.create({
      data: {
        organizationId: user.organizationId,
        visitorNumber,
        studentId: dto.studentId,
        hostelId: dto.hostelId,
        visitorName: dto.visitorName,
        relationship: dto.relationship,
        contactPhone: dto.contactPhone,
        idProofType: dto.idProofType,
        idProofNumber: dto.idProofNumber,
        visitDate: new Date(dto.visitDate),
        purpose: dto.purpose,
        entryTime: dto.entryTime ? new Date(dto.entryTime) : undefined,
        status: dto.status ?? 'SCHEDULED',
        notes: dto.notes,
        recordedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelVisitor',
      entityId: visitor.id,
      newValue: visitor,
    });

    return visitor;
  }

  async updateVisitorStatus(user: CurrentUserPayload, id: string, dto: any) {
    const visitor = await this.prisma.hostelVisitor.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!visitor) throw new NotFoundException('Visitor record not found');

    const updated = await this.prisma.hostelVisitor.update({
      where: { id },
      data: {
        status: dto.status,
        entryTime: dto.entryTime ? new Date(dto.entryTime) : visitor.entryTime,
        exitTime: dto.exitTime ? new Date(dto.exitTime) : visitor.exitTime,
        notes: dto.notes ?? visitor.notes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelVisitor',
      entityId: id,
      oldValue: { status: visitor.status },
      newValue: { status: dto.status },
    });

    return updated;
  }

  async listVisitors(
    user: CurrentUserPayload,
    hostelId?: string,
    studentId?: string,
    status?: string,
  ) {
    return this.prisma.hostelVisitor.findMany({
      where: {
        organizationId: user.organizationId,
        ...(hostelId ? { hostelId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        student: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        hostel: { select: { id: true, name: true } },
      },
      orderBy: { visitDate: 'desc' },
    });
  }
}
