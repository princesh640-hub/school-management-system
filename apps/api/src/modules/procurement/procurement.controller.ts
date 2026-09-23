// =============================================================================
// Phase 4L: Procurement Management Controller
// =============================================================================
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { ProcurementSuppliersService } from './procurement-suppliers.service';
import { ProcurementRequestsService } from './procurement-requests.service';
import { ProcurementOrdersService } from './procurement-orders.service';
import { ProcurementReceiptsService } from './procurement-receipts.service';
import { ProcurementReportsService } from './procurement-reports.service';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly suppliersService: ProcurementSuppliersService,
    private readonly requestsService: ProcurementRequestsService,
    private readonly ordersService: ProcurementOrdersService,
    private readonly receiptsService: ProcurementReceiptsService,
    private readonly reportsService: ProcurementReportsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Suppliers
  // ---------------------------------------------------------------------------

  @Post('suppliers')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Create a supplier' })
  async createSupplier(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.suppliersService.createSupplier(user, dto);
  }

  @Get('suppliers')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'List suppliers' })
  async listSuppliers(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.suppliersService.listSuppliers(user, query);
  }

  @Get('suppliers/:id')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'Get supplier details' })
  async getSupplierById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.suppliersService.getSupplierById(user, id);
  }

  @Put('suppliers/:id')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Update supplier' })
  async updateSupplier(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.suppliersService.updateSupplier(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 2. Purchase Requests
  // ---------------------------------------------------------------------------

  @Post('requests')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Create a purchase requisition' })
  async createPurchaseRequest(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.requestsService.createPurchaseRequest(user, dto);
  }

  @Get('requests')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'List purchase requisitions' })
  async listPurchaseRequests(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.requestsService.listPurchaseRequests(user, query);
  }

  @Get('requests/:id')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'Get purchase request details' })
  async getPurchaseRequestById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.requestsService.getPurchaseRequestById(user, id);
  }

  @Put('requests/:id')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Update purchase request' })
  async updatePurchaseRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.requestsService.updatePurchaseRequest(user, id, dto);
  }

  @Post('requests/:id/approve')
  @RequirePermissions('procurement:approve')
  @ApiOperation({ summary: 'Approve purchase request' })
  async approvePurchaseRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.requestsService.approvePurchaseRequest(user, id, dto);
  }

  @Post('requests/:id/reject')
  @RequirePermissions('procurement:approve')
  @ApiOperation({ summary: 'Reject purchase request' })
  async rejectPurchaseRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.requestsService.rejectPurchaseRequest(user, id, dto);
  }

  @Post('requests/:id/cancel')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Cancel purchase request' })
  async cancelPurchaseRequest(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.requestsService.cancelPurchaseRequest(user, id);
  }

  // ---------------------------------------------------------------------------
  // 3. Purchase Orders
  // ---------------------------------------------------------------------------

  @Post('orders')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Create a purchase order' })
  async createPurchaseOrder(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.ordersService.createPurchaseOrder(user, dto);
  }

  @Get('orders')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'List purchase orders' })
  async listPurchaseOrders(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.ordersService.listPurchaseOrders(user, query);
  }

  @Get('orders/:id')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'Get purchase order details' })
  async getPurchaseOrderById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ordersService.getPurchaseOrderById(user, id);
  }

  @Put('orders/:id')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Update purchase order' })
  async updatePurchaseOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.ordersService.updatePurchaseOrder(user, id, dto);
  }

  @Post('orders/:id/approve')
  @RequirePermissions('procurement:approve')
  @ApiOperation({ summary: 'Approve purchase order' })
  async approvePurchaseOrder(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ordersService.approvePurchaseOrder(user, id);
  }

  @Post('orders/:id/issue')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Issue purchase order to supplier' })
  async issuePurchaseOrder(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ordersService.issuePurchaseOrder(user, id);
  }

  @Post('orders/:id/cancel')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Cancel purchase order' })
  async cancelPurchaseOrder(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ordersService.cancelPurchaseOrder(user, id);
  }

  // ---------------------------------------------------------------------------
  // 4. Goods Receipts (GRN)
  // ---------------------------------------------------------------------------

  @Post('receipts')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Record goods receipt note (GRN)' })
  async createGoodsReceipt(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.receiptsService.createGoodsReceipt(user, dto);
  }

  @Get('receipts')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'List goods receipts' })
  async listGoodsReceipts(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.receiptsService.listGoodsReceipts(user, query);
  }

  @Get('receipts/:id')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'Get goods receipt details' })
  async getGoodsReceiptById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.receiptsService.getGoodsReceiptById(user, id);
  }

  // ---------------------------------------------------------------------------
  // 5. Supplier Invoice References
  // ---------------------------------------------------------------------------

  @Post('invoices')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Record supplier invoice reference' })
  async createInvoiceReference(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.receiptsService.createInvoiceReference(user, dto);
  }

  @Get('invoices')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'List supplier invoice references' })
  async listInvoiceReferences(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.receiptsService.listInvoiceReferences(user, query);
  }

  @Get('invoices/:id')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'Get supplier invoice reference details' })
  async getInvoiceReferenceById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.receiptsService.getInvoiceReferenceById(user, id);
  }

  @Put('invoices/:id/status')
  @RequirePermissions('procurement:manage')
  @ApiOperation({ summary: 'Update supplier invoice reference status' })
  async updateInvoiceReferenceStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.receiptsService.updateInvoiceReferenceStatus(user, id, status);
  }

  // ---------------------------------------------------------------------------
  // 6. Reports & Dashboard
  // ---------------------------------------------------------------------------

  @Get('reports/kpis')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'Get procurement dashboard KPIs' })
  async getDashboardKpis(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getDashboardKpis(user);
  }

  @Get('reports/spend-summary')
  @RequirePermissions('procurement:view')
  @ApiOperation({ summary: 'Get procurement spend summary by supplier' })
  async getSpendSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getSpendSummary(user);
  }
}
