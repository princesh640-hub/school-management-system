import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateReservationDto } from './dto/library.dto';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates sequential collision-safe reservation numbers: RES-YYYY-XXXXX
   */
  async generateSequentialReservationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RES-${year}-`;

    const count = await this.prisma.libraryReservation.count({
      where: { reservationNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const reservationNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.libraryReservation.findUnique({
      where: { reservationNumber },
    });
    if (!exists) return reservationNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  async createReservation(user: CurrentUserPayload, dto: CreateReservationDto) {
    const member = await this.prisma.libraryMember.findFirst({
      where: { id: dto.memberId, organizationId: user.organizationId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    if (!member) {
      throw new NotFoundException('Library member not found');
    }
    if (member.status !== 'ACTIVE') {
      throw new BadRequestException(`Library member is not active (current status: ${member.status})`);
    }

    const book = await this.prisma.book.findFirst({
      where: { id: dto.bookId, organizationId: user.organizationId },
    });
    if (!book) {
      throw new NotFoundException('Book title not found');
    }

    // Check if member already has an active reservation for this book
    const existingActiveReservation = await this.prisma.libraryReservation.findFirst({
      where: {
        bookId: dto.bookId,
        memberId: dto.memberId,
        status: { in: ['PENDING', 'AVAILABLE_FOR_PICKUP'] },
      },
    });
    if (existingActiveReservation) {
      throw new BadRequestException(
        `Member already has an active hold/reservation for "${book.title}" (${existingActiveReservation.reservationNumber})`,
      );
    }

    // Determine queue position
    const activeCount = await this.prisma.libraryReservation.count({
      where: {
        bookId: dto.bookId,
        status: { in: ['PENDING', 'AVAILABLE_FOR_PICKUP'] },
      },
    });
    const queuePosition = activeCount + 1;

    const reservationNumber = await this.generateSequentialReservationNumber();

    const reservation = await this.prisma.libraryReservation.create({
      data: {
        reservationNumber,
        bookId: dto.bookId,
        memberId: dto.memberId,
        reservationDate: new Date(),
        queuePosition,
        status: 'PENDING',
        notes: dto.notes || null,
      },
      include: {
        book: {
          select: { id: true, title: true, isbn13: true, isbn10: true },
        },
        member: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'CREATE',
      module: 'library',
      resourceId: reservation.id,
      newValues: {
        reservationNumber: reservation.reservationNumber,
        bookId: reservation.bookId,
        memberId: reservation.memberId,
        queuePosition: reservation.queuePosition,
        status: reservation.status,
      },
    });

    return reservation;
  }

  async cancelReservation(user: CurrentUserPayload, id: string, reason?: string) {
    const reservation = await this.prisma.libraryReservation.findUnique({
      where: { id },
      include: {
        book: true,
        member: true,
      },
    });

    if (!reservation || reservation.book.organizationId !== user.organizationId) {
      throw new NotFoundException('Reservation not found');
    }

    if (['CANCELLED', 'FULFILLED', 'EXPIRED'].includes(reservation.status)) {
      throw new BadRequestException(
        `Cannot cancel reservation with status "${reservation.status}"`,
      );
    }

    const previousStatus = reservation.status;
    const oldPosition = reservation.queuePosition;

    const updated = await this.prisma.libraryReservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${reservation.notes || ''} [Cancelled: ${reason}]`.trim() : reservation.notes,
      },
      include: {
        book: { select: { id: true, title: true } },
        member: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    // Re-sequence remaining pending reservations for this book
    const higherQueueReservations = await this.prisma.libraryReservation.findMany({
      where: {
        bookId: reservation.bookId,
        status: 'PENDING',
        queuePosition: { gt: oldPosition },
      },
      orderBy: { queuePosition: 'asc' },
    });

    for (const r of higherQueueReservations) {
      await this.prisma.libraryReservation.update({
        where: { id: r.id },
        data: { queuePosition: Math.max(1, r.queuePosition - 1) },
      });
    }

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: 'UPDATE',
      module: 'library',
      resourceId: id,
      oldValues: { status: previousStatus, queuePosition: oldPosition },
      newValues: { status: 'CANCELLED', reason },
    });

    return updated;
  }

  async listReservations(
    user: CurrentUserPayload,
    query?: { bookId?: string; memberId?: string; status?: string },
  ) {
    const where: any = {
      book: { organizationId: user.organizationId },
    };

    if (query?.bookId) where.bookId = query.bookId;
    if (query?.memberId) where.memberId = query.memberId;
    if (query?.status) where.status = query.status;

    return this.prisma.libraryReservation.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn13: true,
            isbn10: true,
            category: { select: { id: true, name: true } },
          },
        },
        member: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
      },
      orderBy: [{ bookId: 'asc' }, { queuePosition: 'asc' }, { reservationDate: 'asc' }],
    });
  }

  async getReservationById(user: CurrentUserPayload, id: string) {
    const reservation = await this.prisma.libraryReservation.findUnique({
      where: { id },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn13: true,
            isbn10: true,
            coverImageUrl: true,
            category: { select: { id: true, name: true } },
          },
        },
        member: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            studentProfile: true,
            employeeProfile: true,
          },
        },
      },
    });

    if (!reservation || reservation.book.organizationId !== user.organizationId) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  /**
   * Automatically expires hold pickup windows if past expiryDate
   */
  async processExpiredHolds(organizationId: string) {
    const now = new Date();
    const expired = await this.prisma.libraryReservation.findMany({
      where: {
        book: { organizationId },
        status: 'AVAILABLE_FOR_PICKUP',
        expiryDate: { lt: now },
      },
    });

    for (const r of expired) {
      await this.prisma.libraryReservation.update({
        where: { id: r.id },
        data: { status: 'EXPIRED' },
      });
    }

    return { expiredCount: expired.length };
  }
}
