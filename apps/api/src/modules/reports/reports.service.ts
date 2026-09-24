import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 1. Preserved Legacy Acceptance Endpoints (Phase 3 Verified)
  // ---------------------------------------------------------------------------

  async getStudentListReport(user: CurrentUserPayload, filters: {
    campusId?: string;
    classId?: string;
    sectionId?: string;
    status?: string;
  }) {
    const where: any = {
      user: {
        organizationId: user.organizationId,
        ...(filters.status ? { status: filters.status } : {}),
      },
    };

    if (filters.campusId) {
      where.campusId = filters.campusId;
    }

    if (filters.classId || filters.sectionId) {
      where.enrollments = {
        some: {
          status: 'ACTIVE',
          ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
          ...(filters.classId ? { section: { classId: filters.classId } } : {}),
        },
      };
    }

    const students = await this.prisma.studentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            gender: true,
            campus: {
              select: { id: true, name: true },
            },
          },
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            section: {
              include: {
                class: true,
              },
            },
          },
        },
      },
      orderBy: { admissionNumber: 'asc' },
    });

    return {
      generatedAt: new Date().toISOString(),
      totalStudents: students.length,
      data: students.map((s) => ({
        id: s.id,
        admissionNumber: s.admissionNumber,
        name: `${s.user.firstName} ${s.user.lastName}`,
        email: s.user.email,
        phone: s.user.phone,
        gender: s.user.gender,
        campusName: s.user.campus?.name,
        className: s.enrollments[0]?.section?.class?.name ?? 'Unassigned',
        sectionName: s.enrollments[0]?.section?.name ?? 'Unassigned',
        rollNumber: s.enrollments[0]?.rollNumber ?? 'N/A',
        status: s.user.status,
      })),
    };
  }

  async getAttendanceSummaryReport(filters: {
    sectionId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (filters.sectionId) where.sectionId = filters.sectionId;
    if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    const records = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    });

    const statusCounts: Record<string, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      EXCUSED: 0,
    };

    let total = 0;
    records.forEach((r) => {
      statusCounts[r.status] = r._count.id;
      total += r._count.id;
    });

    const presentRate =
      total > 0 ? ((statusCounts.PRESENT + statusCounts.LATE) / total) * 100 : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalRecords: total,
      counts: statusCounts,
      attendanceRate: Math.round(presentRate * 10) / 10,
    };
  }

  async getFeeSummaryReport(user: CurrentUserPayload, academicYearId?: string) {
    const where: any = {
      academicYear: {
        organizationId: user.organizationId,
        ...(academicYearId ? { id: academicYearId } : {}),
      },
    };

    const invoices = await this.prisma.feeInvoice.findMany({
      where,
      select: {
        amount: true,
        paidAmount: true,
        status: true,
      },
    });

    let totalInvoiced = 0;
    let totalCollected = 0;
    const countByStatus: Record<string, number> = {
      PENDING: 0,
      PARTIAL: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    };

    invoices.forEach((inv) => {
      const amt = Number(inv.amount);
      const paid = Number(inv.paidAmount);
      totalInvoiced += amt;
      totalCollected += paid;
      countByStatus[inv.status] = (countByStatus[inv.status] || 0) + 1;
    });

    const outstandingBalance = totalInvoiced - totalCollected;
    const collectionRate =
      totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    return {
      generatedAt: new Date().toISOString(),
      totalInvoicesCount: invoices.length,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      collectionRate: Math.round(collectionRate * 10) / 10,
      statusBreakdown: countByStatus,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Report Execution Logs
  // ---------------------------------------------------------------------------

  async getExecutionLogs(organizationId: string, limit = 20) {
    return this.prisma.reportExecutionLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
