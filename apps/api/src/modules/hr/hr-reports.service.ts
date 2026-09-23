import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { HrAnalyticsSummary } from '@school/shared-types';

@Injectable()
export class HrReportsService {
  private readonly logger = new Logger(HrReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves overall headcount stats and status distribution
   */
  async getHeadcountAnalytics(user: CurrentUserPayload, campusId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;

    const [total, active, onProbation, onLeave, suspended, resigned, terminated] =
      await Promise.all([
        this.prisma.employeeProfile.count({ where }),
        this.prisma.employeeProfile.count({ where: { ...where, lifecycleStatus: 'ACTIVE' } }),
        this.prisma.employeeProfile.count({ where: { ...where, lifecycleStatus: 'ON_PROBATION' } }),
        this.prisma.employeeProfile.count({ where: { ...where, lifecycleStatus: 'ON_LEAVE' } }),
        this.prisma.employeeProfile.count({ where: { ...where, lifecycleStatus: 'SUSPENDED' } }),
        this.prisma.employeeProfile.count({ where: { ...where, lifecycleStatus: 'RESIGNED' } }),
        this.prisma.employeeProfile.count({ where: { ...where, lifecycleStatus: 'TERMINATED' } }),
      ]);

    return {
      total,
      active,
      onProbation,
      onLeave,
      suspended,
      resigned,
      terminated,
    };
  }

  /**
   * Retrieves department employee distribution
   */
  async getDepartmentDistribution(user: CurrentUserPayload, campusId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;

    const departments = await this.prisma.department.findMany({
      where: { organizationId: user.organizationId },
      include: {
        employees: {
          where,
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const unassignedCount = await this.prisma.employeeProfile.count({
      where: { ...where, departmentId: null },
    });

    const distribution = departments.map((dept) => ({
      departmentId: dept.id,
      departmentName: dept.name,
      count: dept.employees.length,
    }));

    if (unassignedCount > 0) {
      distribution.push({
        departmentId: 'unassigned',
        departmentName: 'Unassigned',
        count: unassignedCount,
      });
    }

    return distribution;
  }

  /**
   * Retrieves contracts expiring within the specified days (default: 30)
   */
  async getContractsExpiringSoon(user: CurrentUserPayload, days: number = 30) {
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const contracts = await this.prisma.employmentContract.findMany({
      where: {
        employee: { organizationId: user.organizationId },
        status: { in: ['ACTIVE', 'EXPIRING'] },
        endDate: {
          gte: now,
          lte: threshold,
        },
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            department: true,
            designationRel: true,
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return contracts;
  }

  /**
   * Produces consolidated HR Analytics Summary
   */
  async getHrAnalyticsSummary(
    user: CurrentUserPayload,
    campusId?: string,
  ): Promise<HrAnalyticsSummary> {
    const headcount = await this.getHeadcountAnalytics(user, campusId);
    const departmentDist = await this.getDepartmentDistribution(user, campusId);

    const now = new Date();
    const threshold30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringContractsCount = await this.prisma.employmentContract.count({
      where: {
        employee: { organizationId: user.organizationId },
        status: { in: ['ACTIVE', 'EXPIRING'] },
        endDate: {
          gte: now,
          lte: threshold30d,
        },
      },
    });

    // Query latest payroll run for high-level executive view
    const latestPayrollRun = await this.prisma.payrollRun.findFirst({
      where: {
        payrollPeriod: { organizationId: user.organizationId },
      },
      include: { payrollPeriod: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      headcount: {
        total: headcount.total,
        active: headcount.active,
        onProbation: headcount.onProbation,
        onLeave: headcount.onLeave,
      },
      departmentDistribution: departmentDist.map((d) => ({
        departmentName: d.departmentName,
        count: d.count,
      })),
      contractsExpiringSoonCount: expiringContractsCount,
      latestPayrollSummary: latestPayrollRun
        ? {
            periodName: latestPayrollRun.payrollPeriod.name,
            totalGross: Number(latestPayrollRun.totalGross),
            totalNet: Number(latestPayrollRun.totalNet),
            status: latestPayrollRun.status,
          }
        : null,
    };
  }
}
