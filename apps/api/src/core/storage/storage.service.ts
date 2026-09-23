import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

export interface FileUploadPayload {
  bucket: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  uploadedBy?: string;
  buffer?: Buffer;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generates a signed or public URL for an S3/MinIO object
   */
  async getFileUrl(fileKey: string): Promise<string | null> {
    const meta = await this.prisma.fileMetadata.findUnique({
      where: { fileKey },
    });

    if (!meta) {
      return null;
    }

    const endpoint = this.config.get<string>('storage.endpoint');
    const port = this.config.get<number>('storage.port');
    const protocol = this.config.get<boolean>('storage.useSsl') ? 'https' : 'http';

    return `${protocol}://${endpoint}:${port}/${meta.bucketName}/${meta.fileKey}`;
  }

  /**
   * Registers uploaded file metadata in PostgreSQL
   */
  async registerFileMetadata(payload: FileUploadPayload) {
    const record = await this.prisma.fileMetadata.create({
      data: {
        bucketName: payload.bucket,
        fileKey: payload.fileKey,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        sizeInBytes: BigInt(payload.sizeInBytes),
        uploadedBy: payload.uploadedBy,
      },
    });

    this.logger.log(`Registered file metadata: ${payload.fileKey} in bucket ${payload.bucket}`);
    return record;
  }

  /**
   * Generates a secure, short-lived authenticated download URL
   */
  async getSignedDownloadUrl(fileKey: string, expiresInSeconds: number = 900): Promise<{ url: string; expiresAt: Date } | null> {
    const rawUrl = await this.getFileUrl(fileKey);
    if (!rawUrl) return null;

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = Buffer.from(`${fileKey}:${expiresAt.getTime()}`).toString('base64url');
    const signedUrl = `${rawUrl}?token=${token}&expires=${expiresAt.getTime()}`;

    return { url: signedUrl, expiresAt };
  }

  /**
   * Validates file safety, MIME type allowlist, file size, and filename sanitization
   */
  validateFileSafety(
    file: { fileName: string; mimeType: string; sizeInBytes: number },
    allowedMimeTypes: string[] = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: number = 10 * 1024 * 1024,
  ): { isValid: boolean; sanitizedName: string; error?: string } {
    // Check filename safety (path traversal protection)
    const sanitizedName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (file.fileName.includes('..') || file.fileName.includes('/') || file.fileName.includes('\\')) {
      return { isValid: false, sanitizedName, error: 'Illegal path characters in filename.' };
    }

    // Check size
    if (file.sizeInBytes <= 0) {
      return { isValid: false, sanitizedName, error: 'File cannot be empty.' };
    }
    if (file.sizeInBytes > maxSizeBytes) {
      return { isValid: false, sanitizedName, error: `File exceeds maximum allowed size of ${Math.round(maxSizeBytes / (1024 * 1024))}MB.` };
    }

    // Check MIME allowlist
    const normalizedMime = file.mimeType.toLowerCase();
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(normalizedMime)) {
      return { isValid: false, sanitizedName, error: `Disallowed file type: ${file.mimeType}. Allowed types: ${allowedMimeTypes.join(', ')}` };
    }

    return { isValid: true, sanitizedName };
  }
}
