// =============================================================================
// Phase 4L: Inventory Transfers Service (Inter-Store Movements)
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
export class InventoryTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createTransfer(user: CurrentUserPayload, dto: any) {
    const { fromStoreId, toStoreId, notes, lines } = dto;

    if (fromStoreId === toStoreId) {
      throw new BadRequestException('Source and destination stores must be different');
    }
    if (!lines || lines.length === 0) {
      throw new BadRequestException('Transfer must contain at least one line item');
    }

    const fromStore = await this.prisma.store.findFirst({
      where: { id: fromStoreId, organizationId: user.organizationId },
    });
    const toStore = await this.prisma.store.findFirst({
      where: { id: toStoreId, organizationId: user.organizationId },
    });
    if (!fromStore || !toStore) {
      throw new BadRequestException('Invalid source or destination store');
    }

    const transferNumber = await this.generateTransferNumber(user.organizationId);

    const transfer = await this.prisma.inventoryTransfer.create({
      data: {
        organizationId: user.organizationId,
        transferNumber,
        fromStoreId,
        toStoreId,
        status: 'PENDING',
        requestedBy: user.userId,
        notes,
        lines: {
          create: lines.map((l: any) => ({
            itemId: l.itemId,
            quantity: new Prisma.Decimal(l.quantity),
            notes: l.notes,
          })),
        },
      },
      include: {
        fromStore: true,
        toStore: true,
        lines: { include: { item: true } },
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'STOCK_TRANSFER_CREATED',
      resource: 'InventoryTransfer',
      resourceId: transfer.id,
      details: { transferNumber, fromStoreId, toStoreId, lineCount: lines.length },
    });

    return transfer;
  }

  async listTransfers(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.fromStoreId) where.fromStoreId = filters.fromStoreId;
    if (filters.toStoreId) where.toStoreId = filters.toStoreId;

    return this.prisma.inventoryTransfer.findMany({
      where,
      include: {
        fromStore: true,
        toStore: true,
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransferById(user: CurrentUserPayload, id: string) {
    const transfer = await this.prisma.inventoryTransfer.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        fromStore: true,
        toStore: true,
        lines: { include: { item: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }

  async dispatchTransfer(user: CurrentUserPayload, id: string) {
    const transfer = await this.getTransferById(user, id);
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`Cannot dispatch transfer in status '${transfer.status}'`);
    }

    const updated = await this.prisma.inventoryTransfer.update({
      where: { id },
      data: { status: 'IN_TRANSIT' },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'STOCK_TRANSFER_DISPATCHED',
      resource: 'InventoryTransfer',
      resourceId: id,
      details: { transferNumber: transfer.transferNumber },
    });

    return updated;
  }

  async completeTransfer(user: CurrentUserPayload, id: string) {
    const transfer = await this.getTransferById(user, id);
    if (transfer.status !== 'PENDING' && transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException(`Cannot complete transfer in status '${transfer.status}'`);
    }

    // Verify stock availability in fromStore
    for (const line of transfer.lines) {
      const balance = await this.prisma.inventoryBalance.findUnique({
        where: {
          storeId_itemId: { storeId: transfer.fromStoreId, itemId: line.itemId },
        },
      });
      const available = balance ? Number(balance.quantityAvailable) : 0;
      if (available < Number(line.quantity)) {
        throw new BadRequestException(
          `Insufficient stock in source store for item ${line.itemId}. Available: ${available}, Required: ${line.quantity}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      let count = await tx.inventoryMovement.count({
        where: { organizationId: user.organizationId },
      });

      // 1. For each line, create paired movements and update balances
      for (const line of transfer.lines) {
        count++;
        const outMovNum = `MOV-${year}-${String(count).padStart(5, '0')}`;
        count++;
        const inMovNum = `MOV-${year}-${String(count).padStart(5, '0')}`;

        // Movement OUT
        await tx.inventoryMovement.create({
          data: {
            organizationId: user.organizationId,
            movementNumber: outMovNum,
            itemId: line.itemId,
            storeId: transfer.fromStoreId,
            movementType: 'TRANSFER_OUT',
            quantity: new Prisma.Decimal(-Number(line.quantity)),
            reference: `Transfer ${transfer.transferNumber}`,
            recordedBy: user.userId,
          },
        });

        // Decrement source store balance
        await tx.inventoryBalance.update({
          where: {
            storeId_itemId: { storeId: transfer.fromStoreId, itemId: line.itemId },
          },
          data: {
            quantityOnHand: { decrement: line.quantity },
            quantityAvailable: { decrement: line.quantity },
          },
        });

        // Movement IN
        await tx.inventoryMovement.create({
          data: {
            organizationId: user.organizationId,
            movementNumber: inMovNum,
            itemId: line.itemId,
            storeId: transfer.toStoreId,
            movementType: 'TRANSFER_IN',
            quantity: line.quantity,
            reference: `Transfer ${transfer.transferNumber}`,
            recordedBy: user.userId,
          },
        });

        // Upsert destination store balance
        await tx.inventoryBalance.upsert({
          where: {
            storeId_itemId: { storeId: transfer.toStoreId, itemId: line.itemId },
          },
          create: {
            storeId: transfer.toStoreId,
            itemId: line.itemId,
            quantityOnHand: line.quantity,
            quantityReserved: new Prisma.Decimal(0),
            quantityAvailable: line.quantity,
          },
          update: {
            quantityOnHand: { increment: line.quantity },
            quantityAvailable: { increment: line.quantity },
          },
        });
      }

      // Update transfer status
      const completed = await tx.inventoryTransfer.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          approvedBy: user.userId,
        },
      });

      return completed;
    });
  }

  async cancelTransfer(user: CurrentUserPayload, id: string) {
    const transfer = await this.getTransferById(user, id);
    if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel transfer in status '${transfer.status}'`);
    }

    const cancelled = await this.prisma.inventoryTransfer.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'STOCK_TRANSFER_CANCELLED',
      resource: 'InventoryTransfer',
      resourceId: id,
      details: { transferNumber: transfer.transferNumber },
    });

    return cancelled;
  }

  private async generateTransferNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.inventoryTransfer.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `TRF-${year}-${seq}`;
  }
}
