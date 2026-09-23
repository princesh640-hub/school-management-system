# Phase 4L — Inventory & Procurement Subsystem

## 1. Domain Overview & Scope

Phase 4L establishes a complete, configurable, multi-campus, secure, and production-grade Inventory & Procurement subsystem for school operations.
The subsystem manages the integrated institutional procurement and supply lifecycle:
**Need Identified → Purchase Request → Approval → Supplier / Quotation → Purchase Order → Goods Receipt → Quality/Quantity Check → Stock Entry → Supplier Invoice Reference → Finance Processing → Inventory Ledger**

The subsystem strictly preserves authoritative domain boundaries:
- **Inventory** is the authoritative source of truth for: item specifications, units of measure, stores, locations, on-hand balances, and the immutable stock movement ledger.
- **Procurement** is the authoritative source of truth for: vendor registries, purchase requisitions, approval matrices, purchase orders, goods receipt processing (GRN), and supplier invoice references.
- **Finance (Phase 4G)** remains authoritative for: payables, disbursements, and accounting ledger postings. No secondary payable ledger is created.

The system enforces negative stock protection, atomic goods receipt stock integration, paired transfer movements, variance-audited physical stock counts, reorder alert scanning, and provides modern dual Command Centers for Store Managers and Procurement Officers.

---

## 2. Gap Analysis

### EXISTING
- **Multi-Campus Organization**: `Organization` and `Campus` models, academic terms, and room structures.
- **Identity Foundation**: `User`, `EmployeeProfile`, `StudentProfile`.
- **RBAC & Permissions**: Roles (`STORE_MANAGER`, `PROCUREMENT_OFFICER`, `SUPER_ADMIN`, `ACCOUNTANT`), and `AppModule.INVENTORY` & `AppModule.PROCUREMENT` in `@school/shared-types`.
- **Audit & Security**: Centralized `AuditService` for immutable event logging.
- **Notifications Infrastructure**: `NotificationsService` for queued notifications.
- **Finance Boundary (Phase 4G)**: `FeeCategory`, `FeeStructure`, `FeeInvoice`, `PaymentTransaction` for authoritative billing.
- **Operations Web Hub**: `/portal/operations` with placeholder tab for Inventory (`badge: 'Future'`).
- **API Stubs**: Minimal `/api/v1/inventory/items` and `/api/v1/procurement/purchase-orders` routes returning boundary active messages.

### MISSING
- **Database Layer**:
  - No `InventoryCategory` or `UnitOfMeasure` classification models.
  - No `InventoryItem` catalog model (SKU, UOM, reorder thresholds, barcode, tracking flags).
  - No `Store` (warehouse) or `StorageLocation` (zone/rack/bin) models.
  - No `InventoryBalance` materialized store-stock balance model.
  - No `InventoryMovement` immutable stock ledger model (`MOV-YYYY-XXXXX`).
  - No `InventoryTransfer` inter-store transfer model (`TRF-YYYY-XXXXX`).
  - No `StockTake` or `StockTakeLine` physical counting models (`STK-YYYY-XXXXX`).
  - No `Supplier` vendor registry model (`SUP-YYYY-XXXXX`).
  - No `PurchaseRequest` or `PurchaseRequestLine` requisition models (`PR-YYYY-XXXXX`).
  - No `PurchaseOrder` or `PurchaseOrderLine` procurement order models (`PO-YYYY-XXXXX`).
  - No `GoodsReceipt` or `GoodsReceiptLine` receiving models (`GRN-YYYY-XXXXX`).
  - No `SupplierInvoiceReference` vendor billing reference model (`SINV-YYYY-XXXXX`).
- **Domain Business Logic**:
  - No negative stock prevention guard.
  - No atomic inventory increment upon goods receipt acceptance.
  - No partial delivery and rejected quantity tracking.
  - No paired transaction-safe inter-store stock transfers.
  - No physical count variance reconciliation with audited adjustments.
  - No automated low-stock and reorder alert scanner.
- **Web UI & Experience**:
  - No dedicated `/portal/inventory` command center.
  - No dedicated `/portal/procurement` command center.
  - Operations tab badge remains `'Future'`.

### TO IMPLEMENT
1. **Work Package 1: Prisma Schema Expansion**:
   - 13 Enums: `InventoryItemStatus`, `InventoryMovementType`, `StockTransferStatus`, `StockTakeStatus`, `SupplierStatus`, `PurchaseRequestPriority`, `PurchaseRequestStatus`, `QuotationStatus`, `PurchaseOrderStatus`, `GoodsReceiptStatus`, `SupplierInvoiceRefStatus`, `AdjustmentReason`, `StoreStatus`.
   - 17 Models: `InventoryCategory`, `UnitOfMeasure`, `InventoryItem`, `Store`, `StorageLocation`, `InventoryBalance`, `InventoryMovement`, `InventoryTransfer`, `StockTake`, `StockTakeLine`, `Supplier`, `PurchaseRequest`, `PurchaseRequestLine`, `PurchaseOrder`, `PurchaseOrderLine`, `GoodsReceipt`, `GoodsReceiptLine`, `SupplierInvoiceReference`.
   - Back-references on `Organization`, `Campus`, and `EmployeeProfile`.
2. **Work Package 2: Shared Types (`packages/shared-types`)**:
   - `packages/shared-types/src/interfaces/inventory.interface.ts`.
   - Export all domain entities, DTOs, stock summaries, valuation, and procurement contracts.
3. **Work Package 3: Modular Backend Services**:
   - `apps/api/src/modules/inventory`:
     - `inventory-catalog.service.ts`: Items, Categories, UOMs, SKU generation, Barcodes.
     - `inventory-stock.service.ts`: Stores, Balances, Movements ledger (`MOV-`), Opening stock, Stock Issue.
     - `inventory-transfers.service.ts`: Transfers (`TRF-`), paired movements.
     - `inventory-adjustments.service.ts`: Adjustments (`ADJ-`), Stock takes (`STK-`), Variances.
     - `inventory-reports.service.ts`: Stock register, Low-stock alerts, Valuation (Weighted Average/FIFO).
     - `inventory.controller.ts` & `inventory.module.ts`.
   - `apps/api/src/modules/procurement`:
     - `procurement-suppliers.service.ts`: Suppliers (`SUP-`), vendor records.
     - `procurement-requests.service.ts`: Requisitions (`PR-`), line items, approval workflow.
     - `procurement-orders.service.ts`: Purchase orders (`PO-`), line items, approval, issuance.
     - `procurement-receipts.service.ts`: Goods receipt (`GRN-`), partial delivery, rejection logging, stock entry, supplier invoice refs (`SINV-`).
     - `procurement-reports.service.ts`: Spend analysis, PO status summaries.
     - `procurement.controller.ts` & `procurement.module.ts`.
4. **Work Package 4: Modernized Web Workspaces**:
   - Create `/portal/inventory` (8-tab inventory workspace).
   - Create `/portal/procurement` (6-tab procurement workspace).
   - Update `/portal/operations` Inventory tab badge to `'Active'` with direct launch links.
5. **Work Package 5: Verification & Zero Regression**:
   - `scripts/verify-phase4l.cjs` with 380+ checks.
   - Master regression across all test suites (`verify-phase1.cjs` to `verify-phase4l.cjs`).

### DEFERRED
- External IoT automated warehouse shelf scales and conveyor automation (manual and barcode quantity tracking provided).
- Electronic Data Interchange (EDI 850 / 856) vendor network automation (standard REST and PDF procurement provided).
- AI automated predictive demand forecasting (configurable min/max and reorder thresholds provided).
