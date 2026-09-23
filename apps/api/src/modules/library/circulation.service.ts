import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { IssueBookDto, ReturnBookDto, RenewLoanDto } from './dto/library.dto';
import { LibraryMembersService } from './library-members.service';
import { LibraryFinesService } from './library-fines.service';
import { ReservationsService } from './reservations.service';

@Injectable()
export class CirculationService {
  private readonly logger = new Logger(CirculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly membersService: LibraryMembersService,
    private readonly finesService: LibraryFinesService,
    private readonly reservationsService: ReservationsService,
  ) {}

  /**
   * Generates sequential collision-safe loan numbers: LOAN-YYYY-XXXXX
   */
  async generateSequentialLoanNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LOAN-${year}-`;

    const count = await this.prisma.libraryLoan.count({
      where: { loanNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const loanNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.libraryLoan.findUnique({
      where: { loanNumber },
    });
    if (!exists) return loanNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Issues a physical book copy to a library member with eligibility and concurrency validation.
   */
  async issueBook(user: CurrentUserPayload, dto: IssueBookDto) {
    // 1. Validate eligibility
    const eligibility = await this.membersService.validateEligibility(user, dto.memberId);
    if (!eligibility.eligible) {
      throw new BadRequestException(
        `Member is not eligible to borrow books: ${eligibility.reasons.join(', ')}`,
      );
    }

    const member = await this.prisma.libraryMember.findUnique({
      where: { id: dto.memberId },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Library member not found');

    // 2. Concurrency check & transactional issue
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.bookCopy.findUnique({
        where: { id: dto.copyId },
        include: { book: true, location: true },
      });

      if (!copy || copy.book.organizationId !== user.organizationId) {
        throw new NotFoundException('Book copy not found');
      }

      // Check available status
      if (copy.status !== 'AVAILABLE') {
        // If it was marked RESERVED, check if this member is the one with the reservation
        if (copy.status === 'RESERVED') {
          const reservedHold = await tx.libraryReservation.findFirst({
            where: {
              bookId: copy.bookId,
              memberId: dto.memberId,
              status: 'AVAILABLE_FOR_PICKUP',
            },
          });
          if (!reservedHold) {
            throw new BadRequestException(
              `Book copy is currently reserved for another patron or pending pickup. Current status: ${copy.status}`,
            );
          }
        } else {
          throw new BadRequestException(
            `Book copy is not available for issue. Current status: ${copy.status}`,
          );
        }
      }

      // Check if there is an active reservation by another member
      const topReservation = await tx.libraryReservation.findFirst({
        where: {
          bookId: copy.bookId,
          status: { in: ['PENDING', 'AVAILABLE_FOR_PICKUP'] },
        },
        orderBy: { queuePosition: 'asc' },
      });

      let fulfilledReservationId: string | null = null;
      if (topReservation) {
        if (topReservation.memberId !== dto.memberId) {
          throw new BadRequestException(
            `This title is reserved for another member (${topReservation.reservationNumber}). Cannot issue to this patron.`,
          );
        } else {
          fulfilledReservationId = topReservation.id;
        }
      }

      // Compute due date
      const maxDays = member.maxBorrowDays || 14;
      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000);

      const loanNumber = await this.generateSequentialLoanNumber();

      const loan = await tx.libraryLoan.create({
        data: {
          loanNumber,
          copyId: copy.id,
          memberId: member.id,
          issueDate: new Date(),
          dueDate,
          renewalCount: 0,
          status: 'ACTIVE',
          issuedById: user.userId,
          notes: dto.notes || null,
        },
        include: {
          copy: {
            include: {
              book: { select: { id: true, title: true, isbn13: true, isbn10: true } },
              location: true,
            },
          },
          member: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      // Update copy status to ISSUED
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: 'ISSUED' },
      });

      // If fulfilling reservation
      if (fulfilledReservationId) {
        await tx.libraryReservation.update({
          where: { id: fulfilledReservationId },
          data: { status: 'FULFILLED' },
        });
      }

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.userId,
        action: 'CREATE',
        module: 'library',
        resourceId: loan.id,
        newValues: {
          loanNumber: loan.loanNumber,
          copyId: copy.id,
          accessionNumber: copy.accessionNumber,
          memberId: member.id,
          dueDate: loan.dueDate,
        },
      });

      return loan;
    });
  }

  /**
   * Returns an issued physical book copy, updates condition, calculates overdue fines,
   * and auto-allocates to next pending reservation queue if present.
   */
  async returnBook(user: CurrentUserPayload, dto: ReturnBookDto) {
    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.libraryLoan.findFirst({
        where: {
          copyId: dto.copyId,
          status: { in: ['ACTIVE', 'OVERDUE'] },
        },
        include: {
          copy: { include: { book: true } },
          member: { include: { user: true } },
        },
      });

      if (!loan || loan.copy.book.organizationId !== user.organizationId) {
        throw new NotFoundException('No active or overdue loan found for this book copy');
      }

      const returnCondition = (dto.returnCondition as any) || loan.copy.condition || 'GOOD';
      const returnDate = new Date();

      // Check overdue fine
      let fineAssessed = null;
      const overdueCalc = this.finesService.calculateOverdueFine(loan.dueDate, returnDate);
      if (overdueCalc.fineAmount > 0) {
        const fineNumber = await this.finesService.generateSequentialFineNumber();
        fineAssessed = await tx.libraryFine.create({
          data: {
            fineNumber,
            loanId: loan.id,
            memberId: loan.memberId,
            amount: overdueCalc.fineAmount,
            reason: `Overdue book return (${overdueCalc.overdueDays} days late)`,
            status: 'ASSESSED',
            assessedDate: returnDate,
            notes: `Auto-assessed on return: ${overdueCalc.overdueDays} days overdue`,
          },
        });
      }

      // Update loan status
      const updatedLoan = await tx.libraryLoan.update({
        where: { id: loan.id },
        data: {
          returnDate,
          returnCondition,
          returnedById: user.userId,
          status: 'RETURNED',
          notes: dto.notes
            ? `${loan.notes || ''} [Return: ${dto.notes}]`.trim()
            : loan.notes,
        },
        include: {
          copy: { include: { book: true, location: true } },
          member: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          fines: true,
        },
      });

      // Check next pending reservation for this book
      const nextReservation = await tx.libraryReservation.findFirst({
        where: {
          bookId: loan.copy.bookId,
          status: 'PENDING',
        },
        orderBy: { queuePosition: 'asc' },
      });

      let nextCopyStatus: any = 'AVAILABLE';
      if (returnCondition === 'DAMAGED') {
        nextCopyStatus = 'DAMAGED';
      } else if (nextReservation) {
        // Hold for next reserving patron (3 days pickup window)
        nextCopyStatus = 'RESERVED';
        await tx.libraryReservation.update({
          where: { id: nextReservation.id },
          data: {
            status: 'AVAILABLE_FOR_PICKUP',
            expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });
      }

      await tx.bookCopy.update({
        where: { id: loan.copyId },
        data: {
          status: nextCopyStatus,
          condition: returnCondition,
        },
      });

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.userId,
        action: 'UPDATE',
        module: 'library',
        resourceId: loan.id,
        newValues: {
          returnDate,
          returnCondition,
          returnedById: user.userId,
          fineAssessed: fineAssessed?.amount || 0,
          nextStatus: nextCopyStatus,
        },
      });

      return {
        loan: updatedLoan,
        fineAssessed,
        reservedForPickup: nextReservation ? nextReservation.reservationNumber : null,
      };
    });
  }

  /**
   * Renews an existing active loan, extending due date by member's max borrow days
   * subject to renewal limit (max 2) and reservation queue checks.
   */
  async renewLoan(user: CurrentUserPayload, dto: RenewLoanDto) {
    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.libraryLoan.findUnique({
        where: { id: dto.loanId },
        include: {
          copy: { include: { book: true } },
          member: true,
        },
      });

      if (!loan || loan.copy.book.organizationId !== user.organizationId) {
        throw new NotFoundException('Library loan not found');
      }

      if (loan.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Only ACTIVE loans can be renewed (current status: ${loan.status})`,
        );
      }

      if (loan.renewalCount >= 2) {
        throw new BadRequestException('Maximum renewal limit reached (maximum 2 renewals allowed)');
      }

      // Check if book has pending reservations
      const pendingReservations = await tx.libraryReservation.count({
        where: {
          bookId: loan.copy.bookId,
          status: { in: ['PENDING', 'AVAILABLE_FOR_PICKUP'] },
        },
      });
      if (pendingReservations > 0) {
        throw new BadRequestException(
          'Cannot renew loan: This title has pending reservations by other members',
        );
      }

      const previousDueDate = loan.dueDate;
      const extensionDays = loan.member.maxBorrowDays || 14;
      const newDueDate = new Date(previousDueDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

      // Create renewal record
      await tx.libraryRenewal.create({
        data: {
          loanId: loan.id,
          previousDueDate,
          newDueDate,
          renewedAt: new Date(),
          renewedById: user.userId,
          notes: dto.notes || null,
        },
      });

      // Update loan
      const updatedLoan = await tx.libraryLoan.update({
        where: { id: loan.id },
        data: {
          dueDate: newDueDate,
          renewalCount: loan.renewalCount + 1,
        },
        include: {
          copy: {
            include: {
              book: { select: { id: true, title: true, isbn13: true, isbn10: true } },
              location: true,
            },
          },
          member: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          renewals: { orderBy: { renewedAt: 'desc' } },
        },
      });

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.userId,
        action: 'UPDATE',
        module: 'library',
        resourceId: loan.id,
        newValues: {
          renewalCount: updatedLoan.renewalCount,
          previousDueDate,
          newDueDate,
        },
      });

      return updatedLoan;
    });
  }

  async getActiveLoans(
    user: CurrentUserPayload,
    query?: { memberId?: string; copyId?: string; isOverdue?: boolean },
  ) {
    const where: any = {
      copy: { book: { organizationId: user.organizationId } },
      status: { in: ['ACTIVE', 'OVERDUE'] },
    };

    if (query?.memberId) where.memberId = query.memberId;
    if (query?.copyId) where.copyId = query.copyId;
    if (query?.isOverdue) {
      where.dueDate = { lt: new Date() };
    }

    return this.prisma.libraryLoan.findMany({
      where,
      include: {
        copy: {
          include: {
            book: { select: { id: true, title: true, isbn13: true, isbn10: true } },
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
        renewals: true,
        fines: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getLoanById(user: CurrentUserPayload, id: string) {
    const loan = await this.prisma.libraryLoan.findUnique({
      where: { id },
      include: {
        copy: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                subtitle: true,
                isbn13: true,
                isbn10: true,
                coverImageUrl: true,
                category: true,
                publisher: true,
              },
            },
            location: true,
            library: true,
          },
        },
        member: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            studentProfile: true,
            employeeProfile: true,
          },
        },
        renewals: { orderBy: { renewedAt: 'desc' } },
        fines: true,
      },
    });

    if (!loan || loan.copy.book.organizationId !== user.organizationId) {
      throw new NotFoundException('Library loan not found');
    }

    return loan;
  }

  /**
   * Generates printable issue slip metadata
   */
  async generateIssueSlip(user: CurrentUserPayload, loanId: string) {
    const loan = await this.getLoanById(user, loanId);

    return {
      slipType: 'ISSUE_RECEIPT',
      loanNumber: loan.loanNumber,
      issuedAt: loan.issueDate,
      dueDate: loan.dueDate,
      patron: {
        membershipNumber: loan.member.membershipNumber,
        name: `${loan.member.user.firstName} ${loan.member.user.lastName}`,
        memberType: loan.member.memberType,
        email: loan.member.user.email,
      },
      item: {
        accessionNumber: loan.copy.accessionNumber,
        barcode: loan.copy.barcode,
        title: loan.copy.book.title,
        isbn: loan.copy.book.isbn13 || loan.copy.book.isbn10 || 'N/A',
        location: loan.copy.location ? `${loan.copy.location.shelf} (${loan.copy.location.code})` : 'General Stack',
      },
      policyTerms: 'Please return the book on or before the due date. Overdue fine applies at standard daily rates.',
      generatedAt: new Date(),
    };
  }

  /**
   * Generates printable return slip metadata
   */
  async generateReturnSlip(user: CurrentUserPayload, loanId: string) {
    const loan = await this.getLoanById(user, loanId);

    return {
      slipType: 'RETURN_RECEIPT',
      loanNumber: loan.loanNumber,
      issuedAt: loan.issueDate,
      returnedAt: loan.returnDate || new Date(),
      returnCondition: loan.returnCondition || 'GOOD',
      patron: {
        membershipNumber: loan.member.membershipNumber,
        name: `${loan.member.user.firstName} ${loan.member.user.lastName}`,
        memberType: loan.member.memberType,
      },
      item: {
        accessionNumber: loan.copy.accessionNumber,
        title: loan.copy.book.title,
      },
      fines: loan.fines.map((f) => ({
        fineNumber: f.fineNumber,
        amount: Number(f.amount),
        status: f.status,
        reason: f.reason,
      })),
      totalFines: loan.fines.reduce((acc, curr) => acc + Number(curr.amount), 0),
      generatedAt: new Date(),
    };
  }
}
