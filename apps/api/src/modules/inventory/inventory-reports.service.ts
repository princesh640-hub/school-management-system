// =============================================================================
// Phase 4L: Inventory Reports & Dashboard Service
// =============================================================================
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class InventoryReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardKpis(user: CurrentUserPayload) {
    const orgId = user.organizationId;

    const [
      totalItems,
      activeItems,
      totalStores,
      totalLocations,
      balances,
      activeTransfersCount,
      pendingStockTakesCount,
      recentMovementsCount,
    ] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { organizationId: orgId } }),
      this.prisma.inventoryItem.count({
        where: { organizationId: orgId, status: 'ACTIVE' },
      }),
      this.prisma.store.count({ where: { organizationId: orgId } }),
      this.prisma.storageLocation.count({
        where: { store: { organizationId: orgId } },
      }),
      this.prisma.inventoryBalance.findMany({
        where: { store: { organizationId: orgId } },
        include: { item: true },
      }),
      this.prisma.inventoryTransfer.count({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING', 'IN_TRANSIT'] },
        },
      }),
      this.prisma.stockTake.count({
        where: {
          organizationId: orgId,
          status: { in: ['DRAFT', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.inventoryMovement.count({
        where: { organizationId: orgId },
      }),
    ]);

    let totalValuation = 0;
    let outOfStockItemsCount = 0;

    for (const b of balances) {
      const qty = Number(b.quantityOnHand);
      const unitCost = Number(b.item?.unitCost ?? 0);
      totalValuation += qty * unitCost;
      if (qty <= 0) outOfStockItemsCount++;
    }

    // Low stock items: items whose total on hand across all stores <= reorderLevel
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      include: { balances: true },
    });

    let lowStockItemsCount = 0;
    for (const item of items) {
      const totalStock = item.balances.reduce(
        (sum, b) => sum + Number(b.quantityOnHand),
        0,
      );
      if (totalStock <= Number(item.reorderLevel) && Number(item.reorderLevel) > 0) {
        lowStockItemsCount++;
      }
    }

    return {
      totalItems,
      activeItems,
      totalStores,
      totalLocations,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockItemsCount,
      outOfStockItemsCount,
      recentMovementsCount,
      activeTransfersCount,
      pendingStockTakesCount,
    };
  }

  async getLowStockAlerts(user: CurrentUserPayload) {
    const orgId = user.organizationId;
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      include: {
        category: true,
        uom: true,
        balances: { include: { store: true } },
      },
    });

    const alerts = [];
    for (const item of items) {
      const totalStock = item.balances.reduce(
        (sum, b) => sum + Number(b.quantityOnHand),
        0,
      );
      const reorderLevel = Number(item.reorderLevel);

      if (totalStock <= reorderLevel) {
        alerts.push({
          itemId: item.id,
          itemCode: item.itemCode,
          name: item.name,
          categoryName: item.category?.name,
          uomSymbol: item.uom?.symbol || item.uom?.name,
          reorderLevel,
          currentStock: totalStock,
          reorderQuantity: Number(item.reorderQuantity),
          deficit: Math.max(0, reorderLevel - totalStock),
        });
      }
    }

    return alerts.sort((a, b) => b.deficit - a.deficit);
  }

  async getValuationSummary(user: CurrentUserPayload) {
    const orgId = user.organizationId;
    const stores = await this.prisma.store.findMany({
      where: { organizationId: orgId },
      include: {
        balances: {
          include: { item: true },
        },
      },
    });

    let overallValuation = 0;
    let overallItemsCount = 0;

    const storeBreakdown = stores.map((store) => {
      let storeValuation = 0;
      for (const b of store.balances) {
        const qty = Number(b.quantityOnHand);
        const cost = Number(b.item?.unitCost ?? 0);
        storeValuation += qty * cost;
      }
      overallValuation += storeValuation;
      overallItemsCount += store.balances.length;

      return {
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        itemCount: store.balances.length,
        valuation: Math.round(storeValuation * 100) / 100,
      };
    });

    return {
      totalItems: overallItemsCount,
      totalValuation: Math.round(overallValuation * 100) / 100,
      storeBreakdown,
    };
  }
}
