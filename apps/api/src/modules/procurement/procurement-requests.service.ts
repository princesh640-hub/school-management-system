// =============================================================================
// Phase 4L: Procurement Purchase Requests Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProcurementRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPurchaseRequest(user: CurrentUserPayload, dto: any) {
    const { campusId, department, requiredDate, purpose, priority, notes, lines } = dto;

    if (!purpose) {
      throw new BadRequestException('Purpose of requisition is required');
    }
    if (!lines || lines.length === 0) {
      throw new BadRequestException('At least one item line is required');
    }

    const requestNumber = await this.generateRequestNumber(user.organizationId);

    const request = await this.prisma.purchaseRequest.create({
      data: {
        organizationId: user.organizationId,
        campusId,
        requestNumber,
        requesterId: user.employeeId || null,
        department,
        requiredDate: requiredDate ? new Date(requiredDate) : null,
        purpose,
        priority: priority ?? 'MEDIUM',
        status: dto.status ?? 'SUBMITTED',
        notes,
        lines: {
          create: lines.map((l: any) => {
            const qty = Number(l.quantity);
            const unitPrice = l.estimatedUnitPrice ? Number(l.estimatedUnitPrice) : 0;
            return {
              itemId: l.itemId || null,
              itemDescription: l.itemDescription,
              quantity: new Prisma.Decimal(qty),
              estimatedUnitPrice: l.estimatedUnitPrice
                ? new Prisma.Decimal(unitPrice)
                : null,
              estimatedTotal: l.estimatedUnitPrice
                ? new Prisma.Decimal(qty * unitPrice)
                : null,
              notes: l.notes,
            };
          }),
        },
      },
      include: {
        campus: true,
        requester: true,
        lines: { include: { item: true } },
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'PURCHASE_REQUEST_CREATED',
      resource: 'PurchaseRequest',
      resourceId: request.id,
      details: { requestNumber, purpose, lineCount: lines.length },
    });

    return request;
  }

  async listPurchaseRequests(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.campusId) where.campusId = filters.campusId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.department) where.department = filters.department;

    return this.prisma.purchaseRequest.findMany({
      where,
      include: {
        campus: true,
        requester: true,
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPurchaseRequestById(user: CurrentUserPayload, id: string) {
    const request = await this.prisma.purchaseRequest.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        campus: true,
        requester: true,
        lines: { include: { item: true } },
        purchaseOrders: true,
      },
    });
    if (!request) throw new NotFoundException('Purchase request not found');
    return request;
  }

  async updatePurchaseRequest(user: CurrentUserPayload, id: string, dto: any) {
    const req = await this.getPurchaseRequestById(user, id);
    if (req.status !== 'DRAFT' && req.status !== 'SUBMITTED') {
      throw new BadRequestException(`Cannot modify purchase request in status '${req.status}'`);
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        department: dto.department,
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : undefined,
        purpose: dto.purpose,
        priority: dto.priority,
        notes: dto.notes,
      },
    });

    return updated;
  }

  async approvePurchaseRequest(user: CurrentUserPayload, id: string, dto: any = {}) {
    const req = await this.getPurchaseRequestById(user, id);
    if (req.status !== 'SUBMITTED' && req.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(`Cannot approve purchase request in status '${req.status}'`);
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user.userId,
        approvalDate: new Date(),
        approvalNotes: dto.approvalNotes,
      },
      include: { lines: true },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'PURCHASE_REQUEST_APPROVED',
      resource: 'PurchaseRequest',
      resourceId: id,
      details: { requestNumber: req.requestNumber, approvedBy: user.userId },
    });

    return updated;
  }

  async rejectPurchaseRequest(user: CurrentUserPayload, id: string, dto: any = {}) {
    const req = await this.getPurchaseRequestById(user, id);
    if (req.status !== 'SUBMITTED' && req.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(`Cannot reject purchase request in status '${req.status}'`);
    }

    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: user.userId,
        approvalDate: new Date(),
        approvalNotes: dto.reason || dto.approvalNotes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'PURCHASE_REQUEST_REJECTED',
      resource: 'PurchaseRequest',
      resourceId: id,
      details: { requestNumber: req.requestNumber, reason: dto.reason },
    });

    return updated;
  }

  async cancelPurchaseRequest(user: CurrentUserPayload, id: string) {
    const req = await this.getPurchaseRequestById(user, id);
    if (req.status === 'CONVERTED_TO_PO' || req.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel purchase request in status '${req.status}'`);
    }

    const cancelled = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return cancelled;
  }

  private async generateRequestNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseRequest.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `PR-${year}-${seq}`;
  }
}
