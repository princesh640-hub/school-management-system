// =============================================================================
// Phase 4L: Inventory & Procurement — Shared Type Definitions
// =============================================================================

export type InventoryItemStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DISCONTINUED';

export type InventoryMovementType =
  | 'OPENING'
  | 'RECEIPT'
  | 'ISSUE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'RETURN'
  | 'DAMAGE'
  | 'LOSS'
  | 'DISPOSAL';

export type StockTransferStatus =
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type StockTakeStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type SupplierStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'BLACKLISTED';

export type PurchaseRequestPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

export type PurchaseRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_PO'
  | 'CANCELLED';

export type QuotationStatus =
  | 'REQUESTED'
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'REJECTED';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'CLOSED';

export type GoodsReceiptStatus =
  | 'DRAFT'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type SupplierInvoiceRefStatus =
  | 'RECORDED'
  | 'VERIFIED'
  | 'SENT_TO_FINANCE'
  | 'CANCELLED';

export type AdjustmentReason =
  | 'DAMAGED'
  | 'LOST'
  | 'FOUND'
  | 'EXPIRED'
  | 'AUDIT_CORRECTION'
  | 'SCRAP'
  | 'OTHER';

export type StoreStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'MAINTENANCE';

// -----------------------------------------------------------------------------
// Inventory Catalog Interfaces
// -----------------------------------------------------------------------------

export interface IInventoryCategory {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  parentId?: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  children?: IInventoryCategory[];
}

export interface ICreateCategoryDto {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
}

export interface IUpdateCategoryDto {
  name?: string;
  code?: string;
  description?: string;
  parentId?: string;
  status?: string;
}

