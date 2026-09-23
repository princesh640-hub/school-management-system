import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { RegisterLibraryMemberDto } from './dto/library.dto';
import { BorrowingEligibilityResult, LibraryMemberStatement } from '@school/shared-types';

@Injectable()
export class LibraryMembersService {
  private readonly logger = new Logger(LibraryMembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates sequential collision-safe library membership numbers: LIB-YYYY-XXXXX
   */
  async generateSequentialMembershipNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LIB-${year}-`;

    const count = await this.prisma.libraryMember.count({
      where: { membershipNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const membershipNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.libraryMember.findUnique({
      where: { membershipNumber },
    });
    if (!exists) return membershipNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  async registerMember(user: CurrentUserPayload, dto: RegisterLibraryMemberDto) {
    const existing = await this.prisma.libraryMember.findFirst({
      where: {
        organizationId: user.organizationId,
        userId: dto.userId,
      },
    });
    if (existing) {
      throw new BadRequestException('User is already registered as a library member');
    }

    const membershipNumber =
      dto.membershipNumber?.trim() || (await this.generateSequentialMembershipNumber());

    // Derive memberType default limits if not specified:
    // STUDENT: 2 books, 14 days
    // TEACHER: 5 books, 30 days
    // STAFF: 3 books, 14 days
    const memberType = dto.memberType || 'STUDENT';
    let defaultLimit = 2;
    let defaultDays = 14;

    if (memberType === 'TEACHER') {
      defaultLimit = 5;
      defaultDays = 30;
    } else if (memberType === 'STAFF') {
      defaultLimit = 3;
      defaultDays = 14;
    }

    const borrowingLimit = dto.borrowingLimit || defaultLimit;
    const maxBorrowDays = dto.maxBorrowDays || defaultDays;

    const member = await this.prisma.libraryMember.create({
      data: {
        organizationId: user.organizationId,
        userId: dto.userId,
        studentProfileId: dto.studentProfileId || null,
        employeeProfileId: dto.employeeProfileId || null,
        membershipNumber,
        memberType,
        borrowingLimit,
        maxBorrowDays,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: 'ACTIVE',
        notes: dto.notes || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        studentProfile: true,
        employeeProfile: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REGISTER_LIBRARY_MEMBER',
      resource: 'LIBRARY_MEMBER',
      resourceId: member.id,
      details: { membershipNumber, memberType, borrowingLimit },
    });

    return member;
  }

  async getMembers(
    user: CurrentUserPayload,
    query?: {
      search?: string;
      memberType?: string;
      status?: string;
    },
  ) {
    const where: any = { organizationId: user.organizationId };

    if (query?.memberType) where.memberType = query.memberType;
    if (query?.status) where.status = query.status;

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { membershipNumber: { contains: s, mode: 'insensitive' } },
        { user: { firstName: { contains: s, mode: 'insensitive' } } },
        { user: { lastName: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const members = await this.prisma.libraryMember.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        _count: {
          select: {
            loans: { where: { status: 'ACTIVE' } },
            fines: { where: { status: 'ASSESSED' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({
      ...m,
      activeLoansCount: m._count.loans,
      unpaidFinesCount: m._count.fines,
    }));
  }

  async getMemberById(id: string) {
    const member = await this.prisma.libraryMember.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        studentProfile: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true, section: true },
            },
          },
        },
        employeeProfile: {
          include: { department: true, designationRel: true },
        },
        loans: {
          where: { status: 'ACTIVE' },
          include: {
            copy: {
              include: { book: true, location: true },
            },
          },
        },
        fines: {
          where: { status: 'ASSESSED' },
        },
      },
    });

    if (!member) throw new NotFoundException('Library member not found');

    const unpaidFinesTotal = member.fines.reduce((acc, f) => acc + Number(f.amount), 0);

    return {
      ...member,
      activeLoansCount: member.loans.length,
      unpaidFinesTotal,
    };
  }

  async getMemberByCodeOrUserId(identifier: string) {
    const member = await this.prisma.libraryMember.findFirst({
      where: {
        OR: [
          { membershipNumber: identifier.trim() },
          { userId: identifier.trim() },
        ],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        studentProfile: true,
        employeeProfile: true,
        loans: {
          where: { status: 'ACTIVE' },
          include: { copy: { include: { book: true } } },
        },
      },
    });

    if (!member) throw new NotFoundException(`No library member found for "${identifier}"`);

    return member;
  }

  /**
   * Evaluates server-side borrowing eligibility before issuing loans
   */
  async verifyBorrowingEligibility(memberId: string): Promise<BorrowingEligibilityResult> {
    const member = await this.prisma.libraryMember.findUnique({
      where: { id: memberId },
      include: {
        loans: {
          where: { status: 'ACTIVE' },
          include: { copy: { include: { book: true } } },
        },
        fines: {
          where: { status: 'ASSESSED' },
        },
      },
    });

    if (!member) throw new NotFoundException('Library member not found');

    const blockingReasons: string[] = [];
    const now = new Date();

    // 1. Membership Status
    if (member.status !== 'ACTIVE') {
      blockingReasons.push(`Membership account is ${member.status}`);
    }

    // 2. Expiration Date
    if (member.endDate && new Date(member.endDate) < now) {
      blockingReasons.push('Membership card has expired');
    }

    // 3. Borrowing Limit
    const currentActiveLoans = member.loans.length;
    if (currentActiveLoans >= member.borrowingLimit) {
      blockingReasons.push(
        `Borrowing quota exhausted: currently holding ${currentActiveLoans} of ${member.borrowingLimit} books`,
      );
    }

    // 4. Overdue Items
    const overdueLoans = member.loans.filter((l) => new Date(l.dueDate) < now);
    if (overdueLoans.length > 0) {
      blockingReasons.push(
        `Member has ${overdueLoans.length} overdue book(s) that must be returned first`,
      );
    }

    // 5. Unpaid Fine Cap Check (e.g. fines > $20 blocks new borrowing)
    const unpaidFinesTotal = member.fines.reduce((acc, f) => acc + Number(f.amount), 0);
    if (unpaidFinesTotal >= 20) {
      blockingReasons.push(
        `Unpaid library fines exceed block threshold: $${unpaidFinesTotal.toFixed(2)} outstanding`,
      );
    }

    const availableAllowance = Math.max(0, member.borrowingLimit - currentActiveLoans);
    const isEligible = blockingReasons.length === 0;

    return {
      isEligible,
      memberId: member.id,
      membershipNumber: member.membershipNumber,
      memberType: member.memberType as any,
      currentActiveLoans,
      borrowingLimit: member.borrowingLimit,
      availableAllowance,
      unpaidFinesTotal,
      overdueLoansCount: overdueLoans.length,
      blockingReasons,
    };
  }

  /**
   * Evaluates server-side borrowing eligibility with user context
   */
  async validateEligibility(user: CurrentUserPayload, memberId: string) {
    const res = await this.verifyBorrowingEligibility(memberId);
    return {
      ...res,
      eligible: res.isEligible,
      reasons: res.blockingReasons,
    };
  }

  /**
   * Compiles comprehensive member borrowing statement
   */
  async getMemberStatement(userOrMemberId: CurrentUserPayload | string, memberIdArg?: string): Promise<LibraryMemberStatement> {
    const memberId = typeof userOrMemberId === 'string' ? userOrMemberId : memberIdArg!;

    const member = await this.prisma.libraryMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        loans: {
          include: {
            copy: { include: { book: true, location: true } },
          },
          orderBy: { issueDate: 'desc' },
        },
        reservations: {
          include: { book: true },
          orderBy: { reservationDate: 'desc' },
        },
        fines: {
          include: { loan: { include: { copy: { include: { book: true } } } } },
          orderBy: { assessedDate: 'desc' },
        },
      },
    });

    if (!member) throw new NotFoundException('Library member not found');

    const now = new Date();
    const activeLoans = member.loans.filter((l) => l.status === 'ACTIVE');
    const loanHistory = member.loans.filter((l) => l.status !== 'ACTIVE');
    const overdueCount = activeLoans.filter((l) => new Date(l.dueDate) < now).length;

    const totalFinesAssessed = member.fines.reduce((acc, f) => acc + Number(f.amount), 0);
    const totalFinesPaid = member.fines
      .filter((f) => f.status === 'PAID')
      .reduce((acc, f) => acc + Number(f.amount), 0);
    const outstandingFines = member.fines
      .filter((f) => f.status === 'ASSESSED')
      .reduce((acc, f) => acc + Number(f.amount), 0);

    return {
      member: {
        ...member,
        borrowingLimit: member.borrowingLimit,
        maxBorrowDays: member.maxBorrowDays,
      },
      activeLoans: activeLoans as any,
      loanHistory: loanHistory as any,
      reservations: member.reservations as any,
      fines: member.fines.map((f) => ({ ...f, amount: Number(f.amount) })) as any,
      summary: {
        totalBorrowedAllTime: member.loans.length,
        currentActiveLoans: activeLoans.length,
        overdueCount,
        totalFinesAssessed,
        totalFinesPaid,
        outstandingFines,
      },
    };
  }
}
