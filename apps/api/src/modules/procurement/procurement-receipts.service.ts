// =============================================================================
// Phase 4L: Procurement Goods Receipts & Invoice References Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProcurementReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Goods Receipts (GRN)
  // ---------------------------------------------------------------------------

  async createGoodsReceipt(user: CurrentUserPayload, dto: any) {
    const {
      purchaseOrderId,
      storeId,
      deliveryNoteNumber,
      notes,
      lines,
    } = dto;

    if (!purchaseOrderId || !storeId) {
      throw new BadRequestException('Purchase Order ID and Store ID are required');
    }
    if (!lines || lines.length === 0) {
      throw new BadRequestException('At least one receipt line is required');
    }

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId: user.organizationId },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Purchase order not found');

    if (!['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot receive against order in status '${order.status}'`,
      );
    }

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, organizationId: user.organizationId },
    });
    if (!store) throw new NotFoundException('Store not found');

    const receiptNumber = await this.generateReceiptNumber(user.organizationId);

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      let movCount = await tx.inventoryMovement.count({
        where: { organizationId: user.organizationId },
      });

      // Format lines and create inventory movements for accepted items
      const receiptLinesData = [];

      for (const line of lines) {
        const received = Number(line.receivedQuantity);
        const rejected = Number(line.rejectedQuantity || 0);
        const accepted = Number(line.acceptedQuantity !== undefined ? line.acceptedQuantity : (received - rejected));

        receiptLinesData.push({
          itemId: line.itemId || null,
          itemDescription: line.itemDescription,
          orderedQuantity: new Prisma.Decimal(line.orderedQuantity),
          receivedQuantity: new Prisma.Decimal(received),
          rejectedQuantity: new Prisma.Decimal(rejected),
          acceptedQuantity: new Prisma.Decimal(accepted),
          damageNotes: line.damageNotes,
          batchNumber: line.batchNumber,
          serialNumber: line.serialNumber,
        });

        // 1. If line matches a PO line, update receivedQuantity on PO line
        if (line.itemId) {
          const poLine = order.lines.find((pl) => pl.itemId === line.itemId);
          if (poLine) {
            await tx.purchaseOrderLine.update({
              where: { id: poLine.id },
              data: {
                receivedQuantity: { increment: new Prisma.Decimal(received) },
              },
            });
          }
        }

        // 2. If item is tracked in inventory and accepted > 0, create movement & balance update
        if (line.itemId && accepted > 0) {
          movCount++;
          const movNum = `MOV-${year}-${String(movCount).padStart(5, '0')}`;

          const item = await tx.inventoryItem.findUnique({
            where: { id: line.itemId },
          });

          await tx.inventoryMovement.create({
            data: {
              organizationId: user.organizationId,
              movementNumber: movNum,
              itemId: line.itemId,
              storeId,
              movementType: 'RECEIPT',
              quantity: new Prisma.Decimal(accepted),
              unitCost: item ? item.unitCost : null,
              totalCost: item
                ? new Prisma.Decimal(accepted).mul(item.unitCost)
                : null,
              reference: `GRN: ${receiptNumber} (PO: ${order.poNumber})`,
              sourceDocument: deliveryNoteNumber,
              batchNumber: line.batchNumber,
              serialNumber: line.serialNumber,
              recordedBy: user.userId,
            },
          });

          await tx.inventoryBalance.upsert({
            where: {
              storeId_itemId: { storeId, itemId: line.itemId },
            },
            create: {
              storeId,
              itemId: line.itemId,
              quantityOnHand: new Prisma.Decimal(accepted),
              quantityReserved: new Prisma.Decimal(0),
              quantityAvailable: new Prisma.Decimal(accepted),
            },
            update: {
              quantityOnHand: { increment: new Prisma.Decimal(accepted) },
              quantityAvailable: { increment: new Prisma.Decimal(accepted) },
            },
          });
        }
      }

      // 3. Create GoodsReceipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          organizationId: user.organizationId,
          receiptNumber,
          purchaseOrderId,
          supplierId: order.supplierId,
          storeId,
          receivedDate: new Date(),
          receivedBy: user.userId,
          deliveryNoteNumber,
          status: 'COMPLETED',
          notes,
          lines: {
            create: receiptLinesData,
          },
        },
        include: {
          supplier: true,
          store: true,
          lines: { include: { item: true } },
        },
      });

      // 4. Update PO status
      const updatedPoLines = await tx.purchaseOrderLine.findMany({
        where: { orderId: order.id },
      });
      const allFullyReceived = updatedPoLines.every(
        (pl) => Number(pl.receivedQuantity) >= Number(pl.orderedQuantity),
      );

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
        },
      });

      await this.audit.log({
        userId: user.userId,
        organizationId: user.organizationId,
        action: 'GOODS_RECEIPT_RECORDED',
        resource: 'GoodsReceipt',
        resourceId: receipt.id,
        details: {
          receiptNumber,
          poNumber: order.poNumber,
          lineCount: lines.length,
        },
      });

      return receipt;
    });
  }

  async listGoodsReceipts(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.purchaseOrderId) where.purchaseOrderId = filters.purchaseOrderId;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.storeId) where.storeId = filters.storeId;

    return this.prisma.goodsReceipt.findMany({
      where,
      include: {
        purchaseOrder: true,
        supplier: true,
        store: true,
        lines: { include: { item: true } },
      },
      orderBy: { receivedDate: 'desc' },
    });
  }

  async getGoodsReceiptById(user: CurrentUserPayload, id: string) {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        purchaseOrder: true,
        supplier: true,
        store: true,
        lines: { include: { item: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return receipt;
  }

  // ---------------------------------------------------------------------------
  // 2. Supplier Invoice References (Finance Boundary)
  // ---------------------------------------------------------------------------

  async createInvoiceReference(user: CurrentUserPayload, dto: any) {
    const {
      invoiceNumber,
      invoiceDate,
      supplierId,
      purchaseOrderId,
      goodsReceiptId,
      amount,
      currency = 'USD',
      notes,
    } = dto;

    if (!invoiceNumber || !supplierId || amount === undefined) {
      throw new BadRequestException('Invoice number, supplier, and amount are required');
    }

    const existing = await this.prisma.supplierInvoiceReference.findFirst({
      where: {
        organizationId: user.organizationId,
        supplierId,
        invoiceNumber,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Invoice number '${invoiceNumber}' from this supplier already recorded`,
      );
    }

    const referenceNumber = await this.generateInvoiceRefNumber(user.organizationId);

    const ref = await this.prisma.supplierInvoiceReference.create({
      data: {
        organizationId: user.organizationId,
        referenceNumber,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        supplierId,
        purchaseOrderId,
        goodsReceiptId,
        amount: new Prisma.Decimal(amount),
        currency,
        status: 'RECORDED',
        notes,
      },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'SUPPLIER_INVOICE_REF_RECORDED',
      resource: 'SupplierInvoiceReference',
      resourceId: ref.id,
      details: { referenceNumber, invoiceNumber, amount },
    });

    return ref;
  }

  async listInvoiceReferences(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.status) where.status = filters.status;
    if (filters.purchaseOrderId) where.purchaseOrderId = filters.purchaseOrderId;

    return this.prisma.supplierInvoiceReference.findMany({
      where,
      include: {
        supplier: true,
        purchaseOrder: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }

  async getInvoiceReferenceById(user: CurrentUserPayload, id: string) {
    const ref = await this.prisma.supplierInvoiceReference.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
    });
    if (!ref) throw new NotFoundException('Supplier invoice reference not found');
    return ref;
  }

  async updateInvoiceReferenceStatus(
    user: CurrentUserPayload,
    id: string,
    status: 'RECORDED' | 'VERIFIED' | 'SENT_TO_FINANCE' | 'CANCELLED',
  ) {
    await this.getInvoiceReferenceById(user, id);

    const updated = await this.prisma.supplierInvoiceReference.update({
      where: { id },
      data: { status },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'SUPPLIER_INVOICE_REF_STATUS_UPDATED',
      resource: 'SupplierInvoiceReference',
      resourceId: id,
      details: { newStatus: status },
    });

    return updated;
  }

  private async generateReceiptNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.goodsReceipt.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `GRN-${year}-${seq}`;
  }

  private async generateInvoiceRefNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.supplierInvoiceReference.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `SINV-${year}-${seq}`;
  }
}
