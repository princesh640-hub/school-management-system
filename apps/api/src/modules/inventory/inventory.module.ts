// =============================================================================
// Phase 4L: Inventory Management Module
// =============================================================================
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InventoryController } from './inventory.controller';
import { InventoryCatalogService } from './inventory-catalog.service';
import { InventoryStockService } from './inventory-stock.service';
import { InventoryTransfersService } from './inventory-transfers.service';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';
import { InventoryReportsService } from './inventory-reports.service';

@Module({
  imports: [AuditModule],
  controllers: [InventoryController],
  providers: [
    InventoryCatalogService,
    InventoryStockService,
    InventoryTransfersService,
    InventoryAdjustmentsService,
    InventoryReportsService,
  ],
  exports: [
    InventoryCatalogService,
    InventoryStockService,
    InventoryTransfersService,
    InventoryAdjustmentsService,
    InventoryReportsService,
  ],
})
export class InventoryModule {}
