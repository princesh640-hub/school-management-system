import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { FeesService } from './fees.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import {
  CreateFeeCategoryDto,
  CreateExtendedFeeStructureDto,
  CreateFeeScheduleDto,
  CreateFeeDiscountDto,
  AssignStudentFeeDto,
  GenerateSingleInvoiceDto,
  ProcessPaymentDto,
  RequestRefundDto,
  ReviewRefundDto,
  CreateFeeAdjustmentDto,
  OpenCashierShiftDto,
  CloseCashierShiftDto,
} from './dto/phase4g-fees.dto';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // ---------------------------------------------------------------------------
  // 1. Fee Structures & Categories (Phase 2 Legacy & Phase 4G Extended)
  // ---------------------------------------------------------------------------

  @Post('structures')
  @RequirePermissions('fees:create')
  @ApiOperation({ summary: 'Create a basic fee structure' })
  async createStructure(@Body() dto: CreateFeeStructureDto) {
    return this.feesService.createStructure(dto);
  }

  @Get('structures')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'List fee structures' })
  @ApiQuery({ name: 'campusId', required: false })
  async getStructures(@Query('campusId') campusId?: string) {
    return this.feesService.getStructures(campusId);
  }

  @Post('structures/extended')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Create an extended fee structure with category and grade links' })
  async createExtendedStructure(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExtendedFeeStructureDto,
  ) {
    return this.feesService.createExtendedStructure(user, dto);
  }

  @Post('categories')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Create fee category' })
  async createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFeeCategoryDto,
  ) {
    return this.feesService.createCategory(user, dto);
  }

  @Get('categories')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'List fee categories' })
  @ApiQuery({ name: 'campusId', required: false })
  async getCategories(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.feesService.getCategories(user, campusId);
  }

  // ---------------------------------------------------------------------------
  // 2. Fee Schedules & Discounts
  // ---------------------------------------------------------------------------

  @Post('schedules')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Create fee billing schedule' })
  async createSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFeeScheduleDto,
  ) {
    return this.feesService.createSchedule(user, dto);
  }

  @Get('schedules')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'List fee schedules' })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'feeStructureId', required: false })
  async getSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Query('academicYearId') academicYearId?: string,
    @Query('feeStructureId') feeStructureId?: string,
  ) {
    return this.feesService.getSchedules(user, academicYearId, feeStructureId);
  }

  @Post('discounts')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Create discount / scholarship policy' })
  async createDiscount(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFeeDiscountDto,
  ) {
    return this.feesService.createDiscount(user, dto);
  }

  @Get('discounts')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'List fee discounts and scholarships' })
  @ApiQuery({ name: 'campusId', required: false })
  async getDiscounts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.feesService.getDiscounts(user, campusId);
  }

  @Post('assignments')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Assign student-specific fee override or discount' })
  async assignStudentFee(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignStudentFeeDto,
  ) {
    return this.feesService.assignStudentFee(user, dto);
  }

  @Get('assignments/student/:studentId')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'Get student fee assignments' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getStudentFeeAssignments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.feesService.getStudentFeeAssignments(user, studentId, academicYearId);
  }

  // ---------------------------------------------------------------------------
  // 3. Invoices (Phase 2 Legacy & Extended)
  // ---------------------------------------------------------------------------

  @Post('invoices/generate')
  @RequirePermissions('fees:create')
  @ApiOperation({ summary: 'Generate invoices for students (bulk)' })
  async generateInvoices(@Body() dto: GenerateInvoicesDto) {
    return this.feesService.generateInvoices(dto);
  }

  @Post('invoices/single')
  @RequirePermissions('fees:create')
  @ApiOperation({ summary: 'Generate a single itemized invoice' })
  async generateSingleInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateSingleInvoiceDto,
  ) {
    return this.feesService.generateSingleInvoice(user, dto);
  }

  @Get('invoices')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'Query fee invoices' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'status', enum: InvoiceStatus, required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getInvoices(
    @Query('studentId') studentId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('academicYearId') academicYearId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.feesService.getInvoices({ studentId, status, academicYearId, page, limit });
  }

  @Get('invoices/:id')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'Get invoice details by ID' })
  async getInvoiceById(@Param('id') id: string) {
    return this.feesService.getInvoiceById(id);
  }

  @Post('invoices/:id/void')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Void an invoice' })
  async voidInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.feesService.voidInvoice(user, id, reason || 'Voided by administrator');
  }

  @Post('invoices/apply-late-fees')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Scan and apply late fees to overdue invoices' })
  async applyLateFees(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.feesService.applyLateFees(user.organizationId, campusId);
  }

  // ---------------------------------------------------------------------------
  // 4. Payments, Receipts & Cashier Shifts
  // ---------------------------------------------------------------------------

  @Post('payments')
  @RequirePermissions('fees:collect')
  @ApiOperation({ summary: 'Record payment against an invoice' })
  async recordPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.feesService.recordPayment(user, dto);
  }

  @Post('payments/process')
  @RequirePermissions('fees:collect')
  @ApiOperation({ summary: 'Process payment with idempotency key and shift tracking' })
  async processPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.feesService.processPayment(user, dto);
  }

  @Get('receipts/:paymentId')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'Generate structured printable receipt' })
  async getReceipt(@Param('paymentId') paymentId: string) {
    return this.feesService.getReceipt(paymentId);
  }

  @Post('shifts/open')
  @RequirePermissions('fees:collect')
  @ApiOperation({ summary: 'Open a cashier shift' })
  async openCashierShift(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: OpenCashierShiftDto,
  ) {
    return this.feesService.openCashierShift(user, dto);
  }

  @Post('shifts/:id/close')
  @RequirePermissions('fees:collect')
  @ApiOperation({ summary: 'Close a cashier shift with drawer reconciliation' })
  async closeCashierShift(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CloseCashierShiftDto,
  ) {
    return this.feesService.closeCashierShift(user, id, dto);
  }

  @Get('shifts/current')
  @RequirePermissions('fees:collect')
  @ApiOperation({ summary: 'Get current active cashier shift' })
  async getCurrentShift(@CurrentUser() user: CurrentUserPayload) {
    return this.feesService.getCurrentShift(user);
  }

  @Get('shifts')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'List cashier shifts' })
  @ApiQuery({ name: 'campusId', required: false })
  async getCashierShifts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.feesService.getCashierShifts(user, campusId);
  }

  // ---------------------------------------------------------------------------
  // 5. Refunds & Adjustments
  // ---------------------------------------------------------------------------

  @Post('refunds/request')
  @RequirePermissions('fees:refund')
  @ApiOperation({ summary: 'Request a refund against a payment transaction' })
  async requestRefund(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RequestRefundDto,
  ) {
    return this.feesService.requestRefund(user, dto);
  }

  @Post('refunds/:id/review')
  @RequirePermissions('fees:manage')
  @ApiOperation({ summary: 'Review and approve/reject a refund' })
  async reviewRefund(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
  ) {
    return this.feesService.reviewRefund(user, id, dto);
  }

  @Get('refunds')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'List refunds' })
  @ApiQuery({ name: 'status', required: false })
  async getRefunds(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    return this.feesService.getRefunds(user, status);
  }

  @Post('adjustments')
  @RequirePermissions('fees:adjust')
  @ApiOperation({ summary: 'Create a fee adjustment (credit, debit, waiver)' })
  async createAdjustment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFeeAdjustmentDto,
  ) {
    return this.feesService.createAdjustment(user, dto);
  }

  @Get('adjustments')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'List fee adjustments' })
  @ApiQuery({ name: 'feeInvoiceId', required: false })
  @ApiQuery({ name: 'type', required: false })
  async getAdjustments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('feeInvoiceId') feeInvoiceId?: string,
    @Query('type') type?: string,
  ) {
    return this.feesService.getAdjustments(user, feeInvoiceId, type);
  }

  // ---------------------------------------------------------------------------
  // 6. Student Financial Ledger
  // ---------------------------------------------------------------------------

  @Get('ledger/student/:studentId')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'Get student financial ledger with running balance' })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getStudentLedger(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.feesService.getStudentLedger(studentId, academicYearId);
  }

  // ---------------------------------------------------------------------------
  // 7. Financial Reports
  // ---------------------------------------------------------------------------

  @Get('reports/collections')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'Get collection summary report' })
  @ApiQuery({ name: 'campusId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCollectionSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.feesService.getCollectionSummary({
      organizationId: user.organizationId,
      campusId,
      startDate,
      endDate,
    });
  }

  @Get('reports/defaulters')
  @RequirePermissions('fees:read')
  @ApiOperation({ summary: 'Get defaulters aging report with 30-day buckets' })
  @ApiQuery({ name: 'campusId', required: false })
  @ApiQuery({ name: 'academicYearId', required: false })
  async getDefaultersAgingReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.feesService.getDefaultersAgingReport({
      organizationId: user.organizationId,
      campusId,
      academicYearId,
    });
  }
}
