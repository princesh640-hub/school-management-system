import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  CreateFeeCategoryDto,
  CreateExtendedFeeStructureDto,
  CreateFeeScheduleDto,
  CreateFeeDiscountDto,
  AssignStudentFeeDto,
} from './dto/phase4g-fees.dto';

@Injectable()
export class FeeStructuresService {
  private readonly logger = new Logger(FeeStructuresService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Fee Categories
  // ---------------------------------------------------------------------------

  async createCategory(user: CurrentUserPayload, dto: CreateFeeCategoryDto) {
    const existing = await this.prisma.feeCategory.findFirst({
      where: {
        organizationId: user.organizationId,
        code: dto.code.trim().toUpperCase(),
      },
    });

    if (existing) {
      throw new BadRequestException(`Fee category code "${dto.code}" already exists`);
    }

    const category = await this.prisma.feeCategory.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description || null,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'FEE_CATEGORY',
      resourceId: category.id,
      details: { name: category.name, code: category.code },
    });

    return category;
  }

  async getCategories(user: CurrentUserPayload, campusId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;

    return this.prisma.feeCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { feeStructures: true },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Fee Structures
  // ---------------------------------------------------------------------------

  async createStructure(user: CurrentUserPayload, dto: CreateExtendedFeeStructureDto) {
    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
    });
    if (!campus) throw new NotFoundException('Campus not found');

    if (dto.feeCategoryId) {
      const cat = await this.prisma.feeCategory.findUnique({
        where: { id: dto.feeCategoryId },
      });
      if (!cat) throw new NotFoundException('Fee category not found');
    }

    const structure = await this.prisma.feeStructure.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId,
        feeCategoryId: dto.feeCategoryId || null,
        academicYearId: dto.academicYearId || null,
        classId: dto.classId || null,
        name: dto.name.trim(),
        amount: Number(dto.amount),
        frequency: dto.frequency as any,
        description: dto.description || null,
      },
      include: {
        feeCategory: true,
        campus: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'FEE_STRUCTURE',
      resourceId: structure.id,
      details: { name: structure.name, amount: Number(structure.amount), frequency: structure.frequency },
    });

    return {
      ...structure,
      amount: Number(structure.amount),
    };
  }

  async getStructures(user: CurrentUserPayload, campusId?: string, academicYearId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;
    if (academicYearId) where.academicYearId = academicYearId;

    const list = await this.prisma.feeStructure.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        feeCategory: true,
        campus: { select: { id: true, name: true, code: true } },
        _count: {
          select: { feeInvoices: true, feeSchedules: true, studentFeeAssignments: true },
        },
      },
    });

    return list.map((item) => ({
      ...item,
      amount: Number(item.amount),
    }));
  }

  async getStructureById(id: string) {
    const item = await this.prisma.feeStructure.findUnique({
      where: { id },
      include: {
        feeCategory: true,
        campus: { select: { id: true, name: true, code: true } },
        feeSchedules: true,
        _count: {
          select: { feeInvoices: true, studentFeeAssignments: true },
        },
      },
    });

    if (!item) throw new NotFoundException('Fee structure not found');

    return {
      ...item,
      amount: Number(item.amount),
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Fee Schedules
  // ---------------------------------------------------------------------------

  async createSchedule(user: CurrentUserPayload, dto: CreateFeeScheduleDto) {
    const structure = await this.prisma.feeStructure.findUnique({
      where: { id: dto.feeStructureId },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const schedule = await this.prisma.feeSchedule.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || structure.campusId || null,
        academicYearId: dto.academicYearId,
        feeStructureId: dto.feeStructureId,
        name: dto.name.trim(),
        billingDate: new Date(dto.billingDate),
        dueDate: new Date(dto.dueDate),
        lateFeeType: (dto.lateFeeType || 'FIXED') as any,
        lateFeeValue: Number(dto.lateFeeValue || 0),
        graceDays: Number(dto.graceDays || 0),
        maxLateFee: dto.maxLateFee !== undefined ? Number(dto.maxLateFee) : null,
      },
      include: {
        feeStructure: true,
        academicYear: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'FEE_SCHEDULE',
      resourceId: schedule.id,
      details: { name: schedule.name, dueDate: schedule.dueDate },
    });

    return {
      ...schedule,
      lateFeeValue: Number(schedule.lateFeeValue),
      maxLateFee: schedule.maxLateFee ? Number(schedule.maxLateFee) : null,
    };
  }

  async getSchedules(user: CurrentUserPayload, academicYearId?: string, feeStructureId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (academicYearId) where.academicYearId = academicYearId;
    if (feeStructureId) where.feeStructureId = feeStructureId;

    const items = await this.prisma.feeSchedule.findMany({
      where,
      orderBy: { billingDate: 'desc' },
      include: {
        feeStructure: true,
        academicYear: true,
      },
    });

    return items.map((s) => ({
      ...s,
      lateFeeValue: Number(s.lateFeeValue),
      maxLateFee: s.maxLateFee ? Number(s.maxLateFee) : null,
    }));
  }

  // ---------------------------------------------------------------------------
  // 4. Fee Discounts, Scholarships & Concessions
  // ---------------------------------------------------------------------------

  async createDiscount(user: CurrentUserPayload, dto: CreateFeeDiscountDto) {
    const existing = await this.prisma.feeDiscount.findFirst({
      where: {
        organizationId: user.organizationId,
        code: dto.code.trim().toUpperCase(),
      },
    });

    if (existing) {
      throw new BadRequestException(`Discount code "${dto.code}" already exists`);
    }

    const discount = await this.prisma.feeDiscount.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        discountType: dto.discountType as any,
        value: Number(dto.value),
        description: dto.description || null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'FEE_DISCOUNT',
      resourceId: discount.id,
      details: { code: discount.code, type: discount.discountType, value: Number(discount.value) },
    });

    return {
      ...discount,
      value: Number(discount.value),
    };
  }

  async getDiscounts(user: CurrentUserPayload, campusId?: string) {
    const where: any = { organizationId: user.organizationId };
    if (campusId) where.campusId = campusId;

    const list = await this.prisma.feeDiscount.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return list.map((d) => ({
      ...d,
      value: Number(d.value),
    }));
  }

  // ---------------------------------------------------------------------------
  // 5. Student Fee Assignments & Overrides
  // ---------------------------------------------------------------------------

  async assignStudentFee(user: CurrentUserPayload, dto: AssignStudentFeeDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const structure = await this.prisma.feeStructure.findUnique({
      where: { id: dto.feeStructureId },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const assignment = await this.prisma.studentFeeAssignment.upsert({
      where: {
        studentId_feeStructureId_academicYearId: {
          studentId: dto.studentId,
          feeStructureId: dto.feeStructureId,
          academicYearId: dto.academicYearId,
        },
      },
      create: {
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        academicYearId: dto.academicYearId,
        feeDiscountId: dto.feeDiscountId || null,
        customAmount: dto.customAmount !== undefined ? Number(dto.customAmount) : null,
        notes: dto.notes || null,
      },
      update: {
        feeDiscountId: dto.feeDiscountId || null,
        customAmount: dto.customAmount !== undefined ? Number(dto.customAmount) : null,
        notes: dto.notes || null,
      },
      include: {
        feeStructure: true,
        feeDiscount: true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ASSIGN',
      resource: 'STUDENT_FEE_ASSIGNMENT',
      resourceId: assignment.id,
      details: { studentId: dto.studentId, feeStructureId: dto.feeStructureId, customAmount: assignment.customAmount },
    });

    return {
      ...assignment,
      customAmount: assignment.customAmount ? Number(assignment.customAmount) : null,
    };
  }

  async getStudentFeeAssignments(user: CurrentUserPayload, studentId: string, academicYearId?: string) {
    const where: any = { studentId };
    if (academicYearId) where.academicYearId = academicYearId;

    const list = await this.prisma.studentFeeAssignment.findMany({
      where,
      include: {
        feeStructure: true,
        feeDiscount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((a) => ({
      ...a,
      customAmount: a.customAmount ? Number(a.customAmount) : null,
    }));
  }
}
