// =============================================================================
// Phase 4L: Inventory Adjustments & Stock Take Service
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
export class InventoryAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Manual Adjustments (Damage, Loss, Surplus, Scrap)
  // ---------------------------------------------------------------------------

  async recordAdjustment(user: CurrentUserPayload, dto: any) {
    const { storeId, itemId, movementType, quantity, reason, notes } = dto;

    if (!quantity || quantity <= 0) {
      throw new BadRequestException('Adjustment quantity must be greater than zero');
    }

    const validTypes = [
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'DAMAGE',
      'LOSS',
      'DISPOSAL',
      'RETURN',
    ];
    if (!validTypes.includes(movementType)) {
      throw new BadRequestException(`Invalid movement type '${movementType}' for adjustment`);
    }

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId: user.organizationId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, organizationId: user.organizationId },
    });
    if (!store) throw new NotFoundException('Store not found');

    const isNegative = ['ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'DISPOSAL'].includes(movementType);
    const balance = await this.prisma.inventoryBalance.findUnique({
      where: { storeId_itemId: { storeId, itemId } },
    });

    if (isNegative) {
      const available = balance ? Number(balance.quantityAvailable) : 0;
      if (available < quantity) {
        throw new BadRequestException(
          `Cannot adjust out ${quantity}. Available balance is only ${available}`,
        );
      }
    }

    const movementNumber = await this.generateMovementNumber(user.organizationId);
    const signedQty = isNegative ? -quantity : quantity;

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId: user.organizationId,
          movementNumber,
          itemId,
          storeId,
          movementType,
          quantity: new Prisma.Decimal(signedQty),
          unitCost: item.unitCost,
          totalCost: new Prisma.Decimal(signedQty).mul(item.unitCost),
          reference: `Adjustment: ${reason || movementType}`,
          notes,
          recordedBy: user.userId,
        },
      });

      await tx.inventoryBalance.upsert({
        where: { storeId_itemId: { storeId, itemId } },
        create: {
          storeId,
          itemId,
          quantityOnHand: new Prisma.Decimal(signedQty),
          quantityReserved: new Prisma.Decimal(0),
          quantityAvailable: new Prisma.Decimal(signedQty),
        },
        update: {
          quantityOnHand: { increment: new Prisma.Decimal(signedQty) },
          quantityAvailable: { increment: new Prisma.Decimal(signedQty) },
        },
      });

      await this.audit.log({
        userId: user.userId,
        organizationId: user.organizationId,
        action: 'INVENTORY_ADJUSTMENT_RECORDED',
        resource: 'InventoryMovement',
        resourceId: movement.id,
        details: { movementNumber, movementType, quantity: signedQty, reason },
      });

      return movement;
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Physical Stock Takes
  // ---------------------------------------------------------------------------

  async createStockTake(user: CurrentUserPayload, dto: any) {
    const { storeId, notes } = dto;
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, organizationId: user.organizationId },
    });
    if (!store) throw new NotFoundException('Store not found');

    const stockTakeNumber = await this.generateStockTakeNumber(user.organizationId);

    // Snapshot existing balances into initial lines
    const balances = await this.prisma.inventoryBalance.findMany({
      where: { storeId },
    });

    const stockTake = await this.prisma.stockTake.create({
      data: {
        organizationId: user.organizationId,
        stockTakeNumber,
        storeId,
        status: 'IN_PROGRESS',
        conductedBy: user.userId,
        notes,
        lines: {
          create: balances.map((b) => ({
            itemId: b.itemId,
            systemQuantity: b.quantityOnHand,
            countedQuantity: b.quantityOnHand,
            variance: new Prisma.Decimal(0),
          })),
        },
      },
      include: {
        store: true,
        lines: { include: { item: true } },
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'STOCK_TAKE_CREATED',
      resource: 'StockTake',
      resourceId: stockTake.id,
      details: { stockTakeNumber, storeId, lineCount: balances.length },
    });

    return stockTake;
  }

  async recordStockTakeCounts(user: CurrentUserPayload, id: string, dto: any) {
    const stockTake = await this.getStockTakeById(user, id);
    if (stockTake.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot record counts for stock take in status '${stockTake.status}'`);
    }

    const { lines } = dto;
    if (!lines || !Array.isArray(lines)) {
      throw new BadRequestException('Lines array required');
    }

    for (const count of lines) {
      const line = stockTake.lines.find((l) => l.itemId === count.itemId);
      if (line) {
        const variance = Number(count.countedQuantity) - Number(line.systemQuantity);
        await this.prisma.stockTakeLine.update({
          where: { id: line.id },
          data: {
            countedQuantity: new Prisma.Decimal(count.countedQuantity),
            variance: new Prisma.Decimal(variance),
            notes: count.notes,
          },
        });
      } else {
        // New item found not previously in balances
        const variance = Number(count.countedQuantity);
        await this.prisma.stockTakeLine.create({
          data: {
            stockTakeId: id,
            itemId: count.itemId,
            systemQuantity: new Prisma.Decimal(0),
            countedQuantity: new Prisma.Decimal(count.countedQuantity),
            variance: new Prisma.Decimal(variance),
            notes: count.notes,
          },
        });
      }
    }

    return this.getStockTakeById(user, id);
  }

  async reconcileStockTake(user: CurrentUserPayload, id: string) {
    const stockTake = await this.getStockTakeById(user, id);
    if (stockTake.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot reconcile stock take in status '${stockTake.status}'`);
    }

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      let count = await tx.inventoryMovement.count({
        where: { organizationId: user.organizationId },
      });

      for (const line of stockTake.lines) {
        const variance = Number(line.variance);
        if (variance !== 0) {
          count++;
          const movNum = `MOV-${year}-${String(count).padStart(5, '0')}`;
          const isSurplus = variance > 0;
          const movementType = isSurplus ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

          await tx.inventoryMovement.create({
            data: {
              organizationId: user.organizationId,
              movementNumber: movNum,
              itemId: line.itemId,
              storeId: stockTake.storeId,
              movementType,
              quantity: new Prisma.Decimal(variance),
              reference: `Stock Take: ${stockTake.stockTakeNumber}`,
              recordedBy: user.userId,
            },
          });

          await tx.inventoryBalance.upsert({
            where: {
              storeId_itemId: { storeId: stockTake.storeId, itemId: line.itemId },
            },
            create: {
              storeId: stockTake.storeId,
              itemId: line.itemId,
              quantityOnHand: line.countedQuantity,
              quantityReserved: new Prisma.Decimal(0),
              quantityAvailable: line.countedQuantity,
            },
            update: {
              quantityOnHand: { increment: line.variance },
              quantityAvailable: { increment: line.variance },
            },
          });
        }
      }

      const reconciled = await tx.stockTake.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          approvedBy: user.userId,
        },
        include: {
          store: true,
          lines: { include: { item: true } },
        },
      });

      return reconciled;
    });
  }

  async listStockTakes(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.status) where.status = filters.status;

    return this.prisma.stockTake.findMany({
      where,
      include: {
        store: true,
        lines: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStockTakeById(user: CurrentUserPayload, id: string) {
    const stockTake = await this.prisma.stockTake.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        store: true,
        lines: { include: { item: true } },
      },
    });
    if (!stockTake) throw new NotFoundException('Stock take not found');
    return stockTake;
  }

  private async generateMovementNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.inventoryMovement.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `MOV-${year}-${seq}`;
  }

  private async generateStockTakeNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.stockTake.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `STK-${year}-${seq}`;
  }
}
