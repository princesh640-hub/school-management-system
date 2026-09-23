import {
  Controller,
  Get,
  Post,
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
import { PayrollService } from './payroll.service';
import { SalaryStructuresService } from './salary-structures.service';
import { LoansService } from './loans.service';
import { PayslipsService } from './payslips.service';
import {
  CreatePayrollPeriodDto,
  ProcessPayrollRunDto,
  CreatePayrollAdjustmentDto,
  CreateSalaryStructureDto,
  AddSalaryComponentDto,
  AssignSalaryStructureDto,
  CreateEmployeeLoanDto,
  RecordLoanRepaymentDto,
} from './dto/phase4h-payroll.dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payroll')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly salaryStructuresService: SalaryStructuresService,
    private readonly loansService: LoansService,
    private readonly payslipsService: PayslipsService,
  ) {}

  @Get()
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Query payroll domain status' })
  async getPayroll(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Payroll domain boundary active', organizationId: user.organizationId };
  }

  // ---------------------------------------------------------------------------
  // 1. Salary Structures & Components
  // ---------------------------------------------------------------------------

  @Post('salary-structures')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Create a salary structure template with components' })
  async createSalaryStructure(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.salaryStructuresService.createSalaryStructure(user, dto);
  }

  @Get('salary-structures')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'List salary structures for organization' })
  async getSalaryStructures(@CurrentUser() user: CurrentUserPayload) {
    return this.salaryStructuresService.getSalaryStructures(user);
  }

  @Get('salary-structures/:id')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Get salary structure by ID' })
  async getSalaryStructureById(@Param('id') id: string) {
    return this.salaryStructuresService.getSalaryStructureById(id);
  }

  @Post('salary-structures/:id/components')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Add a component to an existing salary structure' })
  async addSalaryComponent(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AddSalaryComponentDto,
  ) {
    return this.salaryStructuresService.addComponent(user, id, dto);
  }

  @Post('salary-assignments')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Assign salary structure to employee with effective date' })
  async assignSalaryStructure(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignSalaryStructureDto,
  ) {
    return this.salaryStructuresService.assignSalaryStructure(user, dto);
  }

  @Get('salary-assignments/effective/:employeeId')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Evaluate effective salary for employee at a specific date' })
  async getEffectiveSalary(
    @Param('employeeId') employeeId: string,
    @Query('targetDate') targetDate?: string,
  ) {
    const date = targetDate ? new Date(targetDate) : new Date();
    return this.salaryStructuresService.getEffectiveSalaryForDate(employeeId, date);
  }

  @Get('salary-assignments/history/:employeeId')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Get salary revision history for employee' })
  async getSalaryHistory(@Param('employeeId') employeeId: string) {
    return this.salaryStructuresService.getSalaryHistory(employeeId);
  }

  // ---------------------------------------------------------------------------
  // 2. Loans & Advances
  // ---------------------------------------------------------------------------

  @Post('loans')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Issue an employee loan or salary advance' })
  async createLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateEmployeeLoanDto,
  ) {
    return this.loansService.createLoan(user, dto);
  }

  @Get('loans')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'List employee loans' })
  async getLoans(
    @CurrentUser() user: CurrentUserPayload,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.loansService.getLoans(user, employeeId, status);
  }

  @Get('loans/:id')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Get employee loan by ID with repayment history' })
  async getLoanById(@Param('id') id: string) {
    return this.loansService.getLoanById(id);
  }

  @Post('loans/:id/approve')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Approve and activate an employee loan' })
  async approveLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.loansService.approveLoan(user, id);
  }

  @Post('loans/:id/repayments')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Record a manual or ad-hoc repayment for a loan' })
  async recordLoanRepayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: RecordLoanRepaymentDto,
  ) {
    return this.loansService.recordManualRepayment(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 3. Payroll Periods
  // ---------------------------------------------------------------------------

  @Post('periods')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Create a new payroll period' })
  async createPeriod(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.payrollService.createPeriod(user, dto);
  }

  @Get('periods')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'List payroll periods' })
  async getPeriods(
    @CurrentUser() user: CurrentUserPayload,
    @Query('campusId') campusId?: string,
  ) {
    return this.payrollService.getPeriods(user, campusId);
  }

  @Get('periods/:id')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Get payroll period details' })
  async getPeriodById(@Param('id') id: string) {
    return this.payrollService.getPeriodById(id);
  }

  // ---------------------------------------------------------------------------
  // 4. Payroll Runs, Pre-Check, Approvals & Locks
  // ---------------------------------------------------------------------------

  @Get('runs')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'List payroll runs' })
  async getPayrollRuns(
    @CurrentUser() user: CurrentUserPayload,
    @Query('periodId') periodId?: string,
  ) {
    return this.payrollService.getPayrollRuns(user, periodId);
  }

  @Get('runs/:id')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Get payroll run details with all employee records' })
  async getPayrollRunById(@Param('id') id: string) {
    return this.payrollService.getPayrollRunById(id);
  }

  @Post('runs/pre-check')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Pre-check eligibility and flag compensation exceptions before running batch' })
  async preCheckPayroll(
    @CurrentUser() user: CurrentUserPayload,
    @Body('periodId') periodId: string,
  ) {
    return this.payrollService.validatePayrollEligibility(user, periodId);
  }

  @Post('runs/process')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Execute batch payroll calculation and create draft payroll run' })
  async processPayrollRun(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ProcessPayrollRunDto,
  ) {
    return this.payrollService.processPayrollRun(user, dto);
  }

  @Post('runs/:id/approve')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Approve a payroll run (Gate 1)' })
  async approvePayrollRun(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.payrollService.approvePayrollRun(user, id);
  }

  @Post('runs/:id/lock')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Lock a payroll run (Gate 2: immutable)' })
  async lockPayrollRun(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.payrollService.lockPayrollRun(user, id);
  }

  @Post('runs/:id/generate-payslips')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Generate or update official payslips for all records in run' })
  async generatePayslips(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.payslipsService.generatePayslipsForRun(user, id);
  }

  @Post('adjustments')
  @RequirePermissions('payroll:manage')
  @ApiOperation({ summary: 'Post audited post-lock payroll adjustment' })
  async addAdjustment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePayrollAdjustmentDto,
  ) {
    return this.payrollService.addAdjustment(user, dto);
  }

  // ---------------------------------------------------------------------------
  // 5. Payslips
  // ---------------------------------------------------------------------------

  @Get('payslips')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'List payslips with self-service filtering' })
  async getPayslips(
    @CurrentUser() user: CurrentUserPayload,
    @Query('employeeId') employeeId?: string,
    @Query('periodId') periodId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.payslipsService.getPayslips(user, {
      employeeId,
      periodId,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  @Get('payslips/:id')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Get payslip details with privacy enforcement' })
  async getPayslipById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.payslipsService.getPayslipById(user, id);
  }

  @Get('payslips/:id/statement')
  @RequirePermissions('payroll:read')
  @ApiOperation({ summary: 'Generate structured printable payslip statement' })
  async getPayslipStatement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.payslipsService.generatePayslipStatement(user, id);
  }
}
