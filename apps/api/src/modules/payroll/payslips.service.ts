import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PayslipStatement } from '@school/shared-types';

@Injectable()
export class PayslipsService {
  private readonly logger = new Logger(PayslipsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate collision-safe sequential payslip numbers: PSL-YYYY-XXXXX
   */
  async generateSequentialPayslipNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PSL-${year}-`;

    const count = await this.prisma.payslip.count({
      where: { payslipNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const payslipNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.payslip.findUnique({ where: { payslipNumber } });
    if (!exists) return payslipNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Generates or updates payslips for all records in a payroll run
   */
  async generatePayslipsForRun(user: CurrentUserPayload, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        payrollPeriod: true,
        records: {
          include: {
            employee: true,
            payslips: true,
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException('Payroll run not found');
    }

    const month = run.payrollPeriod.startDate.getMonth() + 1;
    const year = run.payrollPeriod.startDate.getFullYear();
    const createdOrUpdated = [];

    for (const record of run.records) {
      const existingPayslip = record.payslips && record.payslips.length > 0 ? record.payslips[0] : null;

      if (existingPayslip) {
        const updated = await this.prisma.payslip.update({
          where: { id: existingPayslip.id },
          data: {
            grossPay: record.grossSalary,
            totalDeductions: record.totalDeductions,
            netPay: record.netSalary,
            month,
            year,
            status: run.status === 'LOCKED' ? 'LOCKED' : run.status === 'APPROVED' ? 'APPROVED' : 'GENERATED',
          },
        });
        createdOrUpdated.push(updated);
      } else {
        const payslipNumber = await this.generateSequentialPayslipNumber();
        const created = await this.prisma.payslip.create({
          data: {
            payrollEmployeeRecordId: record.id,
            payslipNumber,
            month,
            year,
            grossPay: record.grossSalary,
            totalDeductions: record.totalDeductions,
            netPay: record.netSalary,
            issueDate: new Date(),
            status: run.status === 'LOCKED' ? 'LOCKED' : run.status === 'APPROVED' ? 'APPROVED' : 'GENERATED',
          },
        });
        createdOrUpdated.push(created);
      }
    }

    return createdOrUpdated;
  }

  /**
   * Retrieves payslips matching criteria with self-service privacy filtering
   */
  async getPayslips(
    user: CurrentUserPayload,
    query?: { employeeId?: string; periodId?: string; month?: number; year?: number },
  ) {
    const hasPrivilegedAccess =
      user.roles.some((r) =>
        ['SUPER_ADMIN', 'ADMIN', 'CAMPUS_PRINCIPAL', 'ACCOUNTANT', 'CAMPUS_ADMIN'].includes(r),
      ) ||
      user.permissions.includes('payroll:read') ||
      user.permissions.includes('payroll:manage');

    const where: any = {};

    // Filter by organization through payroll period
    where.payrollEmployeeRecord = {
      payrollRun: {
        payrollPeriod: {
          organizationId: user.organizationId,
        },
      },
    };

    if (query?.periodId) {
      where.payrollEmployeeRecord.payrollRun.payrollPeriodId = query.periodId;
    }

    if (!hasPrivilegedAccess) {
      // Non-privileged users can ONLY see their own payslips
      const myProfile = await this.prisma.employeeProfile.findFirst({
        where: { userId: user.id },
      });
      if (!myProfile) return [];
      where.payrollEmployeeRecord.employeeId = myProfile.id;
    } else if (query?.employeeId) {
      where.payrollEmployeeRecord.employeeId = query.employeeId;
    }

    if (query?.month) where.month = Number(query.month);
    if (query?.year) where.year = Number(query.year);

    const payslips = await this.prisma.payslip.findMany({
      where,
      include: {
        payrollEmployeeRecord: {
          include: {
            employee: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                department: true,
                designationRel: true,
              },
            },
            payrollRun: {
              include: {
                payrollPeriod: true,
              },
            },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
    });

    return payslips.map((p) => ({
      ...p,
      grossPay: Number(p.grossPay),
      totalDeductions: Number(p.totalDeductions),
      netPay: Number(p.netPay),
    }));
  }

  /**
   * Get single payslip by ID with self-service privacy guard
   */
  async getPayslipById(user: CurrentUserPayload, payslipId: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        payrollEmployeeRecord: {
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
            payrollRun: {
              include: {
                payrollPeriod: true,
              },
            },
          },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    // Privacy Guard
    const hasPrivilegedAccess =
      user.roles.some((r) =>
        ['SUPER_ADMIN', 'ADMIN', 'CAMPUS_PRINCIPAL', 'ACCOUNTANT', 'CAMPUS_ADMIN'].includes(r),
      ) ||
      user.permissions.includes('payroll:read') ||
      user.permissions.includes('payroll:manage');

    if (!hasPrivilegedAccess) {
      if (payslip.payrollEmployeeRecord.employee.userId !== user.id) {
        throw new ForbiddenException('You do not have permission to view this payslip');
      }
    }

    return {
      ...payslip,
      grossPay: Number(payslip.grossPay),
      totalDeductions: Number(payslip.totalDeductions),
      netPay: Number(payslip.netPay),
      payrollEmployeeRecord: {
        ...payslip.payrollEmployeeRecord,
        baseSalary: Number(payslip.payrollEmployeeRecord.baseSalary),
        totalAllowances: Number(payslip.payrollEmployeeRecord.totalAllowances),
        totalDeductions: Number(payslip.payrollEmployeeRecord.totalDeductions),
        grossSalary: Number(payslip.payrollEmployeeRecord.grossSalary),
        netSalary: Number(payslip.payrollEmployeeRecord.netSalary),
        attendanceDeduction: Number(payslip.payrollEmployeeRecord.attendanceDeduction),
        leaveDeduction: Number(payslip.payrollEmployeeRecord.leaveDeduction),
        loanDeduction: Number(payslip.payrollEmployeeRecord.loanDeduction),
        bonusAmount: Number(payslip.payrollEmployeeRecord.bonusAmount),
        earnings: payslip.payrollEmployeeRecord.earnings.map((e) => ({
          ...e,
          amount: Number(e.amount),
        })),
        deductions: payslip.payrollEmployeeRecord.deductions.map((d) => ({
          ...d,
          amount: Number(d.amount),
        })),
        adjustments: payslip.payrollEmployeeRecord.adjustments.map((a) => ({
          ...a,
          amount: Number(a.amount),
        })),
      },
    };
  }

  /**
   * Formats structured printable statement payload
   */
  async generatePayslipStatement(
    user: CurrentUserPayload,
    payslipId: string,
  ): Promise<PayslipStatement> {
    const payslip = await this.getPayslipById(user, payslipId);
    const rec = payslip.payrollEmployeeRecord;
    const emp = rec.employee;
    const period = rec.payrollRun.payrollPeriod;

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const statement: PayslipStatement = {
      payslipNumber: payslip.payslipNumber,
      issueDate: payslip.issueDate.toISOString(),
      school: {
        name: org?.name || 'School Management System',
        address: org?.address || undefined,
        logoUrl: org?.logoUrl || undefined,
      },
      employee: {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: `${emp.user?.firstName || ''} ${emp.user?.lastName || ''}`.trim() || emp.preferredName || 'Employee',
        department: emp.department?.name || undefined,
        designation: emp.designationRel?.name || emp.designation,
        joiningDate: emp.joiningDate ? emp.joiningDate.toISOString() : new Date().toISOString(),
      },
      period: {
        name: period.name,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        paymentDate: period.paymentDate ? period.paymentDate.toISOString() : undefined,
      },
      earnings: [
        {
          title: 'Base Salary',
          type: 'BASE',
          amount: rec.baseSalary,
        },
        ...rec.earnings.map((e) => ({
          title: e.title,
          type: e.earningType,
          amount: e.amount,
        })),
      ],
      deductions: [
        ...rec.deductions.map((d) => ({
          title: d.title,
          type: d.deductionType,
          amount: d.amount,
        })),
      ],
      summary: {
        grossPay: payslip.grossPay,
        totalDeductions: payslip.totalDeductions,
        netPay: payslip.netPay,
      },
    };

    return statement;
  }
}
