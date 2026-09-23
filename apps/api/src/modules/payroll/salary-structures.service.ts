import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PayrollCalculatorService } from './payroll-calculator.service';
import {
  CreateSalaryStructureDto,
  AssignSalaryStructureDto,
  CreateSalaryComponentInputDto,
} from './dto/phase4h-payroll.dto';

@Injectable()
export class SalaryStructuresService {
  private readonly logger = new Logger(SalaryStructuresService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly calculator: PayrollCalculatorService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Salary Structures & Components
  // ---------------------------------------------------------------------------

  async createSalaryStructure(user: CurrentUserPayload, dto: CreateSalaryStructureDto) {
    return this.createStructure(user, dto);
  }

  async createStructure(user: CurrentUserPayload, dto: CreateSalaryStructureDto) {
    const existing = await this.prisma.salaryStructure.findFirst({
      where: {
        organizationId: user.organizationId,
        code: dto.code.trim().toUpperCase(),
      },
    });

    if (existing) {
      throw new BadRequestException(`Salary structure code "${dto.code}" already exists`);
    }

    const baseSalary = this.calculator.roundMoney(dto.baseSalary);

    const structure = await this.prisma.salaryStructure.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        baseSalary,
        currency: dto.currency || 'USD',
        frequency: dto.frequency || 'MONTHLY',
        description: dto.description || null,
        components: dto.components && dto.components.length > 0
          ? {
              create: dto.components.map((c) => ({
                name: c.name.trim(),
                type: c.type,
                calculationType: c.calculationType,
                value: this.calculator.roundMoney(c.value),
                isTaxable: c.isTaxable !== undefined ? c.isTaxable : true,
              })),
            }
          : undefined,
      },
      include: { components: true },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'SALARY_STRUCTURE',
      resourceId: structure.id,
      details: { code: structure.code, baseSalary },
    });

    return {
      ...structure,
      baseSalary: Number(structure.baseSalary),
      components: structure.components.map((c) => ({
        ...c,
        value: Number(c.value),
      })),
    };
  }

  async getSalaryStructures(user: CurrentUserPayload) {
    return this.getStructures(user);
  }

  async getStructures(user: CurrentUserPayload) {
    const list = await this.prisma.salaryStructure.findMany({
      where: { organizationId: user.organizationId },
      include: {
        components: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { name: 'asc' },
    });

    return list.map((s) => ({
      ...s,
      baseSalary: Number(s.baseSalary),
      components: s.components.map((c) => ({
        ...c,
        value: Number(c.value),
      })),
    }));
  }

  async getSalaryStructureById(id: string) {
    return this.getStructureById(id);
  }

  async getStructureById(id: string) {
    const structure = await this.prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        components: true,
        assignments: {
          include: {
            employee: {
              include: { user: { select: { firstName: true, lastName: true, email: true } } },
            },
          },
        },
      },
    });

    if (!structure) throw new NotFoundException('Salary structure not found');

    return {
      ...structure,
      baseSalary: Number(structure.baseSalary),
      components: structure.components.map((c) => ({
        ...c,
        value: Number(c.value),
      })),
    };
  }

  async addComponent(user: CurrentUserPayload, structureId: string, dto: CreateSalaryComponentInputDto) {
    const structure = await this.prisma.salaryStructure.findUnique({
      where: { id: structureId },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');

    const component = await this.prisma.salaryComponent.create({
      data: {
        salaryStructureId: structureId,
        name: dto.name.trim(),
        type: dto.type,
        calculationType: dto.calculationType,
        value: this.calculator.roundMoney(dto.value),
        isTaxable: dto.isTaxable !== undefined ? dto.isTaxable : true,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ADD_SALARY_COMPONENT',
      resource: 'SALARY_COMPONENT',
      resourceId: component.id,
      details: { structureId, name: component.name, value: Number(component.value) },
    });

    return {
      ...component,
      value: Number(component.value),
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Employee Salary Assignments & Effective Date Logic
  // ---------------------------------------------------------------------------

  async assignSalaryStructure(user: CurrentUserPayload, dto: AssignSalaryStructureDto) {
    return this.assignStructure(user, dto);
  }

  async assignStructure(user: CurrentUserPayload, dto: AssignSalaryStructureDto) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: dto.employeeId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const structure = await this.prisma.salaryStructure.findUnique({
      where: { id: dto.salaryStructureId },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BadRequestException('effectiveTo date must be after effectiveFrom date');
    }

    const baseSalaryOverride =
      dto.baseSalaryOverride !== undefined && dto.baseSalaryOverride !== null
        ? this.calculator.roundMoney(dto.baseSalaryOverride)
        : null;

    const assignment = await this.prisma.$transaction(async (tx) => {
      // 1. Create assignment record
      const created = await tx.employeeSalaryAssignment.create({
        data: {
          employeeId: dto.employeeId,
          salaryStructureId: dto.salaryStructureId,
          baseSalaryOverride,
          effectiveFrom,
          effectiveTo,
          reason: dto.reason || null,
          authorizedBy: user.id,
        },
        include: { salaryStructure: { include: { components: true } } },
      });

      // 2. Record in SalaryHistory
      const newSalary = baseSalaryOverride !== null ? baseSalaryOverride : Number(structure.baseSalary);
      await tx.salaryHistory.create({
        data: {
          employeeId: dto.employeeId,
          oldBaseSalary: emp.salaryBase ? Number(emp.salaryBase) : null,
          newBaseSalary: newSalary,
          effectiveFrom,
          reason: dto.reason || 'Salary structure assigned',
          authorizedBy: user.id,
        },
      });

      // 3. Update employeeProfile.salaryBase if this assignment is currently active
      const now = new Date();
      if (effectiveFrom <= now && (!effectiveTo || effectiveTo >= now)) {
        await tx.employeeProfile.update({
          where: { id: dto.employeeId },
          data: { salaryBase: newSalary },
        });
      }

      return created;
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ASSIGN_SALARY_STRUCTURE',
      resource: 'EMPLOYEE_SALARY_ASSIGNMENT',
      resourceId: assignment.id,
      details: {
        employeeId: dto.employeeId,
        structureId: dto.salaryStructureId,
        baseSalaryOverride,
        effectiveFrom,
      },
    });

    return {
      ...assignment,
      baseSalaryOverride: assignment.baseSalaryOverride ? Number(assignment.baseSalaryOverride) : null,
      salaryStructure: {
        ...assignment.salaryStructure,
        baseSalary: Number(assignment.salaryStructure.baseSalary),
        components: assignment.salaryStructure.components.map((c) => ({
          ...c,
          value: Number(c.value),
        })),
      },
    };
  }

  async getAssignments(user: CurrentUserPayload, employeeId: string) {
    const assignments = await this.prisma.employeeSalaryAssignment.findMany({
      where: { employeeId },
      include: {
        salaryStructure: {
          include: { components: true },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return assignments.map((a) => ({
      ...a,
      baseSalaryOverride: a.baseSalaryOverride ? Number(a.baseSalaryOverride) : null,
      salaryStructure: {
        ...a.salaryStructure,
        baseSalary: Number(a.salaryStructure.baseSalary),
        components: a.salaryStructure.components.map((c) => ({
          ...c,
          value: Number(c.value),
        })),
      },
    }));
  }

  /**
   * Evaluates the effective salary structure and components for an employee as of a specific date.
   * Crucial for immutable historical payroll processing.
   */
  async getEffectiveSalaryForDate(employeeId: string, targetDate: Date) {
    // Look for active assignment matching target date
    const assignment = await this.prisma.employeeSalaryAssignment.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
      },
      include: {
        salaryStructure: {
          include: { components: true },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (assignment) {
      const baseSalary =
        assignment.baseSalaryOverride !== null
          ? Number(assignment.baseSalaryOverride)
          : Number(assignment.salaryStructure.baseSalary);

      const allowances: Array<{ title: string; amount: number }> = [];
      const deductions: Array<{ title: string; amount: number }> = [];

      for (const comp of assignment.salaryStructure.components) {
        const amt = this.calculator.calculateComponentAmount({
          baseSalary,
          calculationType: comp.calculationType,
          value: Number(comp.value),
        });

        if (comp.type === 'ALLOWANCE') {
          allowances.push({ title: comp.name, amount: amt });
        } else if (comp.type === 'DEDUCTION') {
          deductions.push({ title: comp.name, amount: amt });
        }
      }

      return {
        baseSalary,
        allowances,
        deductions,
        structureName: assignment.salaryStructure.name,
      };
    }

    // Fallback to employeeProfile.salaryBase if no assignment exists
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
    });

    const fallbackBase = emp?.salaryBase ? Number(emp.salaryBase) : 0;
    return {
      baseSalary: fallbackBase,
      allowances: [],
      deductions: [],
      structureName: 'Base Profile Salary',
    };
  }

  /**
   * Retrieves historical salary changes and revisions for an employee
   */
  async getSalaryHistory(employeeId: string) {
    return this.prisma.salaryHistory.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
