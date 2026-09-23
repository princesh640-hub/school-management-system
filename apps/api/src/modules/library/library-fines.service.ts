import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AssessFineDto, WaiveFineDto } from './dto/library.dto';

@Injectable()
export class LibraryFinesService {
  private readonly logger = new Logger(LibraryFinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Round money strictly to 2 decimals
   */
  roundMoney(amount: number): number {
    return Math.round((Number(amount) || 0) * 100) / 100;
  }

  /**
   * Generates sequential collision-safe fine numbers: FINE-YYYY-XXXXX
   */
  async generateSequentialFineNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FINE-${year}-`;

    const count = await this.prisma.libraryFine.count({
      where: { fineNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const fineNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.libraryFine.findUnique({
      where: { fineNumber },
    });
    if (!exists) return fineNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Calculates overdue days and fine amount based on configurable policy:
   * graceDays, dailyRate, and maximum fine cap.
   */
  calculateOverdueFine(
    dueDate: Date,
    returnDate: Date = new Date(),
    dailyRate: number = 1.0,
    graceDays: number = 1,
    maxCap: number = 50.0,
  ): { overdueDays: number; fineAmount: number } {
    const due = new Date(dueDate).getTime();
    const ret = new Date(returnDate).getTime();

    if (ret <= due) {
      return { overdueDays: 0, fineAmount: 0 };
    }

    const diffMs = ret - due;
    const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (overdueDays <= graceDays) {
      return { overdueDays, fineAmount: 0 };
    }

    const chargeableDays = overdueDays - graceDays;
    const rawFine = chargeableDays * dailyRate;
    const fineAmount = this.roundMoney(Math.min(maxCap, Math.max(0, rawFine)));

    return {
      overdueDays,
      fineAmount,
    };
  }

  /**
   * Assesses an administrative or overdue fine against a library member
   */
  async assessFine(user: CurrentUserPayload, dto: AssessFineDto) {
    const member = await this.prisma.libraryMember.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Library member not found');

    const amount = this.roundMoney(dto.amount);
    if (amount <= 0) {
      throw new BadRequestException('Fine amount must be greater than zero');
    }

    const fineNumber = await this.generateSequentialFineNumber();

    const fine = await this.prisma.libraryFine.create({
      data: {
        fineNumber,
        loanId: dto.loanId || null,
        memberId: dto.memberId,
        amount,
        reason: dto.reason.trim(),
        status: 'ASSESSED',
        assessedDate: new Date(),
        notes: dto.notes || null,
      },
      include: {
        member: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        loan: {
          include: { copy: { include: { book: true } } },
        },
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ASSESS_LIBRARY_FINE',
      resource: 'LIBRARY_FINE',
      resourceId: fine.id,
      details: { fineNumber, amount, reason: dto.reason, memberId: dto.memberId },
    });

    return {
      ...fine,
      amount: Number(fine.amount),
    };
  }

  /**
   * Waives an assessed fine with mandatory audit logging and reason
   */
  async waiveFine(user: CurrentUserPayload, fineId: string, dto: WaiveFineDto) {
    const fine = await this.prisma.libraryFine.findUnique({ where: { id: fineId } });
    if (!fine) throw new NotFoundException('Library fine not found');

    if (fine.status !== 'ASSESSED') {
      throw new BadRequestException(`Cannot waive fine in status "${fine.status}"`);
    }

    if (!dto.waiverReason || !dto.waiverReason.trim()) {
      throw new BadRequestException('A reason must be provided to waive a library fine');
    }

    const updated = await this.prisma.libraryFine.update({
      where: { id: fineId },
      data: {
        status: 'WAIVED',
        waivedDate: new Date(),
        waivedById: user.id,
        waiverReason: dto.waiverReason.trim(),
      },
      include: { member: true },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'WAIVE_LIBRARY_FINE',
      resource: 'LIBRARY_FINE',
      resourceId: fineId,
      details: {
        fineNumber: fine.fineNumber,
        amount: Number(fine.amount),
        waiverReason: dto.waiverReason.trim(),
        waivedBy: user.id,
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  /**
   * Marks fine paid and associates with Phase 4G Finance payment transaction
   */
  async recordPayment(
    user: CurrentUserPayload,
    fineId: string,
    financeTransactionId?: string,
    notes?: string,
  ) {
    const fine = await this.prisma.libraryFine.findUnique({ where: { id: fineId } });
    if (!fine) throw new NotFoundException('Library fine not found');

    if (fine.status === 'PAID') {
      throw new BadRequestException('Fine is already marked as PAID');
    }

    const updated = await this.prisma.libraryFine.update({
      where: { id: fineId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        financeTransactionId: financeTransactionId || null,
        notes: notes !== undefined ? notes : fine.notes,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PAY_LIBRARY_FINE',
      resource: 'LIBRARY_FINE',
      resourceId: fineId,
      details: {
        fineNumber: fine.fineNumber,
        amount: Number(fine.amount),
        financeTransactionId,
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async getFines(
    user: CurrentUserPayload,
    query?: {
      memberId?: string;
      status?: string;
      loanId?: string;
    },
  ) {
    const where: any = {
      member: { organizationId: user.organizationId },
    };

    if (query?.memberId) where.memberId = query.memberId;
    if (query?.status) where.status = query.status;
    if (query?.loanId) where.loanId = query.loanId;

    const list = await this.prisma.libraryFine.findMany({
      where,
      include: {
        member: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        loan: {
          include: {
            copy: { include: { book: true } },
          },
        },
      },
      orderBy: { assessedDate: 'desc' },
    });

    return list.map((f) => ({
      ...f,
      amount: Number(f.amount),
    }));
  }
}
