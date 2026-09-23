import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { SalaryStructuresService } from './salary-structures.service';
import { LoansService } from './loans.service';
import {
  CreatePayrollPeriodDto,
  ProcessPayrollRunDto,
  CreatePayrollAdjustmentDto,
} from './dto/phase4h-payroll.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly calculator: PayrollCalculatorService,
    private readonly salaryStructuresService: SalaryStructuresService,
    private readonly loansService: LoansService,
  ) {}

  /**
   * Generates sequential payroll run numbers: PAY-YYYY-XXXXX
   */
  async generateSequentialRunNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;

    const count = await this.prisma.payrollRun.count({
      where: { runNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const runNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.payrollRun.findUnique({ where: { runNumber } });
    if (!exists) return runNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  // ---------------------------------------------------------------------------
  // 1. Payroll Periods
  // ---------------------------------------------------------------------------

  async createPeriod(user: CurrentUserPayload, dto: CreatePayrollPeriodDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('Period endDate must be after startDate');
    }

    const existing = await this.prisma.payrollPeriod.findFirst({
      where: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        name: dto.name.trim(),
      },
    });

    if (existing) {
      throw new BadRequestException(`Payroll period "${dto.name}" already exists`);
    }

    const period = await this.prisma.payrollPeriod.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        name: dto.name.trim(),
        startDate,
        endDate,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        status: 'OPEN',
      },
      include: { campus: { select: { id: true, name: true, code: true } } },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE_PAYROLL_PERIOD',
      resource: 'PAYROLL_PERIOD',
      resourceId: period.id,
      details: { name: period.name, startDate, endDate },
    });

    return period;
  }

  async getPeriods(user: CurrentUserPayload, campusId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;

    return this.prisma.payrollPeriod.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true, code: true } },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getPeriodById(id: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        campus: true,
        runs: {
          include: {
            _count: { select: { records: true } },
          },
        },
      },
    });
    if (!period) throw new NotFoundException('Payroll period not found');
    return period;
  }

  // ---------------------------------------------------------------------------
  // 2. Exception Pre-Validation & Eligibility Check
  // ---------------------------------------------------------------------------

  async validatePayrollEligibility(user: CurrentUserPayload, periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('Payroll period not found');

    const empWhere: any = {
      user: { organizationId: user.organizationId },
      lifecycleStatus: { in: ['ACTIVE', 'CONFIRMED', 'ON_PROBATION'] },
    };
    if (period.campusId) {
      empWhere.user.campusId = period.campusId;
    }

    const employees = await this.prisma.employeeProfile.findMany({
      where: empWhere,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        salaryAssignments: {
          where: {
            effectiveFrom: { lte: period.endDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.endDate } }],
          },
        },
      },
    });

    const exceptions: Array<{ employeeId: string; name: string; issue: string }> = [];
    let eligibleCount = 0;

    for (const emp of employees) {
      const name = `${emp.user.firstName} ${emp.user.lastName}`;
      if (!emp.salaryAssignments.length && (!emp.salaryBase || Number(emp.salaryBase) <= 0)) {
        exceptions.push({
          employeeId: emp.id,
          name,
          issue: 'Missing active salary structure assignment or base salary override',
        });
      } else {
        eligibleCount++;
      }
    }

    return {
      periodId,
      totalEmployeesFound: employees.length,
      eligibleCount,
      exceptionsCount: exceptions.length,
      exceptions,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Batch Payroll Processing
  // ---------------------------------------------------------------------------

  async processPayrollRun(user: CurrentUserPayload, dto: ProcessPayrollRunDto) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: dto.payrollPeriodId },
    });
    if (!period) throw new NotFoundException('Payroll period not found');

    if (period.status === 'LOCKED' || period.status === 'PAID') {
      throw new BadRequestException(`Cannot process payroll for a period in status "${period.status}"`);
    }

    const empWhere: any = {
      user: { organizationId: user.organizationId },
      lifecycleStatus: { in: ['ACTIVE', 'CONFIRMED', 'ON_PROBATION'] },
    };
    if (dto.campusId || period.campusId) {
      empWhere.user.campusId = dto.campusId || period.campusId;
    }

    const employees = await this.prisma.employeeProfile.findMany({
      where: empWhere,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No eligible employees found for this payroll period');
    }

    const runNumber = await this.generateSequentialRunNumber();
    const daysInMonth = dto.dailyRateDenominator || 30;

    let totalGrossAll = 0;
    let totalDeductionsAll = 0;
    let totalNetAll = 0;

    const preparedRecords: any[] = [];
    const loanRepaymentsToCreate: any[] = [];

    for (const emp of employees) {
      // 1. Effective salary structure as of period endDate
      const salaryInfo = await this.salaryStructuresService.getEffectiveSalaryForDate(
        emp.id,
        period.endDate,
      );

      // 2. Query Phase 4D employee attendance for unpaid absences in this period
      const attendances = await this.prisma.employeeAttendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: period.startDate, lte: period.endDate },
        },
      });
      const absenceDays = attendances.filter((a) => a.status === 'ABSENT').length;

      // 3. Query Phase 4D leave applications for approved unpaid leaves in this period
      const leaveApps = await this.prisma.leaveApplication.findMany({
        where: {
          employeeId: emp.id,
          status: 'APPROVED',
          startDate: { lte: period.endDate },
          endDate: { gte: period.startDate },
        },
        include: { leaveType: true },
      });
      // Count unpaid leave days
      const unpaidLeaveDays = leaveApps
        .filter((l) => l.leaveType && !l.leaveType.isPaid)
        .reduce((sum, l) => sum + Number(l.totalDays), 0);

      // 4. Query active loans for loan installment deduction
      const activeLoans = await this.loansService.getActiveLoansForEmployee(emp.id);
      let loanInstallment = 0;
      let activeLoanRemaining = 0;
      let targetLoanId: string | null = null;

      if (activeLoans.length > 0) {
        const primaryLoan = activeLoans[0];
        targetLoanId = primaryLoan.id;
        activeLoanRemaining = Number(primaryLoan.remainingBalance);
        loanInstallment = Number(primaryLoan.monthlyInstallment);
      }

      // 5. Deterministic calculation via PayrollCalculatorService
      const calc = this.calculator.calculateEmployeePayroll({
        baseSalary: salaryInfo.baseSalary,
        allowances: salaryInfo.allowances,
        deductions: salaryInfo.deductions,
        absenceDays,
        unpaidLeaveDays,
        daysInMonth,
        activeLoanRemaining,
        monthlyLoanInstallment: loanInstallment,
      });

      totalGrossAll = this.calculator.roundMoney(totalGrossAll + calc.grossSalary);
      totalDeductionsAll = this.calculator.roundMoney(totalDeductionsAll + calc.totalDeductions);
      totalNetAll = this.calculator.roundMoney(totalNetAll + calc.netSalary);

      preparedRecords.push({
        employeeId: emp.id,
        calc,
        targetLoanId,
        actualLoanDeducted: calc.loanDeduction,
      });
    }

    // 6. Execute atomic batch run creation
    const payrollRun = await this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          payrollPeriodId: dto.payrollPeriodId,
          runNumber,
          totalEmployees: preparedRecords.length,
          totalGross: totalGrossAll,
          totalDeductions: totalDeductionsAll,
          totalNet: totalNetAll,
          status: 'REVIEW',
          processedAt: new Date(),
          processedBy: user.id,
        },
      });

      for (const item of preparedRecords) {
        const record = await tx.payrollEmployeeRecord.create({
          data: {
            payrollRunId: run.id,
            employeeId: item.employeeId,
            baseSalary: item.calc.baseSalary,
            totalAllowances: item.calc.allowances,
            totalDeductions: item.calc.totalDeductions,
            grossSalary: item.calc.grossSalary,
            netSalary: item.calc.netSalary,
            attendanceDeduction: item.calc.absenceDeduction,
            leaveDeduction: item.calc.unpaidLeaveDeduction,
            loanDeduction: item.calc.loanDeduction,
            bonusAmount: item.calc.bonuses,
            status: 'CALCULATED',
            earnings: {
              create: item.calc.earningsBreakdown.map((eb: any) => ({
                title: eb.title,
                earningType: eb.type,
                amount: eb.amount,
                source: 'CalculationEngine',
              })),
            },
            deductions: {
              create: item.calc.deductionsBreakdown.map((db: any) => ({
                title: db.title,
                deductionType: db.type,
                amount: db.amount,
                source: 'CalculationEngine',
              })),
            },
          },
        });

        // Record loan repayment if loan deducted
        if (item.targetLoanId && item.actualLoanDeducted > 0) {
          const loan = await tx.employeeLoan.findUnique({ where: { id: item.targetLoanId } });
          if (loan) {
            const newRemaining = this.calculator.roundMoney(Math.max(0, Number(loan.remainingBalance) - item.actualLoanDeducted));
            const newTotalRepaid = this.calculator.roundMoney(Number(loan.totalRepaid) + item.actualLoanDeducted);

            await tx.loanRepayment.create({
              data: {
                loanId: item.targetLoanId,
                employeeRecordId: record.id,
                repaymentNumber: `REP-${runNumber}-${item.employeeId.slice(0, 4)}`,
                amount: item.actualLoanDeducted,
                repaymentMethod: 'PAYROLL_DEDUCTION',
                notes: `Deducted in payroll run ${runNumber}`,
              },
            });

            await tx.employeeLoan.update({
              where: { id: item.targetLoanId },
              data: {
                remainingBalance: newRemaining,
                totalRepaid: newTotalRepaid,
                status: newRemaining <= 0 ? 'REPAID' : 'ACTIVE',
              },
            });
          }
        }
      }

      await tx.payrollPeriod.update({
        where: { id: dto.payrollPeriodId },
        data: { status: 'PROCESSED' },
      });

      return run;
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PROCESS_PAYROLL_RUN',
      resource: 'PAYROLL_RUN',
      resourceId: payrollRun.id,
      details: {
        runNumber,
        employeesCount: preparedRecords.length,
        totalGross: totalGrossAll,
        totalNet: totalNetAll,
      },
    });

    return {
      runId: payrollRun.id,
      runNumber,
      totalEmployees: preparedRecords.length,
      totalGross: totalGrossAll,
      totalDeductions: totalDeductionsAll,
      totalNet: totalNetAll,
      status: payrollRun.status,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Approval, Locking & Adjustment Gates
  // ---------------------------------------------------------------------------

  async approvePayrollRun(user: CurrentUserPayload, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { payrollPeriod: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    if (run.status !== 'REVIEW' && run.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot approve payroll run in status "${run.status}"`);
    }

    const updated = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: user.id,
      },
    });

    await this.prisma.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: { status: 'APPROVED' },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'APPROVE_PAYROLL_RUN',
      resource: 'PAYROLL_RUN',
      resourceId: runId,
      details: { runNumber: run.runNumber, approvedBy: user.id },
    });

    return updated;
  }

  async lockPayrollRun(user: CurrentUserPayload, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    if (run.status !== 'APPROVED') {
      throw new BadRequestException('Payroll run must be APPROVED before locking');
    }

    const updated = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
        lockedBy: user.id,
      },
    });

    await this.prisma.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: { status: 'LOCKED' },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'LOCK_PAYROLL_RUN',
      resource: 'PAYROLL_RUN',
      resourceId: runId,
      details: { runNumber: run.runNumber, lockedBy: user.id },
    });

    return updated;
  }

  async addAdjustment(user: CurrentUserPayload, dto: CreatePayrollAdjustmentDto) {
    const record = await this.prisma.payrollEmployeeRecord.findUnique({
      where: { id: dto.employeeRecordId },
      include: { payrollRun: true },
    });
    if (!record) throw new NotFoundException('Employee payroll record not found');

    // Prevent direct edits on locked runs without explicit adjustment audit
    const adjAmount = this.calculator.roundMoney(dto.amount);
    let newNetSalary = Number(record.netSalary);

    if (dto.type === 'EARNING') {
      newNetSalary = this.calculator.roundMoney(newNetSalary + adjAmount);
    } else {
      newNetSalary = this.calculator.roundMoney(Math.max(0, newNetSalary - adjAmount));
    }

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.payrollAdjustment.create({
        data: {
          employeeRecordId: dto.employeeRecordId,
          amount: adjAmount,
          type: dto.type,
          reason: dto.reason.trim(),
          requestedBy: user.id,
          approvedBy: user.id,
        },
      });

      await tx.payrollEmployeeRecord.update({
        where: { id: dto.employeeRecordId },
        data: { netSalary: newNetSalary },
      });

      // Update run total net
      const delta = dto.type === 'EARNING' ? adjAmount : -adjAmount;
      await tx.payrollRun.update({
        where: { id: record.payrollRunId },
        data: {
          totalNet: this.calculator.roundMoney(Number(record.payrollRun.totalNet) + delta),
        },
      });

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'ADD_PAYROLL_ADJUSTMENT',
        resource: 'PAYROLL_ADJUSTMENT',
        resourceId: adjustment.id,
        details: { recordId: dto.employeeRecordId, type: dto.type, amount: adjAmount },
      });

      return adjustment;
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Query Operations
  // ---------------------------------------------------------------------------

  async getPayrollRuns(user: CurrentUserPayload, periodId?: string) {
    const where: any = {};
    if (periodId) {
      where.payrollPeriodId = periodId;
    } else {
      where.payrollPeriod = { organizationId: user.organizationId };
    }

    const runs = await this.prisma.payrollRun.findMany({
      where,
      include: {
        payrollPeriod: true,
        _count: { select: { records: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return runs.map((r) => ({
      ...r,
      totalGross: Number(r.totalGross),
      totalDeductions: Number(r.totalDeductions),
      totalNet: Number(r.totalNet),
    }));
  }

  async getPayrollRunById(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        records: {
          include: {
            employee: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                department: true,
                designationRel: true,
              },
            },
            earnings: true,
            deductions: true,
            adjustments: true,
            payslips: true,
          },
        },
      },
    });

    if (!run) throw new NotFoundException('Payroll run not found');

    return {
      ...run,
      totalGross: Number(run.totalGross),
      totalDeductions: Number(run.totalDeductions),
      totalNet: Number(run.totalNet),
      records: run.records.map((rec) => ({
        ...rec,
        baseSalary: Number(rec.baseSalary),
        totalAllowances: Number(rec.totalAllowances),
        totalDeductions: Number(rec.totalDeductions),
        grossSalary: Number(rec.grossSalary),
        netSalary: Number(rec.netSalary),
        attendanceDeduction: Number(rec.attendanceDeduction),
        leaveDeduction: Number(rec.leaveDeduction),
        loanDeduction: Number(rec.loanDeduction),
        bonusAmount: Number(rec.bonusAmount),
        earnings: rec.earnings.map((e) => ({ ...e, amount: Number(e.amount) })),
        deductions: rec.deductions.map((d) => ({ ...d, amount: Number(d.amount) })),
        adjustments: rec.adjustments.map((a) => ({ ...a, amount: Number(a.amount) })),
      })),
    };
  }
}
