// =============================================================================
// Phase 4Q: Controlled Document Sharing & Permissions Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  IDocumentShare,
  IDocumentShareDto,
} from '@school/shared-types';

@Injectable()
export class DocumentSharingService {
  private readonly logger = new Logger(DocumentSharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Shares a document with a specified user or role
   */
  async shareDocument(
    organizationId: string,
    documentId: string,
    userId: string,
    dto: IDocumentShareDto,
  ): Promise<IDocumentShare> {
    const doc = await this.prisma.institutionalDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException('Document not found.');
    }

    if (doc.status === 'DELETED') {
      throw new ForbiddenException('Cannot share deleted document.');
    }

    const share = await this.prisma.documentShare.create({
      data: {
        documentId,
        sharedWithUserId: dto.sharedWithUserId || null,
        sharedWithRole: dto.sharedWithRole || null,
        permission: dto.permission,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      action: 'DOCUMENT_SHARED',
      entity: 'InstitutionalDocument',
      entityId: documentId,
      userId,
      details: {
        documentNumber: doc.documentNumber,
        sharedWithUserId: dto.sharedWithUserId,
        sharedWithRole: dto.sharedWithRole,
        permission: dto.permission,
        expiresAt: dto.expiresAt,
      },
    });

    return {
      id: share.id,
      documentId: share.documentId,
      sharedWithUserId: share.sharedWithUserId,
      sharedWithRole: share.sharedWithRole,
      permission: share.permission,
      expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
      accessCount: share.accessCount,
      createdBy: share.createdBy,
      createdAt: share.createdAt.toISOString(),
    };
  }

  /**
   * Lists active shares for a document
   */
  async getDocumentShares(
    organizationId: string,
    documentId: string,
  ): Promise<IDocumentShare[]> {
    const doc = await this.prisma.institutionalDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw new NotFoundException('Document not found.');
    }

    const shares = await this.prisma.documentShare.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((s) => ({
      id: s.id,
      documentId: s.documentId,
      sharedWithUserId: s.sharedWithUserId,
      sharedWithRole: s.sharedWithRole,
      permission: s.permission,
      expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
      accessCount: s.accessCount,
      createdBy: s.createdBy,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  /**
   * Validates if a user has access via document share
   */
  async validateSharedAccess(
    documentId: string,
    userId: string,
    requiredPermission: 'VIEW' | 'DOWNLOAD',
  ): Promise<boolean> {
    const share = await this.prisma.documentShare.findFirst({
      where: {
        documentId,
        sharedWithUserId: userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!share) return false;

    if (requiredPermission === 'DOWNLOAD' && share.permission !== 'DOWNLOAD') {
      return false;
    }

    // Increment access count
    await this.prisma.documentShare.update({
      where: { id: share.id },
      data: { accessCount: { increment: 1 } },
    });

    return true;
  }
}
