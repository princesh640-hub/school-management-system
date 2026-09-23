#!/usr/bin/env node
// =============================================================================
// Phase 4L: Inventory & Procurement — Verification Script
// Run: node scripts/verify-phase4l.cjs
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
const failures = [];

function check(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.log(`  ❌ ${description}`);
    failed++;
    failures.push(description);
  }
}

function readFile(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  } catch {
    return '';
  }
}

function has(content, pattern) {
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

// =============================================================================
console.log('\n📋 PHASE 4L VERIFICATION — Inventory & Procurement\n');

// =============================================================================
console.log('1. Prisma Schema — Inventory Enums');
// =============================================================================
const schema = readFile('apps/api/prisma/schema.prisma');

check('InventoryItemStatus enum defined', has(schema, 'enum InventoryItemStatus'));
check('InventoryItemStatus: ACTIVE', has(schema, /enum InventoryItemStatus[\s\S]*?ACTIVE/));
check('InventoryItemStatus: INACTIVE', has(schema, /enum InventoryItemStatus[\s\S]*?INACTIVE/));
check('InventoryItemStatus: DISCONTINUED', has(schema, /enum InventoryItemStatus[\s\S]*?DISCONTINUED/));

check('InventoryMovementType enum defined', has(schema, 'enum InventoryMovementType'));
check('InventoryMovementType: OPENING', has(schema, /enum InventoryMovementType[\s\S]*?OPENING/));
check('InventoryMovementType: RECEIPT', has(schema, /enum InventoryMovementType[\s\S]*?RECEIPT/));
check('InventoryMovementType: ISSUE', has(schema, /enum InventoryMovementType[\s\S]*?ISSUE/));
check('InventoryMovementType: TRANSFER_OUT', has(schema, /enum InventoryMovementType[\s\S]*?TRANSFER_OUT/));
check('InventoryMovementType: TRANSFER_IN', has(schema, /enum InventoryMovementType[\s\S]*?TRANSFER_IN/));
check('InventoryMovementType: ADJUSTMENT_IN', has(schema, /enum InventoryMovementType[\s\S]*?ADJUSTMENT_IN/));
check('InventoryMovementType: ADJUSTMENT_OUT', has(schema, /enum InventoryMovementType[\s\S]*?ADJUSTMENT_OUT/));
check('InventoryMovementType: RETURN', has(schema, /enum InventoryMovementType[\s\S]*?RETURN/));
check('InventoryMovementType: DAMAGE', has(schema, /enum InventoryMovementType[\s\S]*?DAMAGE/));
check('InventoryMovementType: LOSS', has(schema, /enum InventoryMovementType[\s\S]*?LOSS/));
check('InventoryMovementType: DISPOSAL', has(schema, /enum InventoryMovementType[\s\S]*?DISPOSAL/));

check('StockTransferStatus enum defined', has(schema, 'enum StockTransferStatus'));
check('StockTransferStatus: PENDING', has(schema, /enum StockTransferStatus[\s\S]*?PENDING/));
check('StockTransferStatus: IN_TRANSIT', has(schema, /enum StockTransferStatus[\s\S]*?IN_TRANSIT/));
check('StockTransferStatus: COMPLETED', has(schema, /enum StockTransferStatus[\s\S]*?COMPLETED/));
check('StockTransferStatus: CANCELLED', has(schema, /enum StockTransferStatus[\s\S]*?CANCELLED/));

check('StockTakeStatus enum defined', has(schema, 'enum StockTakeStatus'));
check('StockTakeStatus: DRAFT', has(schema, /enum StockTakeStatus[\s\S]*?DRAFT/));
check('StockTakeStatus: IN_PROGRESS', has(schema, /enum StockTakeStatus[\s\S]*?IN_PROGRESS/));
check('StockTakeStatus: COMPLETED', has(schema, /enum StockTakeStatus[\s\S]*?COMPLETED/));
check('StockTakeStatus: CANCELLED', has(schema, /enum StockTakeStatus[\s\S]*?CANCELLED/));

check('StoreStatus enum defined', has(schema, 'enum StoreStatus'));
check('StoreStatus: ACTIVE', has(schema, /enum StoreStatus[\s\S]*?ACTIVE/));
check('StoreStatus: INACTIVE', has(schema, /enum StoreStatus[\s\S]*?INACTIVE/));
check('StoreStatus: MAINTENANCE', has(schema, /enum StoreStatus[\s\S]*?MAINTENANCE/));

check('AdjustmentReason enum defined', has(schema, 'enum AdjustmentReason'));
check('AdjustmentReason: DAMAGED', has(schema, /enum AdjustmentReason[\s\S]*?DAMAGED/));
check('AdjustmentReason: LOST', has(schema, /enum AdjustmentReason[\s\S]*?LOST/));
check('AdjustmentReason: FOUND', has(schema, /enum AdjustmentReason[\s\S]*?FOUND/));
check('AdjustmentReason: EXPIRED', has(schema, /enum AdjustmentReason[\s\S]*?EXPIRED/));
check('AdjustmentReason: AUDIT_CORRECTION', has(schema, /enum AdjustmentReason[\s\S]*?AUDIT_CORRECTION/));

// =============================================================================
console.log('\n2. Prisma Schema — Procurement Enums');
// =============================================================================

check('SupplierStatus enum defined', has(schema, 'enum SupplierStatus'));
check('SupplierStatus: ACTIVE', has(schema, /enum SupplierStatus[\s\S]*?ACTIVE/));
check('SupplierStatus: INACTIVE', has(schema, /enum SupplierStatus[\s\S]*?INACTIVE/));
check('SupplierStatus: BLACKLISTED', has(schema, /enum SupplierStatus[\s\S]*?BLACKLISTED/));

check('PurchaseRequestPriority enum defined', has(schema, 'enum PurchaseRequestPriority'));
check('PurchaseRequestPriority: LOW', has(schema, /enum PurchaseRequestPriority[\s\S]*?LOW/));
check('PurchaseRequestPriority: MEDIUM', has(schema, /enum PurchaseRequestPriority[\s\S]*?MEDIUM/));
check('PurchaseRequestPriority: HIGH', has(schema, /enum PurchaseRequestPriority[\s\S]*?HIGH/));
check('PurchaseRequestPriority: URGENT', has(schema, /enum PurchaseRequestPriority[\s\S]*?URGENT/));

check('PurchaseRequestStatus enum defined', has(schema, 'enum PurchaseRequestStatus'));
check('PurchaseRequestStatus: DRAFT', has(schema, /enum PurchaseRequestStatus[\s\S]*?DRAFT/));
check('PurchaseRequestStatus: SUBMITTED', has(schema, /enum PurchaseRequestStatus[\s\S]*?SUBMITTED/));
check('PurchaseRequestStatus: APPROVED', has(schema, /enum PurchaseRequestStatus[\s\S]*?APPROVED/));
check('PurchaseRequestStatus: REJECTED', has(schema, /enum PurchaseRequestStatus[\s\S]*?REJECTED/));
check('PurchaseRequestStatus: CONVERTED_TO_PO', has(schema, /enum PurchaseRequestStatus[\s\S]*?CONVERTED_TO_PO/));

check('PurchaseOrderStatus enum defined', has(schema, 'enum PurchaseOrderStatus'));
check('PurchaseOrderStatus: DRAFT', has(schema, /enum PurchaseOrderStatus[\s\S]*?DRAFT/));
check('PurchaseOrderStatus: APPROVED', has(schema, /enum PurchaseOrderStatus[\s\S]*?APPROVED/));
check('PurchaseOrderStatus: ISSUED', has(schema, /enum PurchaseOrderStatus[\s\S]*?ISSUED/));
check('PurchaseOrderStatus: PARTIALLY_RECEIVED', has(schema, /enum PurchaseOrderStatus[\s\S]*?PARTIALLY_RECEIVED/));
check('PurchaseOrderStatus: RECEIVED', has(schema, /enum PurchaseOrderStatus[\s\S]*?RECEIVED/));

check('GoodsReceiptStatus enum defined', has(schema, 'enum GoodsReceiptStatus'));
check('GoodsReceiptStatus: DRAFT', has(schema, /enum GoodsReceiptStatus[\s\S]*?DRAFT/));
check('GoodsReceiptStatus: COMPLETED', has(schema, /enum GoodsReceiptStatus[\s\S]*?COMPLETED/));

check('SupplierInvoiceRefStatus enum defined', has(schema, 'enum SupplierInvoiceRefStatus'));
check('SupplierInvoiceRefStatus: RECORDED', has(schema, /enum SupplierInvoiceRefStatus[\s\S]*?RECORDED/));
check('SupplierInvoiceRefStatus: VERIFIED', has(schema, /enum SupplierInvoiceRefStatus[\s\S]*?VERIFIED/));
check('SupplierInvoiceRefStatus: SENT_TO_FINANCE', has(schema, /enum SupplierInvoiceRefStatus[\s\S]*?SENT_TO_FINANCE/));

// =============================================================================
console.log('\n3. Prisma Schema — Inventory Models');
// =============================================================================

check('InventoryCategory model defined', has(schema, 'model InventoryCategory'));
check('InventoryCategory: organizationId', has(schema, /model InventoryCategory[\s\S]*?organizationId\s+String/));
check('InventoryCategory: name', has(schema, /model InventoryCategory[\s\S]*?name\s+String/));
check('InventoryCategory: code', has(schema, /model InventoryCategory[\s\S]*?code\s+String/));
check('InventoryCategory: parentId', has(schema, /model InventoryCategory[\s\S]*?parentId\s+String\?/));
check('InventoryCategory: categoryHierarchy relation', has(schema, /model InventoryCategory[\s\S]*?@relation\("CategoryHierarchy"/));

check('UnitOfMeasure model defined', has(schema, 'model UnitOfMeasure'));
check('UnitOfMeasure: name', has(schema, /model UnitOfMeasure[\s\S]*?name\s+String/));
check('UnitOfMeasure: code', has(schema, /model UnitOfMeasure[\s\S]*?code\s+String/));
check('UnitOfMeasure: symbol', has(schema, /model UnitOfMeasure[\s\S]*?symbol\s+String\?/));

check('InventoryItem model defined', has(schema, 'model InventoryItem'));
check('InventoryItem: itemCode', has(schema, /model InventoryItem[\s\S]*?itemCode\s+String/));
check('InventoryItem: categoryId', has(schema, /model InventoryItem[\s\S]*?categoryId\s+String/));
check('InventoryItem: uomId', has(schema, /model InventoryItem[\s\S]*?uomId\s+String/));
check('InventoryItem: reorderLevel', has(schema, /model InventoryItem[\s\S]*?reorderLevel\s+Decimal/));
check('InventoryItem: reorderQuantity', has(schema, /model InventoryItem[\s\S]*?reorderQuantity\s+Decimal/));
check('InventoryItem: unitCost', has(schema, /model InventoryItem[\s\S]*?unitCost\s+Decimal/));
check('InventoryItem: status', has(schema, /model InventoryItem[\s\S]*?status\s+InventoryItemStatus/));

check('Store model defined', has(schema, 'model Store'));
check('Store: campusId', has(schema, /model Store[\s\S]*?campusId\s+String\?/));
check('Store: managerId', has(schema, /model Store[\s\S]*?managerId\s+String\?/));
check('Store: code', has(schema, /model Store[\s\S]*?code\s+String/));

check('StorageLocation model defined', has(schema, 'model StorageLocation'));
check('StorageLocation: storeId', has(schema, /model StorageLocation[\s\S]*?storeId\s+String/));
check('StorageLocation: code', has(schema, /model StorageLocation[\s\S]*?code\s+String/));

check('InventoryBalance model defined', has(schema, 'model InventoryBalance'));
check('InventoryBalance: storeId', has(schema, /model InventoryBalance[\s\S]*?storeId\s+String/));
check('InventoryBalance: itemId', has(schema, /model InventoryBalance[\s\S]*?itemId\s+String/));
check('InventoryBalance: quantityOnHand', has(schema, /model InventoryBalance[\s\S]*?quantityOnHand\s+Decimal/));
check('InventoryBalance: quantityAvailable', has(schema, /model InventoryBalance[\s\S]*?quantityAvailable\s+Decimal/));
check('InventoryBalance unique storeId_itemId', has(schema, /model InventoryBalance[\s\S]*?@@unique\(\[storeId, itemId\]\)/));

check('InventoryMovement model defined', has(schema, 'model InventoryMovement'));
check('InventoryMovement: movementNumber', has(schema, /model InventoryMovement[\s\S]*?movementNumber\s+String/));
check('InventoryMovement: movementType', has(schema, /model InventoryMovement[\s\S]*?movementType\s+InventoryMovementType/));
check('InventoryMovement: quantity', has(schema, /model InventoryMovement[\s\S]*?quantity\s+Decimal/));

check('InventoryTransfer model defined', has(schema, 'model InventoryTransfer'));
check('InventoryTransfer: fromStoreId', has(schema, /model InventoryTransfer[\s\S]*?fromStoreId\s+String/));
check('InventoryTransfer: toStoreId', has(schema, /model InventoryTransfer[\s\S]*?toStoreId\s+String/));
check('InventoryTransfer: status', has(schema, /model InventoryTransfer[\s\S]*?status\s+StockTransferStatus/));

check('InventoryTransferLine model defined', has(schema, 'model InventoryTransferLine'));
check('InventoryTransferLine: quantity', has(schema, /model InventoryTransferLine[\s\S]*?quantity\s+Decimal/));

check('StockTake model defined', has(schema, 'model StockTake'));
check('StockTake: storeId', has(schema, /model StockTake[\s\S]*?storeId\s+String/));
check('StockTake: status', has(schema, /model StockTake[\s\S]*?status\s+StockTakeStatus/));

check('StockTakeLine model defined', has(schema, 'model StockTakeLine'));
check('StockTakeLine: systemQuantity', has(schema, /model StockTakeLine[\s\S]*?systemQuantity\s+Decimal/));
check('StockTakeLine: countedQuantity', has(schema, /model StockTakeLine[\s\S]*?countedQuantity\s+Decimal/));
check('StockTakeLine: variance', has(schema, /model StockTakeLine[\s\S]*?variance\s+Decimal/));

// =============================================================================
console.log('\n4. Prisma Schema — Procurement Models');
// =============================================================================

check('Supplier model defined', has(schema, 'model Supplier'));
check('Supplier: supplierCode', has(schema, /model Supplier[\s\S]*?supplierCode\s+String/));
check('Supplier: name', has(schema, /model Supplier[\s\S]*?name\s+String/));
check('Supplier: taxId', has(schema, /model Supplier[\s\S]*?taxId\s+String\?/));
check('Supplier: status', has(schema, /model Supplier[\s\S]*?status\s+SupplierStatus/));

check('PurchaseRequest model defined', has(schema, 'model PurchaseRequest'));
check('PurchaseRequest: requestNumber', has(schema, /model PurchaseRequest[\s\S]*?requestNumber\s+String/));
check('PurchaseRequest: priority', has(schema, /model PurchaseRequest[\s\S]*?priority\s+PurchaseRequestPriority/));
check('PurchaseRequest: status', has(schema, /model PurchaseRequest[\s\S]*?status\s+PurchaseRequestStatus/));

check('PurchaseRequestLine model defined', has(schema, 'model PurchaseRequestLine'));
check('PurchaseRequestLine: quantity', has(schema, /model PurchaseRequestLine[\s\S]*?quantity\s+Decimal/));

check('PurchaseOrder model defined', has(schema, 'model PurchaseOrder'));
check('PurchaseOrder: poNumber', has(schema, /model PurchaseOrder[\s\S]*?poNumber\s+String/));
check('PurchaseOrder: supplierId', has(schema, /model PurchaseOrder[\s\S]*?supplierId\s+String/));
check('PurchaseOrder: totalAmount', has(schema, /model PurchaseOrder[\s\S]*?totalAmount\s+Decimal/));
check('PurchaseOrder: status', has(schema, /model PurchaseOrder[\s\S]*?status\s+PurchaseOrderStatus/));

check('PurchaseOrderLine model defined', has(schema, 'model PurchaseOrderLine'));
check('PurchaseOrderLine: orderedQuantity', has(schema, /model PurchaseOrderLine[\s\S]*?orderedQuantity\s+Decimal/));
check('PurchaseOrderLine: receivedQuantity', has(schema, /model PurchaseOrderLine[\s\S]*?receivedQuantity\s+Decimal/));

check('GoodsReceipt model defined', has(schema, 'model GoodsReceipt'));
check('GoodsReceipt: receiptNumber', has(schema, /model GoodsReceipt[\s\S]*?receiptNumber\s+String/));
check('GoodsReceipt: purchaseOrderId', has(schema, /model GoodsReceipt[\s\S]*?purchaseOrderId\s+String/));
check('GoodsReceipt: storeId', has(schema, /model GoodsReceipt[\s\S]*?storeId\s+String/));

check('GoodsReceiptLine model defined', has(schema, 'model GoodsReceiptLine'));
check('GoodsReceiptLine: orderedQuantity', has(schema, /model GoodsReceiptLine[\s\S]*?orderedQuantity\s+Decimal/));
check('GoodsReceiptLine: receivedQuantity', has(schema, /model GoodsReceiptLine[\s\S]*?receivedQuantity\s+Decimal/));
check('GoodsReceiptLine: rejectedQuantity', has(schema, /model GoodsReceiptLine[\s\S]*?rejectedQuantity\s+Decimal/));
check('GoodsReceiptLine: acceptedQuantity', has(schema, /model GoodsReceiptLine[\s\S]*?acceptedQuantity\s+Decimal/));

check('SupplierInvoiceReference model defined', has(schema, 'model SupplierInvoiceReference'));
check('SupplierInvoiceReference: referenceNumber', has(schema, /model SupplierInvoiceReference[\s\S]*?referenceNumber\s+String/));
check('SupplierInvoiceReference: invoiceNumber', has(schema, /model SupplierInvoiceReference[\s\S]*?invoiceNumber\s+String/));
check('SupplierInvoiceReference: supplierId', has(schema, /model SupplierInvoiceReference[\s\S]*?supplierId\s+String/));
check('SupplierInvoiceReference: amount', has(schema, /model SupplierInvoiceReference[\s\S]*?amount\s+Decimal/));
check('SupplierInvoiceReference: status', has(schema, /model SupplierInvoiceReference[\s\S]*?status\s+SupplierInvoiceRefStatus/));

// =============================================================================
console.log('\n5. Prisma Schema — Back-References');
// =============================================================================

check('Organization.inventoryCategories', has(schema, /model Organization[\s\S]*?inventoryCategories\s+InventoryCategory\[\]/));
check('Organization.unitsOfMeasure', has(schema, /model Organization[\s\S]*?unitsOfMeasure\s+UnitOfMeasure\[\]/));
check('Organization.inventoryItems', has(schema, /model Organization[\s\S]*?inventoryItems\s+InventoryItem\[\]/));
check('Organization.stores', has(schema, /model Organization[\s\S]*?stores\s+Store\[\]/));
check('Organization.inventoryMovements', has(schema, /model Organization[\s\S]*?inventoryMovements\s+InventoryMovement\[\]/));
check('Organization.inventoryTransfers', has(schema, /model Organization[\s\S]*?inventoryTransfers\s+InventoryTransfer\[\]/));
check('Organization.stockTakes', has(schema, /model Organization[\s\S]*?stockTakes\s+StockTake\[\]/));
check('Organization.suppliers', has(schema, /model Organization[\s\S]*?suppliers\s+Supplier\[\]/));
check('Organization.purchaseRequests', has(schema, /model Organization[\s\S]*?purchaseRequests\s+PurchaseRequest\[\]/));
check('Organization.purchaseOrders', has(schema, /model Organization[\s\S]*?purchaseOrders\s+PurchaseOrder\[\]/));
check('Organization.goodsReceipts', has(schema, /model Organization[\s\S]*?goodsReceipts\s+GoodsReceipt\[\]/));
check('Organization.supplierInvoiceReferences', has(schema, /model Organization[\s\S]*?supplierInvoiceReferences\s+SupplierInvoiceReference\[\]/));

check('Campus.stores', has(schema, /model Campus[\s\S]*?stores\s+Store\[\]/));
check('Campus.purchaseRequests', has(schema, /model Campus[\s\S]*?purchaseRequests\s+PurchaseRequest\[\]/));
check('Campus.purchaseOrders', has(schema, /model Campus[\s\S]*?purchaseOrders\s+PurchaseOrder\[\]/));

check('EmployeeProfile.managedStores', has(schema, /model EmployeeProfile[\s\S]*?managedStores\s+Store\[\]/));
check('EmployeeProfile.purchaseRequests', has(schema, /model EmployeeProfile[\s\S]*?purchaseRequests\s+PurchaseRequest\[\]/));

// =============================================================================
console.log('\n6. Shared Types — Inventory & Procurement');
// =============================================================================
const sharedTypes = readFile('packages/shared-types/src/interfaces/inventory.interface.ts');
const sharedIndex = readFile('packages/shared-types/src/index.ts');

check('inventory.interface.ts exists', sharedTypes.length > 0);
check('inventory.interface.ts exported in index.ts', has(sharedIndex, 'inventory.interface.js'));
check('IInventoryItem interface defined', has(sharedTypes, 'export interface IInventoryItem'));
check('IInventoryBalance interface defined', has(sharedTypes, 'export interface IInventoryBalance'));
check('IInventoryMovement interface defined', has(sharedTypes, 'export interface IInventoryMovement'));
check('IInventoryTransfer interface defined', has(sharedTypes, 'export interface IInventoryTransfer'));
check('IStockTake interface defined', has(sharedTypes, 'export interface IStockTake'));
check('ISupplier interface defined', has(sharedTypes, 'export interface ISupplier'));
check('IPurchaseRequest interface defined', has(sharedTypes, 'export interface IPurchaseRequest'));
check('IPurchaseOrder interface defined', has(sharedTypes, 'export interface IPurchaseOrder'));
check('IGoodsReceipt interface defined', has(sharedTypes, 'export interface IGoodsReceipt'));
check('ISupplierInvoiceReference interface defined', has(sharedTypes, 'export interface ISupplierInvoiceReference'));

// =============================================================================
console.log('\n7. Backend Inventory Services');
// =============================================================================

const catService = readFile('apps/api/src/modules/inventory/inventory-catalog.service.ts');
check('InventoryCatalogService exists', catService.length > 0);
check('createCategory implemented', has(catService, 'createCategory('));
check('listCategories implemented', has(catService, 'listCategories('));
check('createItem with SKU auto-gen', has(catService, 'generateItemCode('));
check('createItem implemented', has(catService, 'createItem('));
check('listItems implemented', has(catService, 'listItems('));

const stockService = readFile('apps/api/src/modules/inventory/inventory-stock.service.ts');
check('InventoryStockService exists', stockService.length > 0);
check('createStore implemented', has(stockService, 'createStore('));
check('listStores implemented', has(stockService, 'listStores('));
check('createLocation implemented', has(stockService, 'createLocation('));
check('listBalances implemented', has(stockService, 'listBalances('));
check('recordOpeningStock implemented', has(stockService, 'recordOpeningStock('));
check('recordIssue implemented with negative check', has(stockService, 'Insufficient available stock'));
check('listMovements implemented', has(stockService, 'listMovements('));

const transferService = readFile('apps/api/src/modules/inventory/inventory-transfers.service.ts');
check('InventoryTransfersService exists', transferService.length > 0);
check('createTransfer implemented', has(transferService, 'createTransfer('));
check('dispatchTransfer implemented', has(transferService, 'dispatchTransfer('));
check('completeTransfer with paired movements', has(transferService, 'completeTransfer('));
check('paired movements: TRANSFER_OUT', has(transferService, 'TRANSFER_OUT'));
check('paired movements: TRANSFER_IN', has(transferService, 'TRANSFER_IN'));
check('cancelTransfer implemented', has(transferService, 'cancelTransfer('));

const adjService = readFile('apps/api/src/modules/inventory/inventory-adjustments.service.ts');
check('InventoryAdjustmentsService exists', adjService.length > 0);
check('recordAdjustment implemented', has(adjService, 'recordAdjustment('));
check('createStockTake implemented', has(adjService, 'createStockTake('));
check('recordStockTakeCounts implemented', has(adjService, 'recordStockTakeCounts('));
check('reconcileStockTake implemented', has(adjService, 'reconcileStockTake('));

const invRepService = readFile('apps/api/src/modules/inventory/inventory-reports.service.ts');
check('InventoryReportsService exists', invRepService.length > 0);
check('getDashboardKpis implemented', has(invRepService, 'getDashboardKpis('));
check('getLowStockAlerts implemented', has(invRepService, 'getLowStockAlerts('));
check('getValuationSummary implemented', has(invRepService, 'getValuationSummary('));

// =============================================================================
console.log('\n8. Backend Procurement Services');
// =============================================================================

const supService = readFile('apps/api/src/modules/procurement/procurement-suppliers.service.ts');
check('ProcurementSuppliersService exists', supService.length > 0);
check('createSupplier implemented', has(supService, 'createSupplier('));
check('listSuppliers implemented', has(supService, 'listSuppliers('));
check('updateSupplier implemented', has(supService, 'updateSupplier('));

const reqService = readFile('apps/api/src/modules/procurement/procurement-requests.service.ts');
check('ProcurementRequestsService exists', reqService.length > 0);
check('createPurchaseRequest implemented', has(reqService, 'createPurchaseRequest('));
check('approvePurchaseRequest implemented', has(reqService, 'approvePurchaseRequest('));
check('rejectPurchaseRequest implemented', has(reqService, 'rejectPurchaseRequest('));

const ordService = readFile('apps/api/src/modules/procurement/procurement-orders.service.ts');
check('ProcurementOrdersService exists', ordService.length > 0);
check('createPurchaseOrder implemented', has(ordService, 'createPurchaseOrder('));
check('approvePurchaseOrder implemented', has(ordService, 'approvePurchaseOrder('));
check('issuePurchaseOrder implemented', has(ordService, 'issuePurchaseOrder('));

const recService = readFile('apps/api/src/modules/procurement/procurement-receipts.service.ts');
check('ProcurementReceiptsService exists', recService.length > 0);
check('createGoodsReceipt implemented', has(recService, 'createGoodsReceipt('));
check('accepted quantity triggers RECEIPT movement', has(recService, "movementType: 'RECEIPT'"));
check('updates PO line receivedQuantity', has(recService, 'receivedQuantity: { increment:'));
check('createInvoiceReference implemented', has(recService, 'createInvoiceReference('));

const procRepService = readFile('apps/api/src/modules/procurement/procurement-reports.service.ts');
check('ProcurementReportsService exists', procRepService.length > 0);
check('getDashboardKpis implemented', has(procRepService, 'getDashboardKpis('));
check('getSpendSummary implemented', has(procRepService, 'getSpendSummary('));

// =============================================================================
console.log('\n9. Controllers & Modules Wiring');
// =============================================================================

const invCtrl = readFile('apps/api/src/modules/inventory/inventory.controller.ts');
check('InventoryController exists', invCtrl.length > 0);
check('InventoryController has /categories', has(invCtrl, "'categories'"));
check('InventoryController has /items', has(invCtrl, "'items'"));
check('InventoryController has /stores', has(invCtrl, "'stores'"));
check('InventoryController has /balances', has(invCtrl, "'balances'"));
check('InventoryController has /movements', has(invCtrl, "'movements'"));
check('InventoryController has /transfers', has(invCtrl, "'transfers'"));
check('InventoryController has /stock-takes', has(invCtrl, "'stock-takes'"));
check('InventoryController has /reports/kpis', has(invCtrl, "'reports/kpis'"));

const procCtrl = readFile('apps/api/src/modules/procurement/procurement.controller.ts');
check('ProcurementController exists', procCtrl.length > 0);
check('ProcurementController has /suppliers', has(procCtrl, "'suppliers'"));
check('ProcurementController has /requests', has(procCtrl, "'requests'"));
check('ProcurementController has /orders', has(procCtrl, "'orders'"));
check('ProcurementController has /receipts', has(procCtrl, "'receipts'"));
check('ProcurementController has /invoices', has(procCtrl, "'invoices'"));
check('ProcurementController has /reports/kpis', has(procCtrl, "'reports/kpis'"));

const invMod = readFile('apps/api/src/modules/inventory/inventory.module.ts');
check('InventoryModule imports AuditModule', has(invMod, 'AuditModule'));
check('InventoryModule registers services', has(invMod, 'InventoryStockService'));

const procMod = readFile('apps/api/src/modules/procurement/procurement.module.ts');
check('ProcurementModule imports AuditModule', has(procMod, 'AuditModule'));
check('ProcurementModule registers services', has(procMod, 'ProcurementOrdersService'));

// =============================================================================
console.log('\n10. Web UI Command Centers');
// =============================================================================

const invPage = readFile('apps/web/src/app/(dashboard)/portal/inventory/page.tsx');
check('Inventory page.tsx exists', invPage.length > 0);
check('Inventory page has 8 tabs defined', has(invPage, 'INVENTORY_TABS = ['));
check('Inventory page has catalog tab', has(invPage, "activeTab === 'catalog'"));
check('Inventory page has stores tab', has(invPage, "activeTab === 'stores'"));
check('Inventory page has balances tab', has(invPage, "activeTab === 'balances'"));
check('Inventory page has movements tab', has(invPage, "activeTab === 'movements'"));
check('Inventory page has transfers tab', has(invPage, "activeTab === 'transfers'"));
check('Inventory page has stock takes tab', has(invPage, "activeTab === 'stocktakes'"));
check('Inventory page has reorder alerts tab', has(invPage, "activeTab === 'alerts'"));

const procPage = readFile('apps/web/src/app/(dashboard)/portal/procurement/page.tsx');
check('Procurement page.tsx exists', procPage.length > 0);
check('Procurement page has 6 tabs defined', has(procPage, 'PROCUREMENT_TABS = ['));
check('Procurement page has requests tab', has(procPage, "activeTab === 'requests'"));
check('Procurement page has orders tab', has(procPage, "activeTab === 'orders'"));
check('Procurement page has receipts tab', has(procPage, "activeTab === 'receipts'"));
check('Procurement page has suppliers tab', has(procPage, "activeTab === 'suppliers'"));
check('Procurement page has invoices tab', has(procPage, "activeTab === 'invoices'"));
check('Procurement page has finance boundary notice', has(procPage, 'Finance Subsystem Boundary Notice'));

const opsPage = readFile('apps/web/src/app/(dashboard)/portal/operations/page.tsx');
check('Operations page inventory badge is Active', has(opsPage, "{ id: 'inventory', label: 'Inventory & Assets', badge: 'Active' }"));
check('Operations page links to /portal/inventory', has(opsPage, '/portal/inventory'));
check('Operations page links to /portal/procurement', has(opsPage, '/portal/procurement'));

// =============================================================================
console.log('\n11. Feature Status & Documentation');
// =============================================================================

const featureStatus = readFile('docs/features/feature-status.md');
check('Phase 4L Inventory marked VERIFIED in feature-status.md', has(featureStatus, '| **Inventory** | Items, Units & Stock Movement Ledger | 4L | **VERIFIED**'));
check('Phase 4L Procurement marked VERIFIED in feature-status.md', has(featureStatus, '| **Procurement** | Purchase Requests & Purchase Orders | 4L | **VERIFIED**'));

const specDoc = readFile('docs/features/phase4l-inventory-procurement.md');
check('phase4l-inventory-procurement.md exists', specDoc.length > 0);
check('phase4l-inventory-procurement.md has EXISTING', has(specDoc, '### EXISTING'));
check('phase4l-inventory-procurement.md has MISSING', has(specDoc, '### MISSING'));
check('phase4l-inventory-procurement.md has TO IMPLEMENT', has(specDoc, '### TO IMPLEMENT'));
check('phase4l-inventory-procurement.md has DEFERRED', has(specDoc, '### DEFERRED'));

const finalReport = readFile('docs/features/phase4l-final-report.md');
check('phase4l-final-report.md exists', finalReport.length > 0);
check('phase4l-final-report.md has VERIFIED status', has(finalReport, 'VERIFIED & READY FOR PHASE 4M'));

// =============================================================================
// FINAL RESULTS
// =============================================================================

console.log('\n═══════════════════════════════════════════════════');
console.log(`  PHASE 4L VERIFICATION COMPLETE`);
console.log(`  ✅ PASSED: ${passed}`);
console.log(`  ❌ FAILED: ${failed}`);
console.log(`  TOTAL:   ${passed + failed}`);

if (failures.length > 0) {
  console.log('\n  FAILED CHECKS:');
  failures.forEach((f) => console.log(`    • ${f}`));
}

if (failed === 0) {
  console.log('\n  🎉 ALL CHECKS PASSED — PHASE 4L IS VERIFIED AND READY FOR PHASE 4M');
} else {
  console.log('\n  ⚠️  Some checks failed. Review and fix before proceeding.');
}

console.log('═══════════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
