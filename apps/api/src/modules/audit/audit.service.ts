import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    organizationId: string;
    campusId?: string | null;
    userId?: string | null;
    action: string;
    module: string;
    resourceId?: string | null;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          campusId: params.campusId,
          userId: params.userId,
          action: params.action,
          module: params.module,
          resourceId: params.resourceId,
          oldValues: params.oldValues ? JSON.parse(JSON.stringify(params.oldValues)) : null,
          newValues: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : null,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (err) {
      // Safe audit logging: failure to write audit should not unseat core operational workflow
      console.error('AuditLog creation warning:', err);
      return null;
    }
  }

  async findAll(
    organizationId: string,
    query: PaginationQueryDto & {
      module?: string;
      action?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: any = { organizationId };

    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { module: { contains: query.search, mode: 'insensitive' } },
        { action: { contains: query.search, mode: 'insensitive' } },
        { resourceId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data: logs,
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }
}
