import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AttendanceStatus } from '@school/shared-types';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EmployeeAttendanceService {
  private readonly logger = new Logger(EmployeeAttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getRosterForDate(
    organizationId: string,
    campusId?: string,
    departmentId?: string,
    dateStr?: string,
  ) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const employees = await this.prisma.employeeProfile.findMany({
      where: {
        user: { organizationId, ...(campusId ? { campusId } : {}) },
        ...(departmentId ? { departmentId } : {}),
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        designationRel: { select: { id: true, title: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    const employeeIds = employees.map((e) => e.id);

    const attendanceRecords = await this.prisma.employeeAttendance.findMany({
      where: {
        date: targetDate,
        employeeId: { in: employeeIds },
      },
    });

    const recordMap = new Map<string, any>();
    attendanceRecords.forEach((r) => recordMap.set(r.employeeId, r));

    return employees.map((emp) => {
      const rec = recordMap.get(emp.id);
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        name: `${emp.user.firstName} ${emp.user.lastName}`,
        department: emp.department?.name || 'General',
        designation: emp.designationRel?.title || emp.designation,
        status: rec ? rec.status : AttendanceStatus.PRESENT,
        checkInTime: rec?.checkInTime || null,
        checkOutTime: rec?.checkOutTime || null,
        source: rec?.source || 'MANUAL',
        remarks: rec?.remarks || null,
        isLocked: rec?.isLocked || false,
      };
    });
  }

  async markAttendance(
    user: CurrentUserPayload,
    dto: {
      employeeId: string;
      date: string;
      status: any;
      checkInTime?: string;
      checkOutTime?: string;
      source?: any;
      remarks?: string;
    },
  ) {
    const date = new Date(dto.date);
    date.setUTCHours(0, 0, 0, 0);

    const employee = await this.prisma.employeeProfile.findUnique({
      where: { id: dto.employeeId },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);

    const checkIn = dto.checkInTime ? new Date(dto.checkInTime) : null;
    const checkOut = dto.checkOutTime ? new Date(dto.checkOutTime) : null;

    if (checkIn && checkOut && checkOut < checkIn) {
      throw new BadRequestException('Check-out time cannot be earlier than check-in time');
    }

    const rec = await this.prisma.employeeAttendance.upsert({
      where: {
        employeeId_date: {
          employeeId: dto.employeeId,
          date,
        },
      },
      update: {
        status: dto.status,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        source: dto.source || 'WEB',
        remarks: dto.remarks || null,
        updatedBy: user.id,
      },
      create: {
        organizationId: user.organizationId,
        campusId: employee.user.campusId || null,
        employeeId: dto.employeeId,
        date,
        status: dto.status,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        source: dto.source || 'WEB',
        remarks: dto.remarks || null,
        createdBy: user.id,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      campusId: employee.user.campusId || undefined,
      userId: user.id,
      action: 'MARK_EMPLOYEE_ATTENDANCE',
      module: 'attendance',
      resourceId: rec.id,
      newValues: {
        employeeId: dto.employeeId,
        date: dto.date,
        status: dto.status,
      },
    });

    return rec;
  }

  async logPunch(
    user: CurrentUserPayload,
    dto: {
      employeeId: string;
      punchType: 'CHECK_IN' | 'CHECK_OUT';
      timestamp?: string;
      source?: any;
    },
  ) {
    const timestamp = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);

    const employee = await this.prisma.employeeProfile.findUnique({
      where: { id: dto.employeeId },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);

    const existing = await this.prisma.employeeAttendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: dto.employeeId,
          date,
        },
      },
    });

    if (dto.punchType === 'CHECK_OUT') {
      if (!existing || !existing.checkInTime) {
        throw new BadRequestException('Cannot check out without prior check-in');
      }
      if (timestamp < existing.checkInTime) {
        throw new BadRequestException('Check-out time cannot be before check-in time');
      }

      return this.prisma.employeeAttendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: timestamp,
          updatedBy: user.id,
        },
      });
    } else {
      // CHECK_IN
      if (existing && existing.checkInTime) {
        // Already checked in today, update if needed or return existing
        return existing;
      }

      return this.prisma.employeeAttendance.upsert({
        where: {
          employeeId_date: {
            employeeId: dto.employeeId,
            date,
          },
        },
        update: {
          checkInTime: timestamp,
          status: AttendanceStatus.PRESENT,
          source: dto.source || 'WEB',
          updatedBy: user.id,
        },
        create: {
          organizationId: user.organizationId,
          campusId: employee.user.campusId || null,
          employeeId: dto.employeeId,
          date,
          status: AttendanceStatus.PRESENT,
          checkInTime: timestamp,
          source: dto.source || 'WEB',
          createdBy: user.id,
        },
      });
    }
  }

  async getEmployeeSummary(employeeId: string, startDateStr?: string, endDateStr?: string) {
    const where: any = { employeeId };

    if (startDateStr && endDateStr) {
      where.date = {
        gte: new Date(startDateStr),
        lte: new Date(endDateStr),
      };
    }

    const total = await this.prisma.employeeAttendance.count({ where });
    const present = await this.prisma.employeeAttendance.count({
      where: { ...where, status: AttendanceStatus.PRESENT },
    });
    const absent = await this.prisma.employeeAttendance.count({
      where: { ...where, status: AttendanceStatus.ABSENT },
    });
    const late = await this.prisma.employeeAttendance.count({
      where: { ...where, status: AttendanceStatus.LATE },
    });
    const halfDay = await this.prisma.employeeAttendance.count({
      where: { ...where, status: AttendanceStatus.HALF_DAY },
    });
    const onLeave = await this.prisma.employeeAttendance.count({
      where: { ...where, status: AttendanceStatus.ON_LEAVE },
    });

    const effective = present + late + halfDay * 0.5;
    const rate = total > 0 ? (effective / total) * 100 : 0;

    return {
      totalDays: total,
      present,
      absent,
      late,
      halfDay,
      onLeave,
      attendanceRate: Math.round(rate * 10) / 10,
    };
  }

  async getDepartmentSummary(organizationId: string, departmentId?: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const where: any = {
      organizationId,
      date: targetDate,
      ...(departmentId ? { employee: { departmentId } } : {}),
    };

    const [total, present, absent, late, onLeave] = await Promise.all([
      this.prisma.employeeAttendance.count({ where }),
      this.prisma.employeeAttendance.count({ where: { ...where, status: AttendanceStatus.PRESENT } }),
      this.prisma.employeeAttendance.count({ where: { ...where, status: AttendanceStatus.ABSENT } }),
      this.prisma.employeeAttendance.count({ where: { ...where, status: AttendanceStatus.LATE } }),
      this.prisma.employeeAttendance.count({ where: { ...where, status: AttendanceStatus.ON_LEAVE } }),
    ]);

    return {
      date: targetDate,
      total,
      present,
      absent,
      late,
      onLeave,
    };
  }
}
