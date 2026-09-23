// =============================================================================
// Phase 4P: Teacher Employee Self-Service (Leave & Staff Timesheets)
// =============================================================================
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ITeacherLeaveSummary,
  ITeacherLeaveApplicationDto,
} from '@school/shared-types';

@Injectable()
export class TeacherSelfServiceService {
  private readonly logger = new Logger(TeacherSelfServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves teacher's own leave balances and recent application history.
   */
  async getLeaveSummary(userId: string): Promise<ITeacherLeaveSummary> {
    const [balances, applications] = await Promise.all([
      this.prisma.leaveBalance.findMany({
        where: { userId },
        include: { leaveType: true },
      }),
      this.prisma.leaveApplication.findMany({
        where: { userId },
        include: { leaveType: true },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    return {
      leaveBalances: balances.map((b) => ({
        leaveTypeId: b.leaveTypeId,
        leaveTypeName: b.leaveType.name,
        allocatedDays: Number(b.allocatedDays),
        usedDays: Number(b.usedDays),
        remainingDays: Math.max(0, Number(b.allocatedDays) - Number(b.usedDays)),
      })),
      recentApplications: applications.map((a) => ({
        id: a.id,
        leaveTypeName: a.leaveType.name,
        startDate: a.startDate.toISOString().split('T')[0],
        endDate: a.endDate.toISOString().split('T')[0],
        daysCount: Number(a.daysCount || 1),
        reason: a.reason,
        status: a.status as any,
        appliedAt: a.createdAt.toISOString().split('T')[0],
      })),
    };
  }

  /**
   * Submits a leave application for the authenticated teacher.
   */
  async applyForLeave(userId: string, dto: ITeacherLeaveApplicationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user) throw new NotFoundException('User profile not found.');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end < start) {
      throw new BadRequestException('End date cannot precede start date.');
    }

    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

    const application = await this.prisma.leaveApplication.create({
      data: {
        organizationId: user.organizationId,
        userId,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: end,
        daysCount: diffDays,
        reason: dto.reason,
        status: 'PENDING',
      },
    });

    await this.auditService.log({
      action: 'TEACHER_LEAVE_APPLIED',
      entity: 'LeaveApplication',
      entityId: application.id,
      userId,
      details: {
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        daysCount: diffDays,
      },
    });

    return {
      success: true,
      message: 'Leave application submitted for supervisor approval.',
      applicationId: application.id,
    };
  }

  /**
   * Retrieves the teacher's own employee clock-in/out records.
   * Cleanly separated from student daily attendance!
   */
  async getStaffAttendance(userId: string) {
    const records = await this.prisma.staffAttendanceRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    return records.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split('T')[0],
      checkInTime: r.checkInTime ? r.checkInTime.toISOString() : null,
      checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
      status: r.status,
      remarks: r.remarks,
    }));
  }

  /**
   * Alias for getStaffAttendance.
   */
  async getAttendanceTimesheet(userId: string) {
    return this.getStaffAttendance(userId);
  }
}
