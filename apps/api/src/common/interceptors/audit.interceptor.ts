import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutating operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const user = request.user;
      const url = request.url;
      const ip = request.ip || request.headers['x-forwarded-for'];
      const userAgent = request.headers['user-agent'];

      return next.handle().pipe(
        tap({
          next: async (resData) => {
            try {
              if (user && user.organizationId) {
                // Extract module from URL e.g. /api/v1/students -> students
                const segments = url.split('?')[0].split('/').filter(Boolean);
                const moduleName = segments[2] || 'system';

                const sanitizedValues = method !== 'DELETE' ? this.sanitizePayload(request.body) : null;

                await this.prisma.auditLog.create({
                  data: {
                    organizationId: user.organizationId,
                    campusId: user.campusId || null,
                    userId: user.id || null,
                    action: method,
                    module: moduleName,
                    resourceId: resData?.data?.id || resData?.id || null,
                    newValues: sanitizedValues,
                    ipAddress: String(ip || ''),
                    userAgent: String(userAgent || ''),
                  },
                });
              }
            } catch (err: any) {
              this.logger.warn(`Failed to write audit log: ${err.message}`);
            }
          },
        }),
      );
    }

    return next.handle();
  }

  private sanitizePayload(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = Array.isArray(body) ? [...body] : { ...body };
    for (const [k, v] of Object.entries(sanitized)) {
      if (/(password|secret|key|token|card|cvv|credential|private)/i.test(k)) {
        sanitized[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        sanitized[k] = this.sanitizePayload(v);
      }
    }
    return sanitized;
  }
}

