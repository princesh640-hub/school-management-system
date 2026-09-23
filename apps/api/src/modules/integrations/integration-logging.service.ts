// =============================================================================
// Phase 4S: Integration Logging & Observability Service
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { NormalizedErrorCode } from '@school/shared-types';

export interface LogIntegrationOptions {
  organizationId: string;
  campusId?: string | null;
  integrationId?: string | null;
  type: string;
  provider: string;
  operation: string;
  direction?: 'INBOUND' | 'OUTBOUND';
  correlationId?: string;
  externalRef?: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING' | 'TIMEOUT';
  latencyMs?: number;
  retryCount?: number;
  error?: any;
  metadata?: Record<string, any>;
}

@Injectable()
export class IntegrationLoggingService {
  private readonly logger = new Logger(IntegrationLoggingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalizes disparate provider error messages and status codes into canonical categories
   */
  normalizeError(error: any): { code: NormalizedErrorCode; message: string } {
    if (!error) {
      return { code: 'UNKNOWN', message: 'Unknown provider error' };
    }

    const rawMessage = typeof error === 'string' ? error : error.message || JSON.stringify(error);
    const msg = rawMessage.toLowerCase();
    const status = error.status || error.statusCode || error.response?.status;

    if (
      status === 401 ||
      msg.includes('unauthorized') ||
      msg.includes('api key') ||
      msg.includes('invalid credentials') ||
      msg.includes('auth token') ||
      msg.includes('authentication')
    ) {
      return { code: 'AUTHENTICATION_ERROR', message: rawMessage };
    }

    if (
      status === 403 ||
      msg.includes('forbidden') ||
      msg.includes('permission') ||
      msg.includes('scope') ||
      msg.includes('not allowed')
    ) {
      return { code: 'AUTHORIZATION_ERROR', message: rawMessage };
    }

    if (
      status === 429 ||
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('quota exceeded') ||
      msg.includes('throttled')
    ) {
      return { code: 'RATE_LIMITED', message: rawMessage };
    }

    if (
      status === 408 ||
      status === 504 ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('gateway timeout')
    ) {
      return { code: 'TIMEOUT', message: rawMessage };
    }

    if (
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('network') ||
      msg.includes('socket hang up') ||
      msg.includes('dns')
    ) {
      return { code: 'NETWORK_ERROR', message: rawMessage };
    }

    if (
      status === 400 ||
      msg.includes('validation') ||
      msg.includes('invalid format') ||
      msg.includes('missing required')
    ) {
      return { code: 'VALIDATION_ERROR', message: rawMessage };
    }

    if (status === 404 || msg.includes('not found')) {
      return { code: 'NOT_FOUND', message: rawMessage };
    }

    if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('idempotency')) {
      return { code: 'DUPLICATE', message: rawMessage };
    }

    return { code: 'PROVIDER_ERROR', message: rawMessage };
  }

  /**
   * Sanitizes payloads to guarantee secrets and credit cards are NEVER logged
   */
  private sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;
    const sanitized: Record<string, any> = {};

    for (const [k, v] of Object.entries(meta)) {
      if (/(password|secret|key|token|card|cvv|pan|pin)/i.test(k)) {
        sanitized[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        sanitized[k] = this.sanitizeMetadata(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  /**
   * Structured, audited log entry
   */
  async log(options: LogIntegrationOptions) {
    let normalizedError: NormalizedErrorCode | undefined;
    let errorMessage: string | undefined;

    if (options.error) {
      const normalized = this.normalizeError(options.error);
      normalizedError = normalized.code;
      errorMessage = normalized.message;
    }

    const sanitizedMeta = this.sanitizeMetadata(options.metadata);

    try {
      await this.prisma.integrationLog.create({
        data: {
          organizationId: options.organizationId,
          campusId: options.campusId || null,
          integrationId: options.integrationId || null,
          type: options.type,
          provider: options.provider,
          operation: options.operation,
          direction: options.direction || 'OUTBOUND',
          correlationId: options.correlationId,
          externalRef: options.externalRef,
          status: options.status,
          latencyMs: options.latencyMs || 0,
          retryCount: options.retryCount || 0,
          normalizedError,
          errorMessage,
          metadata: sanitizedMeta || {},
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record integration log: ${err.message}`);
    }
  }

  async listLogs(
    organizationId: string,
    query: {
      type?: string;
      provider?: string;
      status?: string;
      normalizedError?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { organizationId };
    if (query.type) where.type = query.type;
    if (query.provider) where.provider = query.provider;
    if (query.status) where.status = query.status;
    if (query.normalizedError) where.normalizedError = query.normalizedError;

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const [total, items] = await Promise.all([
      this.prisma.integrationLog.count({ where }),
      this.prisma.integrationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return { total, limit, offset, items };
  }
}
