// =============================================================================
// Phase 4L: Inventory Catalog Service (Categories, UOMs, Items)
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class InventoryCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Categories
  // ---------------------------------------------------------------------------

  async createCategory(user: CurrentUserPayload, dto: any) {
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { organizationId: user.organizationId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Category code '${dto.code}' already exists`);
    }

    const category = await this.prisma.inventoryCategory.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        status: dto.status ?? 'ACTIVE',
      },
      include: { parent: true },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'INVENTORY_CATEGORY_CREATED',
      resource: 'InventoryCategory',
      resourceId: category.id,
      details: { name: category.name, code: category.code },
    });

    return category;
  }

  async listCategories(user: CurrentUserPayload, status?: string) {
    const where: any = { organizationId: user.organizationId };
    if (status) where.status = status;

    return this.prisma.inventoryCategory.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: { select: { items: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(user: CurrentUserPayload, id: string) {
    const category = await this.prisma.inventoryCategory.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        parent: true,
        children: true,
        items: true,
      },
    });
    if (!category) throw new NotFoundException(`Category not found`);
    return category;
  }

  async updateCategory(user: CurrentUserPayload, id: string, dto: any) {
    await this.getCategoryById(user, id);
    const updated = await this.prisma.inventoryCategory.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        parentId: dto.parentId,
        status: dto.status,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'INVENTORY_CATEGORY_UPDATED',
      resource: 'InventoryCategory',
      resourceId: id,
      details: dto,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 2. Units of Measure (UOM)
  // ---------------------------------------------------------------------------

  async createUom(user: CurrentUserPayload, dto: any) {
    const existing = await this.prisma.unitOfMeasure.findFirst({
      where: { organizationId: user.organizationId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`UOM code '${dto.code}' already exists`);
    }

    const uom = await this.prisma.unitOfMeasure.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name,
        code: dto.code,
        symbol: dto.symbol,
        status: dto.status ?? 'ACTIVE',
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UOM_CREATED',
      resource: 'UnitOfMeasure',
      resourceId: uom.id,
      details: { name: uom.name, code: uom.code },
    });

    return uom;
  }

  async listUoms(user: CurrentUserPayload, status?: string) {
    const where: any = { organizationId: user.organizationId };
    if (status) where.status = status;

    return this.prisma.unitOfMeasure.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async updateUom(user: CurrentUserPayload, id: string, dto: any) {
    const existing = await this.prisma.unitOfMeasure.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('UOM not found');

    const updated = await this.prisma.unitOfMeasure.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        symbol: dto.symbol,
        status: dto.status,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UOM_UPDATED',
      resource: 'UnitOfMeasure',
      resourceId: id,
      details: dto,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 3. Inventory Items
  // ---------------------------------------------------------------------------

  async createItem(user: CurrentUserPayload, dto: any) {
    const itemCode = dto.itemCode || (await this.generateItemCode(user.organizationId));

    const existing = await this.prisma.inventoryItem.findFirst({
      where: { organizationId: user.organizationId, itemCode },
    });
    if (existing) {
      throw new ConflictException(`Item with code '${itemCode}' already exists`);
    }

    const item = await this.prisma.inventoryItem.create({
      data: {
        organizationId: user.organizationId,
        itemCode,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        uomId: dto.uomId,
        brand: dto.brand,
        barcode: dto.barcode,
        reorderLevel: dto.reorderLevel ?? 0,
        reorderQuantity: dto.reorderQuantity ?? 0,
        minStock: dto.minStock ?? 0,
        maxStock: dto.maxStock ?? null,
        unitCost: dto.unitCost ?? 0,
        trackBatch: dto.trackBatch ?? false,
        trackSerial: dto.trackSerial ?? false,
        trackExpiry: dto.trackExpiry ?? false,
        status: dto.status ?? 'ACTIVE',
      },
      include: { category: true, uom: true },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'INVENTORY_ITEM_CREATED',
      resource: 'InventoryItem',
      resourceId: item.id,
      details: { itemCode: item.itemCode, name: item.name },
    });

    return item;
  }

  async listItems(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { itemCode: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
        uom: true,
        balances: {
          include: { store: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getItemById(user: CurrentUserPayload, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        category: true,
        uom: true,
        balances: {
          include: { store: true },
        },
      },
    });
    if (!item) throw new NotFoundException(`Inventory item not found`);
    return item;
  }

  async updateItem(user: CurrentUserPayload, id: string, dto: any) {
    await this.getItemById(user, id);

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        uomId: dto.uomId,
        brand: dto.brand,
        barcode: dto.barcode,
        reorderLevel: dto.reorderLevel !== undefined ? dto.reorderLevel : undefined,
        reorderQuantity: dto.reorderQuantity !== undefined ? dto.reorderQuantity : undefined,
        minStock: dto.minStock !== undefined ? dto.minStock : undefined,
        maxStock: dto.maxStock !== undefined ? dto.maxStock : undefined,
        unitCost: dto.unitCost !== undefined ? dto.unitCost : undefined,
        trackBatch: dto.trackBatch !== undefined ? dto.trackBatch : undefined,
        trackSerial: dto.trackSerial !== undefined ? dto.trackSerial : undefined,
        trackExpiry: dto.trackExpiry !== undefined ? dto.trackExpiry : undefined,
        status: dto.status,
      },
      include: { category: true, uom: true },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'INVENTORY_ITEM_UPDATED',
      resource: 'InventoryItem',
      resourceId: id,
      details: dto,
    });

    return updated;
  }

  private async generateItemCode(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.inventoryItem.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `ITEM-${year}-${seq}`;
  }
}
