// =============================================================================
// Phase 4Q: Institutional Document Management Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { StorageService } from '../../core/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentSharingService } from './document-sharing.service';
import {
  IInstitutionalDocument,
  IDocumentUploadDto,
  IDocumentCreateVersionDto,
  IDocumentDashboardOverview,
  DocumentLifecycleStatus,
} from '@school/shared-types';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly sharingService: DocumentSharingService,
  ) {}

  /**
   * Generates sequential collision-safe document number: DOC-YYYY-XXXXX
   */
  async generateSequentialDocumentNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DOC-${year}-`;

    const count = await this.prisma.institutionalDocument.count({
      where: {
        organizationId,
        documentNumber: { startsWith: prefix },
      },
    });

    const nextSeq = String(count + 1).padStart(5, '0');
    const docNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.institutionalDocument.findUnique({
      where: { documentNumber: docNumber },
    });

    if (!exists) return docNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Uploads and registers a new institutional document
   */
  async uploadDocument(
    organizationId: string,
    campusId: string | null,
    userId: string,
    dto: IDocumentUploadDto,
  ): Promise<IInstitutionalDocument> {
    // 1. Validate Category and Type
    const docType = await this.prisma.documentType.findUnique({
      where: { id: dto.typeId },
      include: { category: true },
    });

    if (!docType || docType.organizationId !== organizationId) {
      throw new NotFoundException('Document type not found.');
    }

    if (docType.categoryId !== dto.categoryId) {
      throw new BadRequestException('Document type does not belong to specified category.');
    }

    // 2. Validate File Safety
    const safety = this.storage.validateFileSafety(
      {
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeInBytes: dto.sizeInBytes,
      },
      docType.allowedMimeTypes,
      docType.maxFileSizeMb * 1024 * 1024,
    );

    if (!safety.isValid) {
      throw new BadRequestException(safety.error || 'Invalid file payload.');
    }

    // 3. Expiry validation if required
    if (docType.requiresExpiry && !dto.expiryDate) {
      throw new BadRequestException(`Document type "${docType.name}" requires an expiration date.`);
    }

    // 4. Generate Document Number
    const documentNumber = await this.generateSequentialDocumentNumber(organizationId);

    // 5. Create Master Document & Version 1 in Transaction
    const created = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.institutionalDocument.create({
        data: {
          organizationId,
          campusId: campusId || null,
          documentNumber,
          title: dto.title.trim(),
          categoryId: dto.categoryId,
          typeId: dto.typeId,
          fileKey: dto.fileKey,
          fileName: safety.sanitizedName,
          mimeType: dto.mimeType,
          sizeInBytes: BigInt(dto.sizeInBytes),
          fileHash: dto.fileHash || null,
          entityType: dto.entityType || null,
          entityId: dto.entityId || null,
          ownerUserId: userId,
          currentVersion: 1,
          status: 'ACTIVE',
          issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          reminderThresholdDays: dto.reminderThresholdDays || (docType.requiresExpiry ? 30 : null),
          isConfidential: Boolean(dto.isConfidential),
          notes: dto.notes || null,
          uploadedBy: userId,
        },
        include: {
          category: true,
          documentType: true,
        },
      });

      // Create Version 1
      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          fileKey: dto.fileKey,
          fileName: safety.sanitizedName,
          mimeType: dto.mimeType,
          sizeInBytes: BigInt(dto.sizeInBytes),
          fileHash: dto.fileHash || null,
          changeSummary: 'Initial document upload',
          uploadedBy: userId,
        },
      });

      // Register storage metadata if not already present
      const meta = await tx.fileMetadata.findUnique({ where: { fileKey: dto.fileKey } });
      if (!meta) {
        await tx.fileMetadata.create({
          data: {
            bucketName: 'documents',
            fileKey: dto.fileKey,
            fileName: safety.sanitizedName,
            mimeType: dto.mimeType,
            sizeInBytes: BigInt(dto.sizeInBytes),
            uploadedBy: userId,
          },
        });
      }

      return doc;
    });

    await this.auditService.log({
      action: 'DOCUMENT_UPLOADED',
      entity: 'InstitutionalDocument',
      entityId: created.id,
      userId,
      details: {
        documentNumber: created.documentNumber,
        title: created.title,
        type: docType.name,
        entityType: created.entityType,
        entityId: created.entityId,
      },
    });

    return this.mapDocumentToDto(created);
  }

  /**
   * Adds a new version to an existing document
   */
  async createNewVersion(
    organizationId: string,
    documentId: string,
    userId: string,
    dto: IDocumentCreateVersionDto,
  ): Promise<IInstitutionalDocument> {
    const doc = await this.prisma.institutionalDocument.findUnique({
      where: { id: documentId },
      include: { documentType: true },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException('Document not found.');
    }

    if (doc.status === 'ARCHIVED' || doc.status === 'DELETED') {
      throw new ForbiddenException(`Cannot add new version to ${doc.status.toLowerCase()} document.`);
    }

    // Safety validation
    const safety = this.storage.validateFileSafety(
      {
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeInBytes: dto.sizeInBytes,
      },
      doc.documentType.allowedMimeTypes,
      doc.documentType.maxFileSizeMb * 1024 * 1024,
    );

    if (!safety.isValid) {
      throw new BadRequestException(safety.error || 'Invalid file payload.');
    }

    const nextVersionNumber = doc.currentVersion + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Create Version Record
      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: nextVersionNumber,
          fileKey: dto.fileKey,
          fileName: safety.sanitizedName,
          mimeType: dto.mimeType,
          sizeInBytes: BigInt(dto.sizeInBytes),
          fileHash: dto.fileHash || null,
          changeSummary: dto.changeSummary || `Updated to version ${nextVersionNumber}`,
          uploadedBy: userId,
        },
      });

      // 2. Update Master Document Current Version Pointer
      return tx.institutionalDocument.update({
        where: { id: doc.id },
        data: {
          currentVersion: nextVersionNumber,
          fileKey: dto.fileKey,
          fileName: safety.sanitizedName,
          mimeType: dto.mimeType,
          sizeInBytes: BigInt(dto.sizeInBytes),
          fileHash: dto.fileHash || null,
          uploadedBy: userId,
        },
        include: {
          category: true,
          documentType: true,
        },
      });
    });

    await this.auditService.log({
      action: 'DOCUMENT_VERSION_CREATED',
      entity: 'InstitutionalDocument',
      entityId: doc.id,
      userId,
      details: {
        documentNumber: doc.documentNumber,
        version: nextVersionNumber,
        changeSummary: dto.changeSummary,
      },
    });

    return this.mapDocumentToDto(updated);
  }

  /**
   * Generates secure authenticated download URL with server-side authorization check
   */
  async getSecureDownloadUrl(
    organizationId: string,
    documentId: string,
    userId: string,
    userPermissions: string[] = [],
  ): Promise<{ url: string; fileName: string; mimeType: string; expiresAt: Date }> {
    const doc = await this.prisma.institutionalDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException('Document not found.');
    }

    // Access Check:
    // 1. Document owner or uploader
    // 2. Or user has explicit shared access
    // 3. Or user has global 'documents:download' / 'documents:view' permission
    const isOwner = doc.ownerUserId === userId || doc.uploadedBy === userId;
    const hasGlobalPermission =
      userPermissions.includes('documents:download') ||
      userPermissions.includes('documents:view') ||
      userPermissions.includes('admin:*');

    let isAuthorized = isOwner || hasGlobalPermission;

    if (!isAuthorized) {
      isAuthorized = await this.sharingService.validateSharedAccess(doc.id, userId, 'DOWNLOAD');
    }

    if (!isAuthorized) {
      this.logger.warn(`Unauthorized download attempt: User ${userId} on Document ${documentId}`);
      throw new ForbiddenException('Access denied: You are not authorized to download this document.');
    }

    const downloadInfo = await this.storage.getSignedDownloadUrl(doc.fileKey, 900); // 15 mins expiry
    if (!downloadInfo) {
      throw new NotFoundException('File binary not found in storage subsystem.');
    }

    await this.auditService.log({
      action: 'DOCUMENT_DOWNLOADED',
      entity: 'InstitutionalDocument',
      entityId: doc.id,
      userId,
      details: {
        documentNumber: doc.documentNumber,
        fileName: doc.fileName,
      },
    });

    return {
      url: downloadInfo.url,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      expiresAt: downloadInfo.expiresAt,
    };
  }

  /**
   * Retrieves single document detail with all versions
   */
  async getDocumentDetail(organizationId: string, documentId: string) {
    const doc = await this.prisma.institutionalDocument.findUnique({
      where: { id: documentId },
      include: {
        category: true,
        documentType: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException('Document not found.');
    }

    return {
      ...this.mapDocumentToDto(doc),
      versions: doc.versions.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        versionNumber: v.versionNumber,
        fileKey: v.fileKey,
        fileName: v.fileName,
        mimeType: v.mimeType,
        sizeInBytes: Number(v.sizeInBytes),
        fileHash: v.fileHash,
        changeSummary: v.changeSummary,
        uploadedBy: v.uploadedBy,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Searches and filters documents
   */
  async listDocuments(
    organizationId: string,
    filter: {
      categoryId?: string;
      typeId?: string;
      entityType?: string;
      entityId?: string;
      status?: DocumentLifecycleStatus;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = {
      organizationId,
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.typeId ? { typeId: filter.typeId } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
      ...(filter.status ? { status: filter.status } : { status: { not: 'DELETED' } }),
    };

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { documentNumber: { contains: filter.search, mode: 'insensitive' } },
        { fileName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [total, docs] = await Promise.all([
      this.prisma.institutionalDocument.count({ where }),
      this.prisma.institutionalDocument.findMany({
        where,
        include: {
          category: true,
          documentType: true,
        },
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 30,
        skip: filter.offset || 0,
      }),
    ]);

    return {
      total,
      documents: docs.map((d) => this.mapDocumentToDto(d)),
    };
  }

  /**
   * Tracks and returns documents expiring within reminder window or already expired
   */
  async getExpiringDocuments(organizationId: string, daysAhead: number = 30) {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const docs = await this.prisma.institutionalDocument.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        expiryDate: {
          not: null,
          lte: thresholdDate,
        },
      },
      include: {
        category: true,
        documentType: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    return docs.map((d) => this.mapDocumentToDto(d));
  }

  /**
   * Archives a document
   */
  async archiveDocument(organizationId: string, documentId: string, userId: string) {
    const doc = await this.prisma.institutionalDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException('Document not found.');
    }

    const updated = await this.prisma.institutionalDocument.update({
      where: { id: documentId },
      data: { status: 'ARCHIVED' },
      include: { category: true, documentType: true },
    });

    await this.auditService.log({
      action: 'DOCUMENT_ARCHIVED',
      entity: 'InstitutionalDocument',
      entityId: doc.id,
      userId,
      details: { documentNumber: doc.documentNumber },
    });

    return this.mapDocumentToDto(updated);
  }

  /**
   * Aggregates document KPIs for institutional dashboard
   */
  async getDashboardOverview(organizationId: string): Promise<IDocumentDashboardOverview> {
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalDocuments,
      expiringCount,
      expiredCount,
      totalCertificatesIssued,
      pendingApprovalsCount,
      recentDocs,
      expiringDocs,
    ] = await Promise.all([
      this.prisma.institutionalDocument.count({
        where: { organizationId, status: { not: 'DELETED' } },
      }),
      this.prisma.institutionalDocument.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          expiryDate: { gt: now, lte: thirtyDaysAhead },
        },
      }),
      this.prisma.institutionalDocument.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          expiryDate: { lt: now },
        },
      }),
      this.prisma.issuedCertificate.count({
        where: { organizationId, status: 'ISSUED' },
      }),
      this.prisma.issuedCertificate.count({
        where: { organizationId, status: 'PENDING_APPROVAL' },
      }),
      this.prisma.institutionalDocument.findMany({
        where: { organizationId, status: { not: 'DELETED' } },
        include: { category: true, documentType: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.institutionalDocument.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          expiryDate: { lte: thirtyDaysAhead },
        },
        include: { category: true, documentType: true },
        orderBy: { expiryDate: 'asc' },
        take: 6,
      }),
    ]);

    return {
      totalDocuments,
      expiringDocumentsCount: expiringCount,
      expiredDocumentsCount: expiredCount,
      totalCertificatesIssued,
      pendingApprovalsCount,
      recentDocuments: recentDocs.map((d) => this.mapDocumentToDto(d)),
      expiringDocuments: expiringDocs.map((d) => this.mapDocumentToDto(d)),
    };
  }

  private mapDocumentToDto(doc: any): IInstitutionalDocument {
    return {
      id: doc.id,
      organizationId: doc.organizationId,
      campusId: doc.campusId,
      documentNumber: doc.documentNumber,
      title: doc.title,
      categoryId: doc.categoryId,
      categoryName: doc.category?.name || 'General',
      typeId: doc.typeId,
      typeName: doc.documentType?.name || 'Document',
      fileKey: doc.fileKey,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      sizeInBytes: Number(doc.sizeInBytes),
      fileHash: doc.fileHash,
      entityType: doc.entityType,
      entityId: doc.entityId,
      ownerUserId: doc.ownerUserId,
      currentVersion: doc.currentVersion,
      status: doc.status as DocumentLifecycleStatus,
      issueDate: doc.issueDate ? doc.issueDate.toISOString().split('T')[0] : null,
      expiryDate: doc.expiryDate ? doc.expiryDate.toISOString().split('T')[0] : null,
      reminderThresholdDays: doc.reminderThresholdDays,
      isConfidential: doc.isConfidential,
      notes: doc.notes,
      uploadedBy: doc.uploadedBy,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : doc.createdAt.toISOString(),
    };
  }
}
