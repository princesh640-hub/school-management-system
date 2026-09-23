// =============================================================================
// Phase 4L: Procurement Suppliers Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class ProcurementSuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createSupplier(user: CurrentUserPayload, dto: any) {
    const supplierCode =
      dto.supplierCode || (await this.generateSupplierCode(user.organizationId));

    const existing = await this.prisma.supplier.findFirst({
      where: { organizationId: user.organizationId, supplierCode },
    });
    if (existing) {
      throw new ConflictException(`Supplier code '${supplierCode}' already exists`);
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        organizationId: user.organizationId,
        supplierCode,
        name: dto.name,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxId: dto.taxId,
        categories: dto.categories ?? [],
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'SUPPLIER_CREATED',
      resource: 'Supplier',
      resourceId: supplier.id,
      details: { supplierCode: supplier.supplierCode, name: supplier.name },
    });

    return supplier;
  }

  async listSuppliers(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.status) where.status = filters.status;
    if (filters.category) where.categories = { has: filters.category };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { supplierCode: { contains: filters.search, mode: 'insensitive' } },
        { contactPerson: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            goodsReceipts: true,
            supplierInvoices: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSupplierById(user: CurrentUserPayload, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' } },
        goodsReceipts: { take: 10, orderBy: { createdAt: 'desc' } },
        supplierInvoices: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async updateSupplier(user: CurrentUserPayload, id: string, dto: any) {
    await this.getSupplierById(user, id);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxId: dto.taxId,
        categories: dto.categories,
        status: dto.status,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'SUPPLIER_UPDATED',
      resource: 'Supplier',
      resourceId: id,
      details: dto,
    });

    return updated;
  }

  private async generateSupplierCode(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.supplier.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `SUP-${year}-${seq}`;
  }
}
