// =============================================================================
// Phase 4K: Hostel Allocation & Residence Lifecycle Service
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

function nextAllocationCode(last: string | null): string {
  const year = new Date().getFullYear();
  const base = `ALLOC-${year}-`;
  if (!last) return `${base}00001`;
  const lastNum = parseInt(last.split('-').pop() || '0', 10);
  return `${base}${String(lastNum + 1).padStart(5, '0')}`;
}

@Injectable()
export class HostelAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async allocateStudent(user: CurrentUserPayload, dto: any) {
    // 1. Verify Student exists & active
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId },
      include: { user: true },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    // 2. Check for duplicate active allocation
    const existingActive = await this.prisma.hostelAllocation.findFirst({
      where: {
        studentId: dto.studentId,
        status: { in: ['ACTIVE', 'RESERVED'] },
      },
    });
    if (existingActive) {
      throw new ConflictException('Student already has an active or reserved hostel allocation');
    }

    // 3. Verify Hostel & Room
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id: dto.roomId, hostel: { organizationId: user.organizationId } },
      include: { hostel: true, beds: true },
    });
    if (!room) throw new NotFoundException('Hostel room not found');

    // Gender check if restricted
    if (room.genderEligibility !== 'ANY' && student.user?.gender) {
      if (room.genderEligibility !== student.user.gender) {
        throw new BadRequestException(
          `Room requires ${room.genderEligibility} students, but student gender is ${student.user.gender}`,
        );
      }
    }

    // 4. Capacity validation
    const currentActiveCount = await this.prisma.hostelAllocation.count({
      where: { roomId: dto.roomId, status: { in: ['ACTIVE', 'RESERVED'] } },
    });

    if (currentActiveCount >= room.capacity && !dto.isOverride) {
      throw new BadRequestException(
        `Room capacity (${room.capacity}) reached. Current occupants: ${currentActiveCount}. Explicit override required.`,
      );
    }

    // 5. Verify Bed availability if bedId provided
    if (dto.bedId) {
      const bed = await this.prisma.hostelBed.findFirst({
        where: { id: dto.bedId, roomId: dto.roomId },
      });
      if (!bed) throw new NotFoundException('Specified bed not found in this room');
      if (bed.status !== 'AVAILABLE' && !dto.isOverride) {
        throw new ConflictException(`Bed ${bed.bedNumber} is currently ${bed.status}`);
      }
    }

    // 6. Generate sequential allocation code
    const last = await this.prisma.hostelAllocation.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { allocationNumber: true },
    });
    const allocationNumber = nextAllocationCode(last?.allocationNumber ?? null);

    // 7. Transactional creation
    const allocation = await this.prisma.$transaction(async (tx) => {
      const alloc = await tx.hostelAllocation.create({
        data: {
          organizationId: user.organizationId,
          allocationNumber,
          studentId: dto.studentId,
          hostelId: room.hostelId,
          buildingId: room.buildingId,
          floorId: room.floorId,
          roomId: dto.roomId,
          bedId: dto.bedId,
          academicYearId: dto.academicYearId,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
          status: 'RESERVED',
          allocatedBy: user.userId,
          isOverride: !!dto.isOverride,
          overrideReason: dto.overrideReason,
          notes: dto.notes,
          createdBy: user.userId,
        },
      });

      // Update Bed status to RESERVED if assigned
      if (dto.bedId) {
        await tx.hostelBed.update({
          where: { id: dto.bedId },
          data: { status: 'RESERVED' },
        });
      }

      // Check if room now full
      if (currentActiveCount + 1 >= room.capacity) {
        await tx.hostelRoom.update({
          where: { id: room.id },
          data: { status: 'FULL' },
        });
      }

      return alloc;
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'CREATE',
      entity: 'HostelAllocation',
      entityId: allocation.id,
      newValue: allocation,
    });

    return allocation;
  }

  async bulkAllocate(user: CurrentUserPayload, dto: any) {
    const room = await this.prisma.hostelRoom.findFirst({
      where: { id: dto.roomId, hostel: { organizationId: user.organizationId } },
      include: { beds: { where: { status: 'AVAILABLE' } } },
    });
    if (!room) throw new NotFoundException('Room not found');

    const results: any[] = [];
    const exceptions: any[] = [];

    const availableBeds = [...room.beds];

    for (const studentId of dto.studentIds || []) {
      try {
        const bed = availableBeds.shift();
        const alloc = await this.allocateStudent(user, {
          studentId,
          roomId: dto.roomId,
          bedId: bed?.id,
          effectiveFrom: dto.effectiveFrom,
          effectiveTo: dto.effectiveTo,
          isOverride: dto.isOverride,
          overrideReason: dto.overrideReason,
          notes: dto.notes,
        });
        results.push(alloc);
      } catch (err: any) {
        exceptions.push({ studentId, error: err.message });
      }
    }

    return { allocated: results.length, successful: results, exceptions };
  }

  async checkIn(user: CurrentUserPayload, id: string, dto: any) {
    const allocation = await this.prisma.hostelAllocation.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!allocation) throw new NotFoundException('Hostel allocation not found');
    if (allocation.status === 'ACTIVE') {
      throw new ConflictException('Resident is already checked in');
    }
    if (allocation.status === 'CHECKED_OUT' || allocation.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot check in an allocation in ${allocation.status} status`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const a = await tx.hostelAllocation.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          checkInDate: dto?.checkInDate ? new Date(dto.checkInDate) : new Date(),
          checkedInBy: user.userId,
          checkInNotes: dto?.notes,
          updatedBy: user.userId,
        },
      });

      if (allocation.bedId) {
        await tx.hostelBed.update({
          where: { id: allocation.bedId },
          data: { status: 'OCCUPIED' },
        });
      }

      return a;
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelAllocation',
      entityId: id,
      oldValue: { status: allocation.status },
      newValue: { status: 'ACTIVE', checkInDate: updated.checkInDate },
    });

    return updated;
  }

  async checkOut(user: CurrentUserPayload, id: string, dto: any) {
    const allocation = await this.prisma.hostelAllocation.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!allocation) throw new NotFoundException('Hostel allocation not found');
    if (allocation.status === 'CHECKED_OUT') {
      throw new ConflictException('Resident is already checked out');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const a = await tx.hostelAllocation.update({
        where: { id },
        data: {
          status: 'CHECKED_OUT',
          checkOutDate: dto?.checkOutDate ? new Date(dto.checkOutDate) : new Date(),
          checkOutReason: dto.reason,
          checkOutNotes: dto.notes,
          checkedOutBy: user.userId,
          effectiveTo: new Date(),
          updatedBy: user.userId,
        },
      });

      // Free the bed
      if (allocation.bedId) {
        await tx.hostelBed.update({
          where: { id: allocation.bedId },
          data: {
            status: 'AVAILABLE',
            condition: dto.bedCondition ?? undefined,
          },
        });
      }

      // Re-evaluate room status
      const activeCount = await tx.hostelAllocation.count({
        where: { roomId: allocation.roomId, status: { in: ['ACTIVE', 'RESERVED'] } },
      });
      const room = await tx.hostelRoom.findUnique({ where: { id: allocation.roomId } });
      if (room && activeCount < room.capacity && room.status === 'FULL') {
        await tx.hostelRoom.update({
          where: { id: room.id },
          data: { status: 'AVAILABLE' },
        });
      }

      return a;
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelAllocation',
      entityId: id,
      oldValue: { status: allocation.status },
      newValue: { status: 'CHECKED_OUT', checkOutReason: dto.reason },
    });

    return updated;
  }

  async transferAllocation(user: CurrentUserPayload, id: string, dto: any) {
    const currentAlloc = await this.prisma.hostelAllocation.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!currentAlloc) throw new NotFoundException('Current allocation not found');
    if (currentAlloc.status !== 'ACTIVE' && currentAlloc.status !== 'RESERVED') {
      throw new BadRequestException('Only active or reserved allocations can be transferred');
    }

    // Verify new room
    const newRoom = await this.prisma.hostelRoom.findFirst({
      where: { id: dto.newRoomId, hostel: { organizationId: user.organizationId } },
    });
    if (!newRoom) throw new NotFoundException('Target room not found');

    // Check capacity of new room
    const targetOccupants = await this.prisma.hostelAllocation.count({
      where: { roomId: dto.newRoomId, status: { in: ['ACTIVE', 'RESERVED'] } },
    });
    if (targetOccupants >= newRoom.capacity && !dto.isOverride) {
      throw new BadRequestException(
        `Target room capacity (${newRoom.capacity}) reached. Explicit override required.`,
      );
    }

    // Check new bed if provided
    if (dto.newBedId) {
      const newBed = await this.prisma.hostelBed.findFirst({
        where: { id: dto.newBedId, roomId: dto.newRoomId },
      });
      if (!newBed) throw new NotFoundException('Specified new bed not found');
      if (newBed.status !== 'AVAILABLE' && !dto.isOverride) {
        throw new ConflictException(`Target bed is ${newBed.status}`);
      }
    }

    const last = await this.prisma.hostelAllocation.findFirst({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
      select: { allocationNumber: true },
    });
    const allocationNumber = nextAllocationCode(last?.allocationNumber ?? null);

    const effectiveDate = new Date(dto.effectiveDate);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark current allocation as TRANSFERRED
      await tx.hostelAllocation.update({
        where: { id },
        data: {
          status: 'TRANSFERRED',
          effectiveTo: effectiveDate,
          notes: `${currentAlloc.notes ?? ''}\nTransferred to room ${newRoom.roomNumber}: ${dto.reason}`.trim(),
          updatedBy: user.userId,
        },
      });

      // Free previous bed
      if (currentAlloc.bedId) {
        await tx.hostelBed.update({
          where: { id: currentAlloc.bedId },
          data: { status: 'AVAILABLE' },
        });
      }

      // 2. Create new allocation
      const newAlloc = await tx.hostelAllocation.create({
        data: {
          organizationId: user.organizationId,
          allocationNumber,
          studentId: currentAlloc.studentId,
          hostelId: newRoom.hostelId,
          buildingId: newRoom.buildingId,
          floorId: newRoom.floorId,
          roomId: dto.newRoomId,
          bedId: dto.newBedId,
          academicYearId: currentAlloc.academicYearId,
          effectiveFrom: effectiveDate,
          status: currentAlloc.status, // preserve ACTIVE / RESERVED
          checkInDate: currentAlloc.checkInDate,
          allocatedBy: user.userId,
          isOverride: !!dto.isOverride,
          overrideReason: dto.overrideReason,
          notes: `Transferred from allocation ${currentAlloc.allocationNumber}: ${dto.reason}`,
          createdBy: user.userId,
        },
      });

      // Reserve/Occupy new bed
      if (dto.newBedId) {
        await tx.hostelBed.update({
          where: { id: dto.newBedId },
          data: { status: currentAlloc.status === 'ACTIVE' ? 'OCCUPIED' : 'RESERVED' },
        });
      }

      return newAlloc;
    });

    await this.audit.log({
      userId: user.userId,
      organizationId: user.organizationId,
      action: 'UPDATE',
      entity: 'HostelAllocation',
      entityId: id,
      oldValue: { status: currentAlloc.status, roomId: currentAlloc.roomId },
      newValue: { status: 'TRANSFERRED', newAllocationId: result.id },
    });

    return result;
  }

  async listAllocations(
    user: CurrentUserPayload,
    hostelId?: string,
    roomId?: string,
    studentId?: string,
    status?: string,
  ) {
    return this.prisma.hostelAllocation.findMany({
      where: {
        organizationId: user.organizationId,
        ...(hostelId ? { hostelId } : {}),
        ...(roomId ? { roomId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        hostel: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true, roomType: true, capacity: true } },
        bed: { select: { id: true, bedNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllocation(user: CurrentUserPayload, id: string) {
    const allocation = await this.prisma.hostelAllocation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        student: { include: { user: true } },
        hostel: true,
        building: true,
        floor: true,
        room: true,
        bed: true,
      },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');
    return allocation;
  }

  async getStudentHostelHistory(user: CurrentUserPayload, studentId: string) {
    return this.prisma.hostelAllocation.findMany({
      where: { studentId, organizationId: user.organizationId },
      include: {
        hostel: { select: { id: true, name: true, code: true } },
        building: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true, roomType: true } },
        bed: { select: { id: true, bedNumber: true } },
      },
      orderBy: { allocationDate: 'desc' },
    });
  }
}
