// =============================================================================
// Phase 4K: Hostel Structure Service (Hostels, Buildings, Floors, Rooms, Beds)
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
export class HostelStructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Hostels
  // ---------------------------------------------------------------------------

  async createHostel(user: CurrentUserPayload, dto: any) {
    const existing = await this.prisma.hostel.findFirst({
      where: { organizationId: user.organizationId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Hostel code '${dto.code}' already exists`);

    const hostel = await this.prisma.hostel.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId,
        name: dto.name,
        code: dto.code,
        hostelType: dto.hostelType ?? 'COED',
        status: dto.status ?? 'ACTIVE',
        address: dto.address,
        city: dto.city,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        capacity: dto.capacity ?? 0,
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'Hostel',
      entityId: hostel.id,
      newValue: hostel,
    });

    return hostel;
  }

  async listHostels(user: CurrentUserPayload, campusId?: string, status?: string) {
    return this.prisma.hostel.findMany({
      where: {
        organizationId: user.organizationId,
        ...(campusId ? { campusId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        campus: { select: { id: true, name: true } },
        _count: {
          select: {
            buildings: true,
            rooms: true,
            allocations: { where: { status: 'ACTIVE' } },
            wardens: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getHostel(user: CurrentUserPayload, id: string) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        campus: { select: { id: true, name: true } },
        buildings: {
          include: {
            _count: { select: { rooms: true, allocations: { where: { status: 'ACTIVE' } } } },
          },
        },
        rooms: {
          include: {
            beds: true,
            _count: { select: { allocations: { where: { status: 'ACTIVE' } } } },
          },
        },
        wardens: {
          where: { status: 'ACTIVE' },
          include: {
            employee: {
              include: { user: { select: { firstName: true, lastName: true, phone: true } } },
            },
          },
        },
      },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');
    return hostel;
  }

  async updateHostel(user: CurrentUserPayload, id: string, dto: any) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const updated = await this.prisma.hostel.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'Hostel',
      entityId: id,
      oldValue: hostel,
      newValue: updated,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 2. Buildings / Blocks
  // ---------------------------------------------------------------------------

  async createBuilding(user: CurrentUserPayload, dto: any) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const existing = await this.prisma.hostelBuilding.findFirst({
      where: { hostelId: dto.hostelId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Building code '${dto.code}' already exists in this hostel`);

    const building = await this.prisma.hostelBuilding.create({
      data: {
        hostelId: dto.hostelId,
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity ?? 0,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes,
        createdBy: user.userId,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelBuilding',
      entityId: building.id,
      newValue: building,
    });

    return building;
  }

  async listBuildings(user: CurrentUserPayload, hostelId?: string) {
    return this.prisma.hostelBuilding.findMany({
      where: {
        hostel: { organizationId: user.organizationId },
        ...(hostelId ? { hostelId } : {}),
      },
      include: {
        hostel: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            floors: true,
            rooms: true,
            allocations: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getBuilding(user: CurrentUserPayload, id: string) {
    const building = await this.prisma.hostelBuilding.findFirst({
      where: { id, hostel: { organizationId: user.organizationId } },
      include: {
        hostel: true,
        floors: { orderBy: { floorNumber: 'asc' } },
        rooms: {
          include: {
            beds: true,
            _count: { select: { allocations: { where: { status: 'ACTIVE' } } } },
          },
        },
      },
    });
    if (!building) throw new NotFoundException('Building not found');
    return building;
  }

  async updateBuilding(user: CurrentUserPayload, id: string, dto: any) {
    const building = await this.prisma.hostelBuilding.findFirst({
      where: { id, hostel: { organizationId: user.organizationId } },
    });
    if (!building) throw new NotFoundException('Building not found');

    const updated = await this.prisma.hostelBuilding.update({
      where: { id },
      data: { ...dto, updatedBy: user.userId },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelBuilding',
      entityId: id,
      oldValue: building,
      newValue: updated,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 3. Floors
  // ---------------------------------------------------------------------------

  async createFloor(user: CurrentUserPayload, dto: any) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const existing = await this.prisma.hostelFloor.findFirst({
      where: { hostelId: dto.hostelId, floorNumber: dto.floorNumber },
    });
    if (existing) throw new ConflictException(`Floor number ${dto.floorNumber} already exists in this hostel`);

    return this.prisma.hostelFloor.create({
      data: {
        hostelId: dto.hostelId,
        buildingId: dto.buildingId,
        floorNumber: dto.floorNumber,
        name: dto.name,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes,
      },
    });
  }

  async listFloors(user: CurrentUserPayload, hostelId?: string, buildingId?: string) {
    return this.prisma.hostelFloor.findMany({
      where: {
        hostel: { organizationId: user.organizationId },
        ...(hostelId ? { hostelId } : {}),
        ...(buildingId ? { buildingId } : {}),
      },
      include: {
        building: { select: { id: true, name: true } },
        _count: { select: { rooms: true } },
      },
      orderBy: { floorNumber: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Rooms
  // ---------------------------------------------------------------------------

  async createRoom(user: CurrentUserPayload, dto: any) {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: dto.hostelId, organizationId: user.organizationId },
    });
    if (!hostel) throw new NotFoundException('Hostel not found');

    const existing = await this.prisma.hostelRoom.findFirst({
      where: { hostelId: dto.hostelId, roomNumber: dto.roomNumber },
    });
    if (existing) throw new ConflictException(`Room number '${dto.roomNumber}' already exists in this hostel`);

    if (dto.capacity <= 0) throw new BadRequestException('Room capacity must be greater than 0');

    const room = await this.prisma.$transaction(async (tx) => {
      const r = await tx.hostelRoom.create({
        data: {
          hostelId: dto.hostelId,
          buildingId: dto.buildingId,
          floorId: dto.floorId,
          roomNumber: dto.roomNumber,
          name: dto.name,
          roomType: dto.roomType ?? 'SHARED_ROOM',
          genderEligibility: dto.genderEligibility ?? 'ANY',
          capacity: dto.capacity,
          status: dto.status ?? 'AVAILABLE',
          facilities: dto.facilities ?? [],
          feeAmount: dto.feeAmount,
          feeStructureId: dto.feeStructureId,
          notes: dto.notes,
          createdBy: user.userId,
        },
      });

      // Auto-generate beds for the room if requested
      if (dto.autoCreateBeds) {
        for (let i = 1; i <= dto.capacity; i++) {
          await tx.hostelBed.create({
            data: {
              roomId: r.id,
              bedNumber: `BED-${String(i).padStart(2, '0')}`,
              status: 'AVAILABLE',
              condition: 'GOOD',
            },
          });
        }
      }

      return r;
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelRoom',
      entityId: room.id,
      newValue: room,
    });

    return room;
  }

  async listRooms(
    user: CurrentUserPayload,
    hostelId?: string,
    buildingId?: string,
    floorId?: string,
    status?: string,
  ) {
    return this.prisma.hostelRoom.findMany({
      where: {
        hostel: { organizationId: user.organizationId },
        ...(hostelId ? { hostelId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(floorId ? { floorId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        hostel: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true } },
        floor: { select: { id: true, name: true, floorNumber: true } },
        beds: { orderBy: { bedNumber: 'asc' } },
        _count: {
          select: {
            beds: true,
            allocations: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoom(user: CurrentUserPayload, id: string) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id, hostel: { organizationId: user.organizationId } },
      include: {
        hostel: true,
        building: true,
        floor: true,
        beds: true,
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true, phone: true } },
              },
            },
            bed: true,
          },
        },
        maintenanceRequests: {
          where: { status: { not: 'CLOSED' } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async updateRoom(user: CurrentUserPayload, id: string, dto: any) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id, hostel: { organizationId: user.organizationId } },
    });
    if (!room) throw new NotFoundException('Room not found');

    const updated = await this.prisma.hostelRoom.update({
      where: { id },
      data: { ...dto, updatedBy: user.userId },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelRoom',
      entityId: id,
      oldValue: room,
      newValue: updated,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // 5. Beds
  // ---------------------------------------------------------------------------

  async createBed(user: CurrentUserPayload, dto: any) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id: dto.roomId, hostel: { organizationId: user.organizationId } },
    });
    if (!room) throw new NotFoundException('Room not found');

    const existing = await this.prisma.hostelBed.findFirst({
      where: { roomId: dto.roomId, bedNumber: dto.bedNumber },
    });
    if (existing) throw new ConflictException(`Bed '${dto.bedNumber}' already exists in this room`);

    const bed = await this.prisma.hostelBed.create({
      data: {
        roomId: dto.roomId,
        bedNumber: dto.bedNumber,
        status: dto.status ?? 'AVAILABLE',
        condition: dto.condition ?? 'GOOD',
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelBed',
      entityId: bed.id,
      newValue: bed,
    });

    return bed;
  }

  async listBeds(user: CurrentUserPayload, roomId?: string, status?: string) {
    return this.prisma.hostelBed.findMany({
      where: {
        room: { hostel: { organizationId: user.organizationId } },
        ...(roomId ? { roomId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            roomType: true,
            hostel: { select: { id: true, name: true } },
          },
        },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
          take: 1,
        },
      },
      orderBy: { bedNumber: 'asc' },
    });
  }

  async updateBedStatus(user: CurrentUserPayload, id: string, dto: any) {
    const bed = await this.prisma.hostelBed.findFirst({
      where: { id, room: { hostel: { organizationId: user.organizationId } } },
    });
    if (!bed) throw new NotFoundException('Bed not found');

    const updated = await this.prisma.hostelBed.update({
      where: { id },
      data: {
        status: dto.status,
        condition: dto.condition ?? bed.condition,
        notes: dto.notes ?? bed.notes,
      },
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelBed',
      entityId: id,
      oldValue: { status: bed.status },
      newValue: { status: dto.status },
    });

    return updated;
  }
}
