// =============================================================================
// Phase 4L: Procurement Purchase Orders Service
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
export class ProcurementOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPurchaseOrder(user: CurrentUserPayload, dto: any) {
    const {
      campusId,
      supplierId,
      storeId,
      purchaseRequestId,
      expectedDeliveryDate,
      terms,
      discountAmount = 0,
      notes,
      lines,
    } = dto;

    if (!supplierId) {
      throw new BadRequestException('Supplier is required');
    }
    if (!lines || lines.length === 0) {
      throw new BadRequestException('Purchase order must contain at least one line item');
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, organizationId: user.organizationId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const poNumber = await this.generatePoNumber(user.organizationId);

    let calculatedSubtotal = 0;
    let calculatedTax = 0;

    const formattedLines = lines.map((l: any) => {
      const qty = Number(l.orderedQuantity);
      const price = Number(l.unitPrice);
      const taxRate = Number(l.taxRate || 0);
      const lineSubtotal = qty * price;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      calculatedSubtotal += lineSubtotal;
      calculatedTax += lineTax;

      return {
        itemId: l.itemId || null,
        itemDescription: l.itemDescription,
        orderedQuantity: new Prisma.Decimal(qty),
        receivedQuantity: new Prisma.Decimal(0),
        unitPrice: new Prisma.Decimal(price),
        taxRate: new Prisma.Decimal(taxRate),
        totalPrice: new Prisma.Decimal(lineTotal),
        notes: l.notes,
      };
    });

    const totalAmount =
      calculatedSubtotal + calculatedTax - Number(discountAmount);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          organizationId: user.organizationId,
          campusId,
          poNumber,
          supplierId,
          storeId,
          purchaseRequestId,
          expectedDeliveryDate: expectedDeliveryDate
            ? new Date(expectedDeliveryDate)
            : null,
          terms,
          subtotal: new Prisma.Decimal(calculatedSubtotal),
          taxAmount: new Prisma.Decimal(calculatedTax),
          discountAmount: new Prisma.Decimal(discountAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          status: dto.status ?? 'DRAFT',
          notes,
          lines: {
            create: formattedLines,
          },
        },
        include: {
          supplier: true,
          store: true,
          lines: { include: { item: true } },
        },
      });

      // If tied to a PR, update PR status
      if (purchaseRequestId) {
        await tx.purchaseRequest.update({
          where: { id: purchaseRequestId },
          data: { status: 'CONVERTED_TO_PO' },
        });
      }

      await this.audit.log({
        userId: user.userId,
        organizationId: user.organizationId,
        action: 'PURCHASE_ORDER_CREATED',
        resource: 'PurchaseOrder',
        resourceId: order.id,
        details: { poNumber, supplierId, totalAmount },
      });

      return order;
    });
  }

  async listPurchaseOrders(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.campusId) where.campusId = filters.campusId;
    if (filters.storeId) where.storeId = filters.storeId;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        store: true,
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPurchaseOrderById(user: CurrentUserPayload, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        supplier: true,
        store: true,
        lines: { include: { item: true } },
        goodsReceipts: { include: { lines: true } },
        supplierInvoices: true,
      },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async updatePurchaseOrder(user: CurrentUserPayload, id: string, dto: any) {
    const order = await this.getPurchaseOrderById(user, id);
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot modify purchase order in status '${order.status}'`);
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : undefined,
        terms: dto.terms,
        notes: dto.notes,
        storeId: dto.storeId,
      },
    });

    return updated;
  }

  async approvePurchaseOrder(user: CurrentUserPayload, id: string) {
    const order = await this.getPurchaseOrderById(user, id);
    if (order.status !== 'DRAFT' && order.status !== 'SUBMITTED') {
      throw new BadRequestException(`Cannot approve order in status '${order.status}'`);
    }

    const approved = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user.userId,
        approvalDate: new Date(),
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'PURCHASE_ORDER_APPROVED',
      resource: 'PurchaseOrder',
      resourceId: id,
      details: { poNumber: order.poNumber },
    });

    return approved;
  }

  async issuePurchaseOrder(user: CurrentUserPayload, id: string) {
    const order = await this.getPurchaseOrderById(user, id);
    if (order.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot issue order in status '${order.status}'. Must be APPROVED first.`);
    }

    const issued = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'ISSUED' },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'PURCHASE_ORDER_ISSUED',
      resource: 'PurchaseOrder',
      resourceId: id,
      details: { poNumber: order.poNumber },
    });

    return issued;
  }

  async cancelPurchaseOrder(user: CurrentUserPayload, id: string) {
    const order = await this.getPurchaseOrderById(user, id);
    if (
      ['RECEIVED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED'].includes(
        order.status,
      )
    ) {
      throw new BadRequestException(`Cannot cancel order in status '${order.status}'`);
    }

    const cancelled = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return cancelled;
  }

  private async generatePoNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `PO-${year}-${seq}`;
  }
}
