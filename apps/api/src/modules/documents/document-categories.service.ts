// =============================================================================
// Phase 4Q: Document Categories & Types Management Service
// =============================================================================
import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { RecordStatus } from '@prisma/client';
import {
  IDocumentCategory,
  IDocumentType,
} from '@school/shared-types';

@Injectable()
export class DocumentCategoriesService {
  private readonly logger = new Logger(DocumentCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes standard institutional document categories if not present
   */
  async ensureDefaultCategories(organizationId: string) {
    const defaults = [
      { code: 'STUDENT', name: 'Student Records', description: 'Academic transcripts, birth certificates, and enrollments', isSystem: true },
      { code: 'EMPLOYEE', name: 'Employee & Faculty', description: 'Employment contracts, credentials, and appointments', isSystem: true },
      { code: 'ACADEMIC', name: 'Academic Curricula', description: 'Syllabi, exam papers, and coursework', isSystem: true },
      { code: 'FINANCE', name: 'Finance & Accounts', description: 'Invoices, receipts, audits, and vouchers', isSystem: true },
      { code: 'HR', name: 'Human Resources', description: 'Policy handbooks, payroll records, and compliance', isSystem: true },
      { code: 'LIBRARY', name: 'Library & Media', description: 'E-books, accession ledgers, and copyright documents', isSystem: true },
      { code: 'TRANSPORT', name: 'Fleet & Transport', description: 'Vehicle registrations, permits, and driver licenses', isSystem: true },
      { code: 'HOSTEL', name: 'Hostel & Facilities', description: 'Boarding agreements, room condition reports, and incident logs', isSystem: true },
      { code: 'PROCUREMENT', name: 'Procurement & Assets', description: 'Vendor agreements, POs, and goods delivery notes', isSystem: true },
      { code: 'CERTIFICATE', name: 'Institutional Certificates', description: 'Issued certificates, diplomas, and bonafide letters', isSystem: true },
      { code: 'ADMINISTRATIVE', name: 'General Administration', description: 'Board minutes, circulars, and institutional accreditation', isSystem: true },
    ];

    for (const cat of defaults) {
      const exists = await this.prisma.documentCategory.findUnique({
        where: {
          organizationId_code: {
            organizationId,
            code: cat.code,
          },
        },
      });

      if (!exists) {
        await this.prisma.documentCategory.create({
          data: {
            organizationId,
            code: cat.code,
            name: cat.name,
            description: cat.description,
            isSystem: cat.isSystem,
            status: RecordStatus.ACTIVE,
          },
        });
      }
    }
  }

  /**
   * Retrieves all document categories for an organization
   */
  async getCategories(organizationId: string): Promise<IDocumentCategory[]> {
    await this.ensureDefaultCategories(organizationId);

    const categories = await this.prisma.documentCategory.findMany({
      where: { organizationId, status: RecordStatus.ACTIVE },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      organizationId: c.organizationId,
      code: c.code,
      name: c.name,
      description: c.description,
      isSystem: c.isSystem,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      documentsCount: c._count.documents,
    }));
  }

  /**
   * Creates a new custom document category
   */
  async createCategory(
    organizationId: string,
    data: { code: string; name: string; description?: string },
  ): Promise<IDocumentCategory> {
    const code = data.code.toUpperCase().trim();
    const existing = await this.prisma.documentCategory.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Document category with code ${code} already exists.`);
    }

    const created = await this.prisma.documentCategory.create({
      data: {
        organizationId,
        code,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isSystem: false,
        status: RecordStatus.ACTIVE,
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      code: created.code,
      name: created.name,
      description: created.description,
      isSystem: created.isSystem,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves document types, optionally filtered by category
   */
  async getTypes(organizationId: string, categoryId?: string): Promise<IDocumentType[]> {
    const types = await this.prisma.documentType.findMany({
      where: {
        organizationId,
        ...(categoryId ? { categoryId } : {}),
        status: RecordStatus.ACTIVE,
      },
      include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return types.map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      code: t.code,
      name: t.name,
      description: t.description,
      allowedMimeTypes: t.allowedMimeTypes,
      maxFileSizeMb: t.maxFileSizeMb,
      requiresExpiry: t.requiresExpiry,
      isSystem: t.isSystem,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Creates a new document type under a category
   */
  async createType(
    organizationId: string,
    data: {
      categoryId: string;
      code: string;
      name: string;
      description?: string;
      allowedMimeTypes?: string[];
      maxFileSizeMb?: number;
      requiresExpiry?: boolean;
    },
  ): Promise<IDocumentType> {
    const category = await this.prisma.documentCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || category.organizationId !== organizationId) {
      throw new NotFoundException('Document category not found.');
    }

    const code = data.code.toUpperCase().trim();
    const existing = await this.prisma.documentType.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Document type with code ${code} already exists.`);
    }

    const created = await this.prisma.documentType.create({
      data: {
        organizationId,
        categoryId: data.categoryId,
        code,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        allowedMimeTypes: data.allowedMimeTypes || ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSizeMb: data.maxFileSizeMb || 10,
        requiresExpiry: Boolean(data.requiresExpiry),
        status: RecordStatus.ACTIVE,
      },
      include: {
        category: true,
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      categoryId: created.categoryId,
      categoryName: created.category.name,
      code: created.code,
      name: created.name,
      description: created.description,
      allowedMimeTypes: created.allowedMimeTypes,
      maxFileSizeMb: created.maxFileSizeMb,
      requiresExpiry: created.requiresExpiry,
      isSystem: created.isSystem,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    };
  }
}
