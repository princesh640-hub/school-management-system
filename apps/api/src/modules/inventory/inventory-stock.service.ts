// =============================================================================
// Phase 4L: Inventory Stock Service (Stores, Locations, Balances, Movements)
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
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Stores (Warehouses / Sub-stores)
  // ---------------------------------------------------------------------------

  async createStore(user: CurrentUserPayload, dto: any) {
    const existing = await this.prisma.store.findFirst({
      where: { organizationId: user.organizationId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Store code '${dto.code}' already exists`);
    }

    const store = await this.prisma.store.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId,
        name: dto.name,
        code: dto.code,
        address: dto.address,
        managerId: dto.managerId,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes,
      },
      include: {
        campus: true,
        manager: true,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'STORE_CREATED',
      resource: 'Store',
      resourceId: store.id,
      details: { name: store.name, code: store.code },
    });

    return store;
  }

  async listStores(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.campusId) where.campusId = filters.campusId;
    if (filters.status) where.status = filters.status;

    return this.prisma.store.findMany({
      where,
      include: {
        campus: true,
        manager: true,
        locations: true,
        _count: { select: { balances: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStoreById(user: CurrentUserPayload, id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        campus: true,
        manager: true,
        locations: true,
        balances: {
          include: { item: true },
        },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async updateStore(user: CurrentUserPayload, id: string, dto: any) {
    await this.getStoreById(user, id);

    const updated = await this.prisma.store.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        campusId: dto.campusId,
        address: dto.address,
        managerId: dto.managerId,
        status: dto.status,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'STORE_UPDATED',
      resource: 'Store',
      resourceId: id,
      details: dto,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 2. Storage Locations (Aisles, Racks, Shelves, Bins)
  // ---------------------------------------------------------------------------

  async createLocation(user: CurrentUserPayload, storeId: string, dto: any) {
    await this.getStoreById(user, storeId);

    const existing = await this.prisma.storageLocation.findFirst({
      where: { storeId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Location code '${dto.code}' already exists in this store`);
    }

    const location = await this.prisma.storageLocation.create({
      data: {
        storeId,
        name: dto.name,
        code: dto.code,
        zone: dto.zone,
        rack: dto.rack,
        shelf: dto.shelf,
        bin: dto.bin,
        status: dto.status ?? 'ACTIVE',
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'STORAGE_LOCATION_CREATED',
      resource: 'StorageLocation',
      resourceId: location.id,
      details: { storeId, name: location.name, code: location.code },
    });

    return location;
  }

  async listLocations(user: CurrentUserPayload, storeId: string) {
    await this.getStoreById(user, storeId);

    return this.prisma.storageLocation.findMany({
      where: { storeId },
      orderBy: { code: 'asc' },
    });
  }

  async updateLocation(user: CurrentUserPayload, id: string, dto: any) {
    const location = await this.prisma.storageLocation.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!location || location.store.organizationId !== user.organizationId) {
      throw new NotFoundException('Storage location not found');
    }

    const updated = await this.prisma.storageLocation.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        zone: dto.zone,
        rack: dto.rack,
        shelf: dto.shelf,
        bin: dto.bin,
        status: dto.status,
      },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 3. Inventory Balances
  // ---------------------------------------------------------------------------

  async listBalances(user: CurrentUserPayload, filters: any = {}) {
    const where: any = {
      store: { organizationId: user.organizationId },
    };
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.itemId) where.itemId = filters.itemId;

    return this.prisma.inventoryBalance.findMany({
      where,
      include: {
        store: true,
        item: {
          include: { category: true, uom: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getBalance(user: CurrentUserPayload, storeId: string, itemId: string) {
    const balance = await this.prisma.inventoryBalance.findUnique({
      where: {
        storeId_itemId: { storeId, itemId },
      },
      include: {
        store: true,
        item: {
          include: { category: true, uom: true },
        },
      },
    });
    if (!balance || balance.store.organizationId !== user.organizationId) {
      return {
        storeId,
        itemId,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
      };
    }
    return balance;
  }

  // ---------------------------------------------------------------------------
  // 4. Stock Movements (Ledger)
  // ---------------------------------------------------------------------------

  async recordOpeningStock(user: CurrentUserPayload, dto: any) {
    const { storeId, itemId, quantity, unitCost, locationId, notes } = dto;
    if (!quantity || quantity <= 0) {
      throw new BadRequestException('Opening stock quantity must be greater than zero');
    }

    await this.getStoreById(user, storeId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId: user.organizationId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const movementNumber = await this.generateMovementNumber(user.organizationId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create movement
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId: user.organizationId,
          movementNumber,
          itemId,
          storeId,
          locationId,
          movementType: 'OPENING',
          quantity: new Prisma.Decimal(quantity),
          unitCost: unitCost ? new Prisma.Decimal(unitCost) : item.unitCost,
          totalCost: new Prisma.Decimal(quantity).mul(
            unitCost ? new Prisma.Decimal(unitCost) : item.unitCost,
          ),
          reference: 'Opening Stock Entry',
          recordedBy: user.userId,
          notes,
        },
      });

      // 2. Upsert balance
      await tx.inventoryBalance.upsert({
        where: { storeId_itemId: { storeId, itemId } },
        create: {
          storeId,
          itemId,
          quantityOnHand: new Prisma.Decimal(quantity),
          quantityReserved: new Prisma.Decimal(0),
          quantityAvailable: new Prisma.Decimal(quantity),
        },
        update: {
          quantityOnHand: { increment: new Prisma.Decimal(quantity) },
          quantityAvailable: { increment: new Prisma.Decimal(quantity) },
        },
      });

      return movement;
    });
  }

  async recordIssue(user: CurrentUserPayload, dto: any) {
    const { storeId, itemId, quantity, recipient, reference, notes } = dto;
    if (!quantity || quantity <= 0) {
      throw new BadRequestException('Issue quantity must be greater than zero');
    }

    await this.getStoreById(user, storeId);
    const balance = await this.getBalance(user, storeId, itemId);
    const available = Number(balance.quantityAvailable);

    if (available < quantity) {
      throw new BadRequestException(
        `Insufficient available stock. Available: ${available}, Requested: ${quantity}`,
      );
    }

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId: user.organizationId },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const movementNumber = await this.generateMovementNumber(user.organizationId);

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({
        data: {
          organizationId: user.organizationId,
          movementNumber,
          itemId,
          storeId,
          movementType: 'ISSUE',
          quantity: new Prisma.Decimal(-quantity),
          unitCost: item.unitCost,
          totalCost: new Prisma.Decimal(-quantity).mul(item.unitCost),
          reference,
          recipient,
          recordedBy: user.userId,
          notes,
        },
      });

      await tx.inventoryBalance.update({
        where: { storeId_itemId: { storeId, itemId } },
        data: {
          quantityOnHand: { decrement: new Prisma.Decimal(quantity) },
          quantityAvailable: { decrement: new Prisma.Decimal(quantity) },
        },
      });

      return movement;
    });
  }

  async listMovements(user: CurrentUserPayload, filters: any = {}) {
    const where: any = { organizationId: user.organizationId };
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.itemId) where.itemId = filters.itemId;
    if (filters.movementType) where.movementType = filters.movementType;
    if (filters.startDate || filters.endDate) {
      where.movementDate = {};
      if (filters.startDate) where.movementDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.movementDate.lte = new Date(filters.endDate);
    }

    return this.prisma.inventoryMovement.findMany({
      where,
      include: {
        item: { include: { uom: true } },
        store: true,
        location: true,
      },
      orderBy: { movementDate: 'desc' },
      take: filters.limit ? Number(filters.limit) : 100,
    });
  }

  private async generateMovementNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.inventoryMovement.count({
      where: { organizationId },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `MOV-${year}-${seq}`;
  }
}
