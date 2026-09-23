import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PayrollCalculatorService } from './payroll-calculator.service';
import {
  CreateEmployeeLoanDto,
  RecordLoanRepaymentDto,
} from './dto/phase4h-payroll.dto';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly calculator: PayrollCalculatorService,
  ) {}

  /**
   * Generates sequential loan numbers: LOAN-YYYY-XXXXX
   */
  async generateSequentialLoanNumber(organizationId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LOAN-${year}-`;

    const where: any = { loanNumber: { startsWith: prefix } };
    if (organizationId) where.organizationId = organizationId;

    const count = await this.prisma.employeeLoan.count({ where });
    const nextSeq = String(count + 1).padStart(5, '0');
    const loanNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.employeeLoan.findUnique({ where: { loanNumber } });
    if (!exists) return loanNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Generates sequential repayment numbers: REP-YYYY-XXXXX
   */
  async generateSequentialRepaymentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REP-${year}-`;

    const count = await this.prisma.loanRepayment.count({
      where: { repaymentNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const repaymentNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.loanRepayment.findUnique({ where: { repaymentNumber } });
    if (!exists) return repaymentNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  async createLoan(user: CurrentUserPayload, dto: CreateEmployeeLoanDto) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: dto.employeeId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const principal = this.calculator.roundMoney(dto.principalAmount);
    const months = Math.max(1, dto.repaymentTermMonths);
    const monthlyInstallment = this.calculator.roundMoney(principal / months);

    const loanNumber = await this.generateSequentialLoanNumber(user.organizationId);

    const loan = await this.prisma.employeeLoan.create({
      data: {
        organizationId: user.organizationId,
        employeeId: dto.employeeId,
        loanNumber,
        principalAmount: principal,
        repaymentTermMonths: months,
        monthlyInstallment,
        totalRepaid: 0,
        remainingBalance: principal,
        status: 'PENDING',
        reason: dto.reason || null,
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REQUEST_LOAN',
      resource: 'EMPLOYEE_LOAN',
      resourceId: loan.id,
      details: { loanNumber, principal, months, employeeId: dto.employeeId },
    });

    return {
      ...loan,
      principalAmount: Number(loan.principalAmount),
      monthlyInstallment: Number(loan.monthlyInstallment),
      totalRepaid: Number(loan.totalRepaid),
      remainingBalance: Number(loan.remainingBalance),
    };
  }

  async approveLoan(user: CurrentUserPayload, loanId: string) {
    const loan = await this.prisma.employeeLoan.findUnique({
      where: { id: loanId },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve loan in status "${loan.status}"`);
    }

    const updated = await this.prisma.employeeLoan.update({
      where: { id: loanId },
      data: {
        status: 'ACTIVE',
        approvedBy: user.id,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'APPROVE_LOAN',
      resource: 'EMPLOYEE_LOAN',
      resourceId: loanId,
      details: { loanNumber: loan.loanNumber, principal: Number(loan.principalAmount) },
    });

    return {
      ...updated,
      principalAmount: Number(updated.principalAmount),
      monthlyInstallment: Number(updated.monthlyInstallment),
      totalRepaid: Number(updated.totalRepaid),
      remainingBalance: Number(updated.remainingBalance),
    };
  }

  async recordRepayment(
    user: CurrentUserPayload | any,
    loanId: string,
    dto: RecordLoanRepaymentDto & { employeeRecordId?: string },
  ) {
    const loan = await this.prisma.employeeLoan.findUnique({
      where: { id: loanId },
    });
    if (!loan) throw new NotFoundException('Loan not found');

    const remaining = Number(loan.remainingBalance);
    const amount = this.calculator.roundMoney(dto.amount);

    if (amount <= 0) {
      throw new BadRequestException('Repayment amount must be positive');
    }
    // Prevent over-recovery
    const actualRepaid = Math.min(amount, remaining);
    const newRemaining = this.calculator.roundMoney(remaining - actualRepaid);
    const newTotalRepaid = this.calculator.roundMoney(Number(loan.totalRepaid) + actualRepaid);
    const nextStatus = newRemaining <= 0 ? 'REPAID' : 'ACTIVE';

    const repaymentNumber = await this.generateSequentialRepaymentNumber();

    return this.prisma.$transaction(async (tx) => {
      const repayment = await tx.loanRepayment.create({
        data: {
          loanId,
          employeeRecordId: dto.employeeRecordId || null,
          repaymentNumber,
          amount: actualRepaid,
          repaymentMethod: dto.repaymentMethod || 'PAYROLL_DEDUCTION',
          notes: dto.notes || null,
        },
      });

      const updatedLoan = await tx.employeeLoan.update({
        where: { id: loanId },
        data: {
          totalRepaid: newTotalRepaid,
          remainingBalance: newRemaining,
          status: nextStatus,
        },
      });

      return {
        repayment: {
          ...repayment,
          amount: Number(repayment.amount),
        },
        loan: {
          ...updatedLoan,
          principalAmount: Number(updatedLoan.principalAmount),
          monthlyInstallment: Number(updatedLoan.monthlyInstallment),
          totalRepaid: Number(updatedLoan.totalRepaid),
          remainingBalance: Number(updatedLoan.remainingBalance),
        },
      };
    });
  }

  async getLoans(user: CurrentUserPayload, employeeId?: string, status?: string) {
    const where: any = { organizationId: user.organizationId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const list = await this.prisma.employeeLoan.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: true,
          },
        },
        repayments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((l) => ({
      ...l,
      principalAmount: Number(l.principalAmount),
      monthlyInstallment: Number(l.monthlyInstallment),
      totalRepaid: Number(l.totalRepaid),
      remainingBalance: Number(l.remainingBalance),
      repayments: l.repayments.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    }));
  }

  /**
   * Retrieves single loan by ID with complete repayment history
   */
  async getLoanById(id: string) {
    const loan = await this.prisma.employeeLoan.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: true,
          },
        },
        repayments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    return {
      ...loan,
      principalAmount: Number(loan.principalAmount),
      monthlyInstallment: Number(loan.monthlyInstallment),
      totalRepaid: Number(loan.totalRepaid),
      remainingBalance: Number(loan.remainingBalance),
      repayments: loan.repayments.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    };
  }

  /**
   * Alias for recordRepayment for manual repayments
   */
  async recordManualRepayment(
    user: CurrentUserPayload | any,
    loanId: string,
    dto: RecordLoanRepaymentDto & { employeeRecordId?: string },
  ) {
    return this.recordRepayment(user, loanId, dto);
  }

  /**
   * Returns active loans for an employee with remaining balance > 0
   */
  async getActiveLoansForEmployee(employeeId: string) {
    return this.prisma.employeeLoan.findMany({
      where: {
        employeeId,
        status: 'ACTIVE',
        remainingBalance: { gt: 0 },
      },
    });
  }
}
