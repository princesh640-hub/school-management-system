import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateBookCopyDto, UpdateBookCopyStatusDto } from './dto/library.dto';

@Injectable()
export class BookCopiesService {
  private readonly logger = new Logger(BookCopiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates sequential collision-safe accession numbers: ACC-YYYY-XXXXX
   */
  async generateSequentialAccessionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ACC-${year}-`;

    const count = await this.prisma.bookCopy.count({
      where: { accessionNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const accessionNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.bookCopy.findUnique({ where: { accessionNumber } });
    if (!exists) return accessionNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  async createCopy(user: CurrentUserPayload, dto: CreateBookCopyDto) {
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException('Book title not found');

    const accessionNumber =
      dto.accessionNumber?.trim() || (await this.generateSequentialAccessionNumber());

    const existingAcc = await this.prisma.bookCopy.findUnique({
      where: { accessionNumber },
    });
    if (existingAcc) {
      throw new BadRequestException(`Accession number "${accessionNumber}" already in use`);
    }

    // Default barcode to accession number if not explicitly supplied
    const barcode = dto.barcode?.trim() || accessionNumber;

    const copy = await this.prisma.bookCopy.create({
      data: {
        bookId: dto.bookId,
        libraryId: dto.libraryId || null,
        locationId: dto.locationId || null,
        accessionNumber,
        barcode,
        condition: (dto.condition as any) || 'GOOD',
        status: 'AVAILABLE',
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : new Date(),
        cost: dto.cost !== undefined ? Number(dto.cost) : null,
        supplier: dto.supplier || null,
        notes: dto.notes || null,
      },
      include: {
        book: true,
        library: true,
        location: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE_BOOK_COPY',
      resource: 'BOOK_COPY',
      resourceId: copy.id,
      details: { accessionNumber, bookTitle: book.title },
    });

    return {
      ...copy,
      cost: copy.cost ? Number(copy.cost) : null,
    };
  }

  async getCopies(
    user: CurrentUserPayload,
    query?: {
      bookId?: string;
      libraryId?: string;
      locationId?: string;
      status?: string;
      search?: string;
    },
  ) {
    const where: any = {
      book: { organizationId: user.organizationId },
    };

    if (query?.bookId) where.bookId = query.bookId;
    if (query?.libraryId) where.libraryId = query.libraryId;
    if (query?.locationId) where.locationId = query.locationId;
    if (query?.status) where.status = query.status;

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { accessionNumber: { contains: s, mode: 'insensitive' } },
        { barcode: { contains: s, mode: 'insensitive' } },
        { book: { title: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const copies = await this.prisma.bookCopy.findMany({
      where,
      include: {
        book: { select: { id: true, title: true, isbn13: true, coverImageUrl: true } },
        library: true,
        location: true,
        loans: {
          where: { status: 'ACTIVE' },
          include: {
            member: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { accessionNumber: 'asc' },
    });

    return copies.map((c) => ({
      ...c,
      cost: c.cost ? Number(c.cost) : null,
      activeLoan: c.loans[0] || null,
    }));
  }

  async getCopyById(id: string) {
    const copy = await this.prisma.bookCopy.findUnique({
      where: { id },
      include: {
        book: {
          include: {
            category: true,
            authors: { include: { author: true } },
          },
        },
        library: true,
        location: true,
        loans: {
          include: {
            member: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
          orderBy: { issueDate: 'desc' },
        },
      },
    });

    if (!copy) throw new NotFoundException('Book copy not found');

    return {
      ...copy,
      cost: copy.cost ? Number(copy.cost) : null,
    };
  }

  async getCopyByAccessionOrBarcode(identifier: string) {
    const copy = await this.prisma.bookCopy.findFirst({
      where: {
        OR: [
          { accessionNumber: identifier.trim() },
          { barcode: identifier.trim() },
        ],
      },
      include: {
        book: {
          include: {
            authors: { include: { author: true } },
          },
        },
        library: true,
        location: true,
        loans: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!copy) throw new NotFoundException(`No book copy found with code "${identifier}"`);

    return {
      ...copy,
      cost: copy.cost ? Number(copy.cost) : null,
      currentActiveLoan: copy.loans[0] || null,
    };
  }

  async updateCopyStatus(user: CurrentUserPayload, copyId: string, dto: UpdateBookCopyStatusDto) {
    const copy = await this.prisma.bookCopy.findUnique({ where: { id: copyId } });
    if (!copy) throw new NotFoundException('Book copy not found');

    const updated = await this.prisma.bookCopy.update({
      where: { id: copyId },
      data: {
        status: (dto.status as any) || copy.status,
        condition: (dto.condition as any) || copy.condition,
        notes: dto.notes !== undefined ? dto.notes : copy.notes,
      },
      include: { book: true },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE_COPY_STATUS',
      resource: 'BOOK_COPY',
      resourceId: copyId,
      details: { previousStatus: copy.status, newStatus: dto.status },
    });

    return updated;
  }

  async markLost(user: CurrentUserPayload, copyId: string, notes?: string) {
    return this.updateCopyStatus(user, copyId, {
      status: 'LOST',
      notes: notes || 'Reported lost',
    });
  }

  async markDamaged(user: CurrentUserPayload, copyId: string, description?: string) {
    return this.updateCopyStatus(user, copyId, {
      status: 'DAMAGED',
      condition: 'DAMAGED',
      notes: description || 'Flagged as damaged',
    });
  }

  /**
   * Replace a lost or damaged physical book copy while maintaining historical links
   */
  async replaceCopy(user: CurrentUserPayload, oldCopyId: string, dto: CreateBookCopyDto) {
    const oldCopy = await this.prisma.bookCopy.findUnique({ where: { id: oldCopyId } });
    if (!oldCopy) throw new NotFoundException('Original book copy not found');

    // Archive or withdraw original copy
    await this.prisma.bookCopy.update({
      where: { id: oldCopyId },
      data: {
        status: 'WITHDRAWN',
        notes: `Replaced by new copy. Original status was ${oldCopy.status}`,
      },
    });

    const accessionNumber =
      dto.accessionNumber?.trim() || (await this.generateSequentialAccessionNumber());

    const newCopy = await this.prisma.bookCopy.create({
      data: {
        bookId: oldCopy.bookId,
        libraryId: dto.libraryId || oldCopy.libraryId,
        locationId: dto.locationId || oldCopy.locationId,
        accessionNumber,
        barcode: dto.barcode?.trim() || accessionNumber,
        condition: (dto.condition as any) || 'NEW',
        status: 'AVAILABLE',
        acquisitionDate: new Date(),
        cost: dto.cost !== undefined ? Number(dto.cost) : oldCopy.cost,
        supplier: dto.supplier || 'Replacement Copy',
        notes: `Replacement for copy ${oldCopy.accessionNumber}`,
        isReplacementOf: oldCopy.accessionNumber,
      },
      include: { book: true, location: true },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REPLACE_BOOK_COPY',
      resource: 'BOOK_COPY',
      resourceId: newCopy.id,
      details: { originalAccession: oldCopy.accessionNumber, newAccession: accessionNumber },
    });

    return newCopy;
  }
}