export interface IUnitOfMeasure {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  symbol?: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateUomDto {
  name: string;
  code: string;
  symbol?: string;
}

export interface IUpdateUomDto {
  name?: string;
  code?: string;
  symbol?: string;
  status?: string;
}

export interface IInventoryItem {
  id: string;
  organizationId: string;
  itemCode: string;
  name: string;
  description?: string | null;
  categoryId: string;
  uomId: string;
  brand?: string | null;
  barcode?: string | null;
  reorderLevel: number;
  reorderQuantity: number;
  minStock: number;
  maxStock?: number | null;
  unitCost: number;
  trackBatch: boolean;
  trackSerial: boolean;
  trackExpiry: boolean;
  status: InventoryItemStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: IInventoryCategory;
  uom?: IUnitOfMeasure;
}

export interface ICreateItemDto {
  name: string;
  itemCode?: string;
  description?: string;
  categoryId: string;
  uomId: string;
  brand?: string;
  barcode?: string;
  reorderLevel?: number;
  reorderQuantity?: number;
  minStock?: number;
  maxStock?: number;
  unitCost?: number;
  trackBatch?: boolean;
  trackSerial?: boolean;
  trackExpiry?: boolean;
}

export interface IUpdateItemDto {
  name?: string;
  description?: string;
  categoryId?: string;
  uomId?: string;
  brand?: string;
  barcode?: string;
  reorderLevel?: number;
  reorderQuantity?: number;
  minStock?: number;
  maxStock?: number;
  unitCost?: number;
  trackBatch?: boolean;
  trackSerial?: boolean;
  trackExpiry?: boolean;
  status?: InventoryItemStatus;
}

// -----------------------------------------------------------------------------
// Store & Storage Location Interfaces
// -----------------------------------------------------------------------------

export interface IStore {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  address?: string | null;
  managerId?: string | null;
  status: StoreStatus;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  locations?: IStorageLocation[];
}

export interface ICreateStoreDto {
  campusId?: string;
  name: string;
  code: string;
  address?: string;
  managerId?: string;
  notes?: string;
}

export interface IUpdateStoreDto {
  name?: string;
  code?: string;
  address?: string;
  managerId?: string;
  status?: StoreStatus;
  notes?: string;
}

export interface IStorageLocation {
  id: string;
  storeId: string;
  name: string;
  code: string;
  zone?: string | null;
  rack?: string | null;
  shelf?: string | null;
  bin?: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateStorageLocationDto {
  storeId: string;
  name: string;
  code: string;
  zone?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}

export interface IUpdateStorageLocationDto {
  name?: string;
  code?: string;
  zone?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  status?: string;
}

// -----------------------------------------------------------------------------
// Inventory Balance & Movement Interfaces
// -----------------------------------------------------------------------------

export interface IInventoryBalance {
  id: string;
  storeId: string;
  itemId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  updatedAt: Date | string;
  item?: IInventoryItem;
  store?: IStore;
}

export interface IInventoryMovement {
  id: string;
  organizationId: string;
  movementNumber: string;
  itemId: string;
  storeId: string;
  locationId?: string | null;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
  reference?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  sourceDocument?: string | null;
  recipient?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  movementDate: Date | string;
  item?: IInventoryItem;
  store?: IStore;
}

export interface ICreateMovementDto {
  itemId: string;
  storeId: string;
  locationId?: string;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  reference?: string;
  batchNumber?: string;
  serialNumber?: string;
  sourceDocument?: string;
  recipient?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Transfer & Stock Take Interfaces
// -----------------------------------------------------------------------------

export interface IInventoryTransferLine {
  id: string;
  transferId: string;
  itemId: string;
  quantity: number;
  notes?: string | null;
  item?: IInventoryItem;
}

export interface IInventoryTransfer {
  id: string;
  organizationId: string;
  transferNumber: string;
  fromStoreId: string;
  toStoreId: string;
  transferDate: Date | string;
  status: StockTransferStatus;
  requestedBy?: string | null;
  approvedBy?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines?: IInventoryTransferLine[];
  fromStore?: IStore;
  toStore?: IStore;
}

export interface ICreateTransferDto {
  fromStoreId: string;
  toStoreId: string;
  notes?: string;
  lines: {
    itemId: string;
    quantity: number;
    notes?: string;
  }[];
}

export interface IStockTakeLine {
  id: string;
  stockTakeId: string;
  itemId: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  notes?: string | null;
  item?: IInventoryItem;
}

export interface IStockTake {
  id: string;
  organizationId: string;
  stockTakeNumber: string;
  storeId: string;
  countDate: Date | string;
  status: StockTakeStatus;
  conductedBy?: string | null;
  approvedBy?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines?: IStockTakeLine[];
  store?: IStore;
}

export interface ICreateStockTakeDto {
  storeId: string;
  notes?: string;
}

export interface IRecordStockTakeCountDto {
  lines: {
    itemId: string;
    countedQuantity: number;
    notes?: string;
  }[];
}

// -----------------------------------------------------------------------------
// Procurement Interfaces
// -----------------------------------------------------------------------------

export interface ISupplier {
  id: string;
  organizationId: string;
  supplierCode: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  categories: string[];
  status: SupplierStatus;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateSupplierDto {
  name: string;
  supplierCode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  categories?: string[];
  notes?: string;
}

export interface IUpdateSupplierDto {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  categories?: string[];
  status?: SupplierStatus;
  notes?: string;
}

export interface IPurchaseRequestLine {
  id: string;
  requestId: string;
  itemId?: string | null;
  itemDescription: string;
  quantity: number;
  estimatedUnitPrice?: number | null;
  estimatedTotal?: number | null;
  notes?: string | null;
  item?: IInventoryItem;
}

export interface IPurchaseRequest {
  id: string;
  organizationId: string;
  campusId?: string | null;
  requestNumber: string;
  requesterId?: string | null;
  department?: string | null;
  requiredDate?: Date | string | null;
  purpose: string;
  priority: PurchaseRequestPriority;
  status: PurchaseRequestStatus;
  approvedBy?: string | null;
  approvalDate?: Date | string | null;
  approvalNotes?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines?: IPurchaseRequestLine[];
}

export interface ICreatePurchaseRequestDto {
  campusId?: string;
  department?: string;
  requiredDate?: Date | string;
  purpose: string;
  priority?: PurchaseRequestPriority;
  notes?: string;
  lines: {
    itemId?: string;
    itemDescription: string;
    quantity: number;
    estimatedUnitPrice?: number;
    notes?: string;
  }[];
}

export interface IPurchaseOrderLine {
  id: string;
  orderId: string;
  itemId?: string | null;
  itemDescription: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  taxRate: number;
  totalPrice: number;
  notes?: string | null;
  item?: IInventoryItem;
}

export interface IPurchaseOrder {
  id: string;
  organizationId: string;
  campusId?: string | null;
  poNumber: string;
  supplierId: string;
  storeId?: string | null;
  purchaseRequestId?: string | null;
  orderDate: Date | string;
  expectedDeliveryDate?: Date | string | null;
  terms?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  approvedBy?: string | null;
  approvalDate?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines?: IPurchaseOrderLine[];
  supplier?: ISupplier;
  store?: IStore;
}

export interface ICreatePurchaseOrderDto {
  campusId?: string;
  supplierId: string;
  storeId?: string;
  purchaseRequestId?: string;
  expectedDeliveryDate?: Date | string;
  terms?: string;
  taxAmount?: number;
  discountAmount?: number;
  notes?: string;
  lines: {
    itemId?: string;
    itemDescription: string;
    orderedQuantity: number;
    unitPrice: number;
    taxRate?: number;
    notes?: string;
  }[];
}

export interface IGoodsReceiptLine {
  id: string;
  receiptId: string;
  itemId?: string | null;
  itemDescription: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  acceptedQuantity: number;
  damageNotes?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  item?: IInventoryItem;
}

export interface IGoodsReceipt {
  id: string;
  organizationId: string;
  receiptNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  storeId: string;
  receivedDate: Date | string;
  receivedBy?: string | null;
  deliveryNoteNumber?: string | null;
  status: GoodsReceiptStatus;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines?: IGoodsReceiptLine[];
  purchaseOrder?: IPurchaseOrder;
  supplier?: ISupplier;
  store?: IStore;
}

export interface ICreateGoodsReceiptDto {
  purchaseOrderId: string;
  storeId: string;
  deliveryNoteNumber?: string;
  notes?: string;
  lines: {
    itemId?: string;
    itemDescription: string;
    orderedQuantity: number;
    receivedQuantity: number;
    rejectedQuantity?: number;
    acceptedQuantity: number;
    damageNotes?: string;
    batchNumber?: string;
    serialNumber?: string;
  }[];
}

export interface ISupplierInvoiceReference {
  id: string;
  organizationId: string;
  referenceNumber: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  supplierId: string;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  amount: number;
  currency: string;
  status: SupplierInvoiceRefStatus;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  supplier?: ISupplier;
}

export interface ICreateSupplierInvoiceRefDto {
  invoiceNumber: string;
  invoiceDate: Date | string;
  supplierId: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  amount: number;
  currency?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// KPIs & Reporting Interfaces
// -----------------------------------------------------------------------------

export interface IInventoryDashboardKpis {
  totalItems: number;
  activeItems: number;
  totalStores: number;
  totalLocations: number;
  totalValuation: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  recentMovementsCount: number;
  activeTransfersCount: number;
  pendingStockTakesCount: number;
}

export interface IProcurementDashboardKpis {
  totalSuppliers: number;
  activeSuppliers: number;
  pendingRequestsCount: number;
  activeOrdersCount: number;
  totalOrdersValue: number;
  goodsReceiptsThisMonthCount: number;
  recordedInvoicesCount: number;
  pendingInvoicesValue: number;
}

export interface ILowStockAlert {
  itemId: string;
  itemCode: string;
  name: string;
  categoryName?: string;
  reorderLevel: number;
  currentStock: number;
  reorderQuantity: number;
  deficit: number;
}

export interface IInventoryValuationSummary {
  totalItems: number;
  totalValuation: number;
  storeBreakdown: {
    storeId: string;
    storeName: string;
    itemCount: number;
    valuation: number;
  }[];
}
