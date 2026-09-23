// =============================================================================
// Phase 4L: Inventory Management Controller
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
import { InventoryCatalogService } from './inventory-catalog.service';
import { InventoryStockService } from './inventory-stock.service';
import { InventoryTransfersService } from './inventory-transfers.service';
import { InventoryAdjustmentsService } from './inventory-adjustments.service';
import { InventoryReportsService } from './inventory-reports.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly catalogService: InventoryCatalogService,
    private readonly stockService: InventoryStockService,
    private readonly transfersService: InventoryTransfersService,
    private readonly adjustmentsService: InventoryAdjustmentsService,
    private readonly reportsService: InventoryReportsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Categories
  // ---------------------------------------------------------------------------

  @Post('categories')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Create an item category' })
  async createCategory(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.catalogService.createCategory(user, dto);
  }

  @Get('categories')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List item categories' })
  async listCategories(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    return this.catalogService.listCategories(user, status);
  }

  @Get('categories/:id')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get category details' })
  async getCategoryById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.catalogService.getCategoryById(user, id);
  }

  @Put('categories/:id')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Update item category' })
  async updateCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.catalogService.updateCategory(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 2. Units of Measure
  // ---------------------------------------------------------------------------

  @Post('uoms')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Create a unit of measure' })
  async createUom(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.catalogService.createUom(user, dto);
  }

  @Get('uoms')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List units of measure' })
  async listUoms(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    return this.catalogService.listUoms(user, status);
  }

  @Put('uoms/:id')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Update unit of measure' })
  async updateUom(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.catalogService.updateUom(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 3. Items
  // ---------------------------------------------------------------------------

  @Post('items')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Create an inventory item' })
  async createItem(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.catalogService.createItem(user, dto);
  }

  @Get('items')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List inventory items' })
  async listItems(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.catalogService.listItems(user, query);
  }

  @Get('items/:id')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get item details' })
  async getItemById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.catalogService.getItemById(user, id);
  }

  @Put('items/:id')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Update inventory item' })
  async updateItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.catalogService.updateItem(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 4. Stores & Locations
  // ---------------------------------------------------------------------------

  @Post('stores')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Create a warehouse/store' })
  async createStore(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.stockService.createStore(user, dto);
  }

  @Get('stores')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List stores' })
  async listStores(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.stockService.listStores(user, query);
  }

  @Get('stores/:id')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get store details' })
  async getStoreById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.stockService.getStoreById(user, id);
  }

  @Put('stores/:id')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Update store' })
  async updateStore(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.stockService.updateStore(user, id, dto);
  }

  @Post('stores/:storeId/locations')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Create storage location in store' })
  async createLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('storeId') storeId: string,
    @Body() dto: any,
  ) {
    return this.stockService.createLocation(user, storeId, dto);
  }

  @Get('stores/:storeId/locations')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List locations in store' })
  async listLocations(
    @CurrentUser() user: CurrentUserPayload,
    @Param('storeId') storeId: string,
  ) {
    return this.stockService.listLocations(user, storeId);
  }

  @Put('locations/:id')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Update storage location' })
  async updateLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.stockService.updateLocation(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 5. Balances & Movements
  // ---------------------------------------------------------------------------

  @Get('balances')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List inventory balances' })
  async listBalances(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.stockService.listBalances(user, query);
  }

  @Get('balances/:storeId/:itemId')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get specific item balance in store' })
  async getBalance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('storeId') storeId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.stockService.getBalance(user, storeId, itemId);
  }

  @Post('movements/opening')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Record opening stock' })
  async recordOpeningStock(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.stockService.recordOpeningStock(user, dto);
  }

  @Post('movements/issue')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Issue stock from store' })
  async recordIssue(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.stockService.recordIssue(user, dto);
  }

  @Get('movements')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Query inventory movements ledger' })
  async listMovements(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.stockService.listMovements(user, query);
  }

  // ---------------------------------------------------------------------------
  // 6. Adjustments & Stock Takes
  // ---------------------------------------------------------------------------

  @Post('adjustments')
  @RequirePermissions('inventory:manage')
  @ApiOperation({ summary: 'Record stock adjustment' })
  async recordAdjustment(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.adjustmentsService.recordAdjustment(user, dto);
  }

  @Post('stock-takes')
  @RequirePermissions('inventory:audit')
  @ApiOperation({ summary: 'Start a physical stock take' })
  async createStockTake(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.adjustmentsService.createStockTake(user, dto);
  }

  @Get('stock-takes')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List stock takes' })
  async listStockTakes(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.adjustmentsService.listStockTakes(user, query);
  }

  @Get('stock-takes/:id')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get stock take details' })
  async getStockTakeById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adjustmentsService.getStockTakeById(user, id);
  }

  @Post('stock-takes/:id/counts')
  @RequirePermissions('inventory:audit')
  @ApiOperation({ summary: 'Record counted quantities for stock take' })
  async recordCounts(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.adjustmentsService.recordStockTakeCounts(user, id, dto);
  }

  @Post('stock-takes/:id/reconcile')
  @RequirePermissions('inventory:audit')
  @ApiOperation({ summary: 'Reconcile variances and complete stock take' })
  async reconcileStockTake(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.adjustmentsService.reconcileStockTake(user, id);
  }

  // ---------------------------------------------------------------------------
  // 7. Transfers
  // ---------------------------------------------------------------------------

  @Post('transfers')
  @RequirePermissions('inventory:transfer')
  @ApiOperation({ summary: 'Create inter-store stock transfer request' })
  async createTransfer(@CurrentUser() user: CurrentUserPayload, @Body() dto: any) {
    return this.transfersService.createTransfer(user, dto);
  }

  @Get('transfers')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'List stock transfers' })
  async listTransfers(@CurrentUser() user: CurrentUserPayload, @Query() query: any) {
    return this.transfersService.listTransfers(user, query);
  }

  @Get('transfers/:id')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get transfer details' })
  async getTransferById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transfersService.getTransferById(user, id);
  }

  @Post('transfers/:id/dispatch')
  @RequirePermissions('inventory:transfer')
  @ApiOperation({ summary: 'Dispatch transfer' })
  async dispatchTransfer(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transfersService.dispatchTransfer(user, id);
  }

  @Post('transfers/:id/complete')
  @RequirePermissions('inventory:transfer')
  @ApiOperation({ summary: 'Complete transfer and apply stock adjustments' })
  async completeTransfer(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transfersService.completeTransfer(user, id);
  }

  @Post('transfers/:id/cancel')
  @RequirePermissions('inventory:transfer')
  @ApiOperation({ summary: 'Cancel transfer' })
  async cancelTransfer(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transfersService.cancelTransfer(user, id);
  }

  // ---------------------------------------------------------------------------
  // 8. Reports & Dashboard
  // ---------------------------------------------------------------------------

  @Get('reports/kpis')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get inventory dashboard KPIs' })
  async getDashboardKpis(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getDashboardKpis(user);
  }

  @Get('reports/low-stock')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get low stock alerts' })
  async getLowStockAlerts(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getLowStockAlerts(user);
  }

  @Get('reports/valuation')
  @RequirePermissions('inventory:view')
  @ApiOperation({ summary: 'Get inventory valuation breakdown' })
  async getValuationSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getValuationSummary(user);
  }
}
