import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  CreateLibraryDto,
  CreateLibraryLocationDto,
  CreateBookCategoryDto,
  CreatePublisherDto,
  CreateAuthorDto,
  CreateBookDto,
  UpdateBookDto,
} from './dto/library.dto';

@Injectable()
export class LibraryCatalogService {
  private readonly logger = new Logger(LibraryCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Library Branches
  // ---------------------------------------------------------------------------

  async createLibrary(user: CurrentUserPayload, dto: CreateLibraryDto) {
    const existing = await this.prisma.library.findFirst({
      where: {
        organizationId: user.organizationId,
        code: dto.code.trim().toUpperCase(),
      },
    });
    if (existing) {
      throw new BadRequestException(`Library code "${dto.code}" already exists`);
    }

    const library = await this.prisma.library.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description || null,
        locationDetails: dto.locationDetails || null,
        status: 'ACTIVE',
      },
      include: { campus: { select: { id: true, name: true, code: true } } },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE_LIBRARY',
      resource: 'LIBRARY',
      resourceId: library.id,
      details: { name: library.name, code: library.code },
    });

    return library;
  }

  async getLibraries(user: CurrentUserPayload, campusId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;

    return this.prisma.library.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true, code: true } },
        _count: { select: { locations: true, copies: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getLibraryById(id: string) {
    const lib = await this.prisma.library.findUnique({
      where: { id },
      include: {
        campus: true,
        locations: true,
        _count: { select: { copies: true } },
      },
    });
    if (!lib) throw new NotFoundException('Library not found');
    return lib;
  }

  // ---------------------------------------------------------------------------
  // 2. Shelves & Physical Locations
  // ---------------------------------------------------------------------------

  async createLocation(user: CurrentUserPayload, dto: CreateLibraryLocationDto) {
    const library = await this.prisma.library.findUnique({
      where: { id: dto.libraryId },
    });
    if (!library) throw new NotFoundException('Library branch not found');

    const existing = await this.prisma.libraryLocation.findFirst({
      where: {
        libraryId: dto.libraryId,
        code: dto.code.trim().toUpperCase(),
      },
    });
    if (existing) {
      throw new BadRequestException(`Shelf location code "${dto.code}" already exists in this library`);
    }

    const location = await this.prisma.libraryLocation.create({
      data: {
        libraryId: dto.libraryId,
        shelf: dto.shelf.trim(),
        code: dto.code.trim().toUpperCase(),
        building: dto.building || null,
        floor: dto.floor || null,
        room: dto.room || null,
        section: dto.section || null,
        description: dto.description || null,
      },
    });

    return location;
  }

  async getLocations(libraryId?: string) {
    const where: any = {};
    if (libraryId) where.libraryId = libraryId;

    return this.prisma.libraryLocation.findMany({
      where,
      include: {
        library: { select: { id: true, name: true, code: true } },
        _count: { select: { copies: true } },
      },
      orderBy: [{ shelf: 'asc' }, { code: 'asc' }],
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Categories
  // ---------------------------------------------------------------------------

  async createCategory(user: CurrentUserPayload, dto: CreateBookCategoryDto) {
    const existing = await this.prisma.bookCategory.findFirst({
      where: {
        organizationId: user.organizationId,
        code: dto.code.trim().toUpperCase(),
      },
    });
    if (existing) {
      throw new BadRequestException(`Book category code "${dto.code}" already exists`);
    }

    return this.prisma.bookCategory.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description || null,
      },
    });
  }

  async getCategories(user: CurrentUserPayload) {
    return this.prisma.bookCategory.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: { select: { books: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Publishers & Authors
  // ---------------------------------------------------------------------------

  async createPublisher(user: CurrentUserPayload, dto: CreatePublisherDto) {
    const existing = await this.prisma.publisher.findFirst({
      where: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
      },
    });
    if (existing) return existing;

    return this.prisma.publisher.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        contact: dto.contact || null,
        website: dto.website || null,
        address: dto.address || null,
      },
    });
  }

  async getPublishers(user: CurrentUserPayload) {
    return this.prisma.publisher.findMany({
      where: { organizationId: user.organizationId },
      include: { _count: { select: { books: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createAuthor(user: CurrentUserPayload, dto: CreateAuthorDto) {
    const existing = await this.prisma.author.findFirst({
      where: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
      },
    });
    if (existing) return existing;

    return this.prisma.author.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        alternateName: dto.alternateName || null,
        biography: dto.biography || null,
      },
    });
  }

  async getAuthors(user: CurrentUserPayload) {
    return this.prisma.author.findMany({
      where: { organizationId: user.organizationId },
      include: { _count: { select: { bookAuthors: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Bibliographic Book Catalog
  // ---------------------------------------------------------------------------

  async createBook(user: CurrentUserPayload, dto: CreateBookDto) {
    // Unique check if ISBN is provided
    if (dto.isbn13) {
      const existing = await this.prisma.book.findFirst({
        where: {
          organizationId: user.organizationId,
          isbn13: dto.isbn13.trim(),
        },
      });
      if (existing) {
        throw new BadRequestException(`Book with ISBN-13 "${dto.isbn13}" already exists in catalog`);
      }
    }

    const book = await this.prisma.book.create({
      data: {
        organizationId: user.organizationId,
        categoryId: dto.categoryId || null,
        publisherId: dto.publisherId || null,
        title: dto.title.trim(),
        subtitle: dto.subtitle || null,
        isbn10: dto.isbn10 ? dto.isbn10.trim() : null,
        isbn13: dto.isbn13 ? dto.isbn13.trim() : null,
        edition: dto.edition || null,
        publicationYear: dto.publicationYear || null,
        language: dto.language || 'English',
        description: dto.description || null,
        subject: dto.subject || null,
        coverImageUrl: dto.coverImageUrl || null,
        keywords: dto.keywords || [],
        authors: dto.authorIds && dto.authorIds.length > 0
          ? {
              create: dto.authorIds.map((authorId) => ({
                authorId,
                role: 'AUTHOR',
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        publisher: true,
        authors: { include: { author: true } },
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE_BOOK',
      resource: 'BOOK',
      resourceId: book.id,
      details: { title: book.title, isbn13: book.isbn13 },
    });

    return book;
  }

  async getBooks(
    user: CurrentUserPayload,
    query?: {
      search?: string;
      categoryId?: string;
      authorId?: string;
      publisherId?: string;
      availableOnly?: boolean;
    },
  ) {
    const where: any = { organizationId: user.organizationId };

    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.publisherId) where.publisherId = query.publisherId;
    if (query?.authorId) {
      where.authors = { some: { authorId: query.authorId } };
    }

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { subtitle: { contains: s, mode: 'insensitive' } },
        { isbn10: { contains: s, mode: 'insensitive' } },
        { isbn13: { contains: s, mode: 'insensitive' } },
        { subject: { contains: s, mode: 'insensitive' } },
        { authors: { some: { author: { name: { contains: s, mode: 'insensitive' } } } } },
      ];
    }

    const books = await this.prisma.book.findMany({
      where,
      include: {
        category: true,
        publisher: true,
        authors: { include: { author: true } },
        copies: {
          select: { id: true, status: true, accessionNumber: true, barcode: true },
        },
      },
      orderBy: { title: 'asc' },
    });

    return books.map((b) => {
      const totalCopies = b.copies.length;
      const availableCopies = b.copies.filter((c) => c.status === 'AVAILABLE').length;
      return {
        ...b,
        totalCopies,
        availableCopies,
      };
    });
  }

  async getBookById(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
        publisher: true,
        authors: { include: { author: true } },
        copies: {
          include: {
            library: true,
            location: true,
          },
          orderBy: { accessionNumber: 'asc' },
        },
        reservations: {
          where: { status: { in: ['PENDING', 'AVAILABLE_FOR_PICKUP'] } },
          include: {
            member: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
          orderBy: { queuePosition: 'asc' },
        },
      },
    });

    if (!book) throw new NotFoundException('Book not found in catalog');

    const totalCopies = book.copies.length;
    const availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;

    return {
      ...book,
      totalCopies,
      availableCopies,
    };
  }

  async updateBook(user: CurrentUserPayload, id: string, dto: UpdateBookDto) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');

    const updated = await this.prisma.book.update({
      where: { id },
      data: {
        title: dto.title ? dto.title.trim() : undefined,
        subtitle: dto.subtitle !== undefined ? dto.subtitle : undefined,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
        publisherId: dto.publisherId !== undefined ? dto.publisherId : undefined,
        edition: dto.edition !== undefined ? dto.edition : undefined,
        publicationYear: dto.publicationYear !== undefined ? dto.publicationYear : undefined,
        language: dto.language !== undefined ? dto.language : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        subject: dto.subject !== undefined ? dto.subject : undefined,
        coverImageUrl: dto.coverImageUrl !== undefined ? dto.coverImageUrl : undefined,
        keywords: dto.keywords !== undefined ? dto.keywords : undefined,
        status: (dto.status as any) || undefined,
      },
      include: {
        category: true,
        publisher: true,
        authors: { include: { author: true } },
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE_BOOK',
      resource: 'BOOK',
      resourceId: id,
      details: { title: updated.title },
    });

    return updated;
  }
}
