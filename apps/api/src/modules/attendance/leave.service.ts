import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AttendanceStatus } from '@school/shared-types';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Leave Types & Policies
  // ---------------------------------------------------------------------------

  async getLeaveTypes(organizationId: string) {
    return this.prisma.leaveType.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }

  async createLeaveType(organizationId: string, dto: any) {
    const existing = await this.prisma.leaveType.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Leave type with code ${dto.code} already exists`);
    }

    return this.prisma.leaveType.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description || null,
        isPaid: dto.isPaid ?? true,
        defaultDaysPerYear: dto.defaultDaysPerYear ?? 10,
        requiresDocument: dto.requiresDocument ?? false,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Working Day & Holiday Calculation Engine
  // ---------------------------------------------------------------------------

  async calculateWorkingDays(
    startDateStr: string,
    endDateStr: string,
    organizationId?: string,
    campusId?: string,
  ): Promise<number> {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    if (end < start) {
      throw new BadRequestException('End date cannot be prior to start date');
    }

    // Fetch official holidays from Phase 4C Academic Calendar
    const holidays = organizationId
      ? await this.prisma.academicCalendarEvent.findMany({
          where: {
            organizationId,
            ...(campusId ? { campusId } : {}),
            isHoliday: true,
            startDate: { lte: end },
            endDate: { gte: start },
          },
        })
      : [];

    let workingDays = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dayOfWeek = cur.getUTCDay();
      // Exclude Saturday (6) and Sunday (0)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const isHoliday = holidays.some((h) => {
        const hStart = new Date(h.startDate);
        const hEnd = new Date(h.endDate);
        hStart.setUTCHours(0, 0, 0, 0);
        hEnd.setUTCHours(0, 0, 0, 0);
        return cur >= hStart && cur <= hEnd;
      });

      if (!isWeekend && !isHoliday) {
        workingDays++;
      }

      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    // If completely falls on weekend/holidays, return 1 to represent minimum event
    return Math.max(1, workingDays);
  }

  // ---------------------------------------------------------------------------
  // 3. Leave Balances & Allocations
  // ---------------------------------------------------------------------------

  async getEmployeeBalances(employeeId: string, year = new Date().getFullYear()) {
    return this.prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }

  async allocateBalance(
    organizationId: string,
    dto: { employeeId: string; leaveTypeId: string; year: number; amount: number; reason?: string },
    performedBy?: string,
  ) {
    const existing = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
    });

    let balance;
    if (existing) {
      balance = await this.prisma.leaveBalance.update({
        where: { id: existing.id },
        data: {
          accrued: { increment: dto.amount },
          closingBalance: { increment: dto.amount },
        },
      });
    } else {
      balance = await this.prisma.leaveBalance.create({
        data: {
          organizationId,
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
          openingBalance: dto.amount,
          accrued: dto.amount,
          closingBalance: dto.amount,
        },
      });
    }

    await this.prisma.leaveBalanceTransaction.create({
      data: {
        leaveBalanceId: balance.id,
        transactionType: 'ALLOCATION',
        amount: dto.amount,
        reason: dto.reason || 'Manual Allocation',
        performedBy,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: performedBy || 'system',
      action: 'ALLOCATE_LEAVE_BALANCE',
      module: 'attendance',
      resourceId: balance.id,
      newValues: dto,
    });

    return balance;
  }

  // ---------------------------------------------------------------------------
  // 4. Leave Application & Approval Workflow
  // ---------------------------------------------------------------------------

  async applyLeave(user: CurrentUserPayload, dto: any) {
    const employee = await this.prisma.employeeProfile.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Employee profile not found for user');

    const durationDays = await this.calculateWorkingDays(
      dto.startDate,
      dto.endDate,
      user.organizationId,
      employee.user.campusId || undefined,
    );

    const year = new Date(dto.startDate).getFullYear();

    // Check balance
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId: dto.leaveTypeId,
          year,
        },
      },
    });

    if (balance && Number(balance.closingBalance) < durationDays) {
      throw new BadRequestException(
        `Insufficient leave balance (Available: ${balance.closingBalance}, Requested: ${durationDays} days)`,
      );
    }

    // Check overlapping approved/submitted requests
    const overlap = await this.prisma.leaveApplication.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] },
        startDate: { lte: new Date(dto.endDate) },
        endDate: { gte: new Date(dto.startDate) },
      },
    });

    if (overlap) {
      throw new ConflictException('You already have a submitted or approved leave application for these dates');
    }

    // Create application and reserve pending balance
    const application = await this.prisma.$transaction(async (tx) => {
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pending: { increment: durationDays } },
        });
      }

      return tx.leaveApplication.create({
        data: {
          organizationId: user.organizationId,
          campusId: employee.user.campusId || null,
          employeeId: employee.id,
          leaveTypeId: dto.leaveTypeId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          durationDays,
          reason: dto.reason,
          supportingDocumentUrl: dto.supportingDocumentUrl || null,
          status: 'SUBMITTED',
          createdBy: user.id,
        },
        include: {
          leaveType: true,
          employee: { include: { user: true } },
        },
      });
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      campusId: employee.user.campusId || undefined,
      userId: user.id,
      action: 'SUBMIT_LEAVE_APPLICATION',
      module: 'attendance',
      resourceId: application.id,
      newValues: {
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        durationDays,
      },
    });

    return application;
  }

  async reviewLeave(
    user: CurrentUserPayload,
    applicationId: string,
    dto: { decision: 'APPROVE' | 'REJECT'; decisionNotes?: string },
  ) {
    const application = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: { employee: { include: { user: true } }, leaveType: true },
    });

    if (!application) throw new NotFoundException(`Leave application with ID ${applicationId} not found`);

    if (application.status !== 'SUBMITTED' && application.status !== 'UNDER_REVIEW') {
      throw new ConflictException(`Leave application has already been finalized (${application.status})`);
    }

    const year = new Date(application.startDate).getFullYear();
    const duration = Number(application.durationDays);

    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: application.employeeId,
          leaveTypeId: application.leaveTypeId,
          year,
        },
      },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.decision === 'APPROVE') {
        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              used: { increment: duration },
              pending: { decrement: duration },
              closingBalance: { decrement: duration },
            },
          });

          await tx.leaveBalanceTransaction.create({
            data: {
              leaveBalanceId: balance.id,
              transactionType: 'USAGE',
              amount: duration,
              reason: `Leave approved: ${application.id}`,
              applicationId: application.id,
              performedBy: user.id,
            },
          });
        }

        // Auto-mark employee attendance as ON_LEAVE for leave duration
        const cur = new Date(application.startDate);
        const end = new Date(application.endDate);
        while (cur <= end) {
          const dateCopy = new Date(cur);
          dateCopy.setUTCHours(0, 0, 0, 0);

          await tx.employeeAttendance.upsert({
            where: {
              employeeId_date: {
                employeeId: application.employeeId,
                date: dateCopy,
              },
            },
            update: {
              status: AttendanceStatus.ON_LEAVE,
              remarks: `Approved ${application.leaveType.name}`,
              updatedBy: user.id,
            },
            create: {
              organizationId: application.organizationId,
              campusId: application.campusId,
              employeeId: application.employeeId,
              date: dateCopy,
              status: AttendanceStatus.ON_LEAVE,
              remarks: `Approved ${application.leaveType.name}`,
              createdBy: user.id,
            },
          });

          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        return tx.leaveApplication.update({
          where: { id: applicationId },
          data: {
            status: 'APPROVED',
            reviewerId: user.id,
            decisionNotes: dto.decisionNotes || null,
            reviewedAt: new Date(),
            updatedBy: user.id,
          },
        });
      } else {
        // REJECT: release pending balance
        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: { pending: { decrement: duration } },
          });
        }

        return tx.leaveApplication.update({
          where: { id: applicationId },
          data: {
            status: 'REJECTED',
            reviewerId: user.id,
            decisionNotes: dto.decisionNotes || null,
            reviewedAt: new Date(),
            updatedBy: user.id,
          },
        });
      }
    });

    await this.auditService.log({
      organizationId: application.organizationId,
      campusId: application.campusId || undefined,
      userId: user.id,
      action: dto.decision === 'APPROVE' ? 'APPROVE_LEAVE_APPLICATION' : 'REJECT_LEAVE_APPLICATION',
      module: 'attendance',
      resourceId: applicationId,
      newValues: { decision: dto.decision, decisionNotes: dto.decisionNotes },
    });

    return updated;
  }

  async cancelLeave(user: CurrentUserPayload, applicationId: string) {
    const application = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) throw new NotFoundException(`Leave application with ID ${applicationId} not found`);

    if (application.status !== 'SUBMITTED') {
      throw new ConflictException('Only pending/submitted leave applications can be cancelled');
    }

    const year = new Date(application.startDate).getFullYear();
    const duration = Number(application.durationDays);

    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: application.employeeId,
          leaveTypeId: application.leaveTypeId,
          year,
        },
      },
    });

    return this.prisma.$transaction(async (tx) => {
      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { pending: { decrement: duration } },
        });
      }

      return tx.leaveApplication.update({
        where: { id: applicationId },
        data: {
          status: 'CANCELLED',
          updatedBy: user.id,
        },
      });
    });
  }

  async getLeaveApplications(
    organizationId: string,
    query?: { campusId?: string; employeeId?: string; status?: any; departmentId?: string },
  ) {
    return this.prisma.leaveApplication.findMany({
      where: {
        organizationId,
        ...(query?.campusId ? { campusId: query.campusId } : {}),
        ...(query?.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query?.status ? { status: query.status } : {}),
        ...(query?.departmentId ? { employee: { departmentId: query.departmentId } } : {}),
      },
      include: {
        leaveType: true,
        employee: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            department: { select: { id: true, name: true } },
          },
        },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeaveCalendar(organizationId: string, campusId?: string, month?: number, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, month ? month - 1 : 0, 1);
    const endDate = new Date(targetYear, month ? month : 12, 0);

    return this.prisma.leaveApplication.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        employee: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
  }
}
