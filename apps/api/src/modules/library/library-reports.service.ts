import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class LibraryReportsService {
  private readonly logger = new Logger(LibraryReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive bibliographic and physical inventory breakdown.
   */
  async getCatalogInventorySummary(user: CurrentUserPayload) {
    const orgId = user.organizationId;

    const [
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCopies,
      reservedCopies,
      lostCopies,
      damagedCopies,
      maintenanceCopies,
    ] = await Promise.all([
      this.prisma.book.count({ where: { organizationId: orgId } }),
      this.prisma.bookCopy.count({ where: { book: { organizationId: orgId } } }),
      this.prisma.bookCopy.count({ where: { book: { organizationId: orgId }, status: 'AVAILABLE' } }),
      this.prisma.bookCopy.count({ where: { book: { organizationId: orgId }, status: 'ISSUED' } }),
      this.prisma.bookCopy.count({ where: { book: { organizationId: orgId }, status: 'RESERVED' } }),
      this.prisma.bookCopy.count({ where: { book: { organizationId: orgId }, status: 'LOST' } }),
      this.prisma.bookCopy.count({ where: { book: { organizationId: orgId }, status: 'DAMAGED' } }),
      this.prisma.bookCopy.count({ where: { book: { organizationId: orgId }, status: 'UNDER_MAINTENANCE' } }),
    ]);

    // Group copies by condition
    const conditionStats = await this.prisma.bookCopy.groupBy({
      by: ['condition'],
      where: { book: { organizationId: orgId } },
      _count: { id: true },
    });

    // Group copies by category
    const categoryStats = await this.prisma.bookCategory.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        code: true,
        _count: { select: { books: true } },
      },
    });

    return {
      totalTitles,
      totalCopies,
      statusBreakdown: {
        available: availableCopies,
        issued: issuedCopies,
        reserved: reservedCopies,
        lost: lostCopies,
        damaged: damagedCopies,
        underMaintenance: maintenanceCopies,
      },
      conditionBreakdown: conditionStats.reduce((acc, curr) => {
        acc[curr.condition] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      categories: categoryStats.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        titleCount: c._count.books,
      })),
    };
  }

  /**
   * Circulation analytics including active loans, overdue counts, and reservation holds.
   */
  async getCirculationAnalytics(user: CurrentUserPayload) {
    const orgId = user.organizationId;
    const now = new Date();

    const [
      activeLoans,
      overdueLoans,
      totalMembers,
      pendingReservations,
      finesSummary,
    ] = await Promise.all([
      this.prisma.libraryLoan.count({
        where: {
          copy: { book: { organizationId: orgId } },
          status: 'ACTIVE',
        },
      }),
      this.prisma.libraryLoan.count({
        where: {
          copy: { book: { organizationId: orgId } },
          status: { in: ['ACTIVE', 'OVERDUE'] },
          dueDate: { lt: now },
        },
      }),
      this.prisma.libraryMember.count({
        where: { organizationId: orgId, status: 'ACTIVE' },
      }),
      this.prisma.libraryReservation.count({
        where: {
          book: { organizationId: orgId },
          status: { in: ['PENDING', 'AVAILABLE_FOR_PICKUP'] },
        },
      }),
      this.prisma.libraryFine.groupBy({
        by: ['status'],
        where: { member: { organizationId: orgId } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    let totalAssessed = 0;
    let totalPaid = 0;
    let totalWaived = 0;

    for (const f of finesSummary) {
      const sum = Number(f._sum.amount || 0);
      if (f.status === 'ASSESSED') totalAssessed += sum;
      else if (f.status === 'PAID') totalPaid += sum;
      else if (f.status === 'WAIVED') totalWaived += sum;
    }

    const outstandingFines = totalAssessed;

    return {
      activeLoans,
      overdueLoans,
      totalMembers,
      pendingReservations,
      fines: {
        outstandingAmount: Math.round(outstandingFines * 100) / 100,
        paidAmount: Math.round(totalPaid * 100) / 100,
        waivedAmount: Math.round(totalWaived * 100) / 100,
      },
    };
  }

  /**
   * Overdue report listing patrons with overdue loans and accrued fine projections.
   */
  async getOverdueReport(user: CurrentUserPayload) {
    const orgId = user.organizationId;
    const now = new Date();

    const overdueLoans = await this.prisma.libraryLoan.findMany({
      where: {
        copy: { book: { organizationId: orgId } },
        status: { in: ['ACTIVE', 'OVERDUE'] },
        dueDate: { lt: now },
      },
      include: {
        copy: {
          include: {
            book: { select: { id: true, title: true, isbn13: true } },
            location: true,
          },
        },
        member: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            studentProfile: true,
            employeeProfile: true,
          },
        },
        fines: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return overdueLoans.map((loan) => {
      const diffMs = now.getTime() - loan.dueDate.getTime();
      const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const projectedFine = Math.min(50.0, Math.max(0, (overdueDays - 1) * 1.0));

      return {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        member: {
          id: loan.member.id,
          name: `${loan.member.user.firstName} ${loan.member.user.lastName}`,
          memberType: loan.member.memberType,
          email: loan.member.user.email,
          phone: loan.member.user.phone,
        },
        item: {
          title: loan.copy.book.title,
          accessionNumber: loan.copy.accessionNumber,
          shelf: loan.copy.location?.shelf || 'General',
        },
        issueDate: loan.issueDate,
        dueDate: loan.dueDate,
        overdueDays,
        projectedFine,
      };
    });
  }

  /**
   * Lost and damaged book copy register for inventory reconciliation and audit.
   */
  async getLostDamagedReport(user: CurrentUserPayload) {
    const orgId = user.organizationId;

    const copies = await this.prisma.bookCopy.findMany({
      where: {
        book: { organizationId: orgId },
        status: { in: ['LOST', 'DAMAGED'] },
      },
      include: {
        book: { select: { id: true, title: true, isbn13: true, isbn10: true } },
        location: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return copies.map((copy) => ({
      id: copy.id,
      accessionNumber: copy.accessionNumber,
      barcode: copy.barcode,
      title: copy.book.title,
      status: copy.status,
      condition: copy.condition,
      cost: copy.cost ? Number(copy.cost) : null,
      notes: copy.notes,
      updatedAt: copy.updatedAt,
    }));
  }
}
