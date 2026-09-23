import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  UpdateEmployeeDto,
  ChangeEmployeeStatusDto,
  CreateContractDto,
  UploadEmployeeDocumentDto,
} from './dto/phase4h-employees.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generates sequential collision-safe Employee IDs: EMP-YYYY-XXXXX
   */
  async generateSequentialEmployeeCode(organizationId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}-`;

    const where: any = {
      employeeCode: { startsWith: prefix },
    };
    if (organizationId) {
      where.user = { organizationId };
    }

    const count = await this.prisma.employeeProfile.count({ where });
    const nextSeq = String(count + 1).padStart(5, '0');
    const employeeCode = `${prefix}${nextSeq}`;

    const exists = await this.prisma.employeeProfile.findUnique({
      where: { employeeCode },
    });
    if (!exists) {
      return employeeCode;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  /**
   * Generates sequential contract numbers: CNT-YYYY-XXXXX
   */
  async generateSequentialContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CNT-${year}-`;

    const count = await this.prisma.employmentContract.count({
      where: { contractNumber: { startsWith: prefix } },
    });
    const nextSeq = String(count + 1).padStart(5, '0');
    const contractNumber = `${prefix}${nextSeq}`;

    const exists = await this.prisma.employmentContract.findUnique({
      where: { contractNumber },
    });
    if (!exists) return contractNumber;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${nextSeq}-${randomSuffix}`;
  }

  // ---------------------------------------------------------------------------
  // Phase 2 Legacy Compatibility Layer
  // ---------------------------------------------------------------------------

  async findAll(organizationId: string, campusId?: string) {
    const where: any = {
      user: {
        organizationId,
        ...(campusId ? { campusId } : {}),
      },
    };

    const list = await this.prisma.employeeProfile.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        department: true,
        designationRel: true,
        campus: true,
      },
      orderBy: { joiningDate: 'desc' },
    });

    return list.map((e) => ({
      ...e,
      salaryBase: e.salaryBase ? Number(e.salaryBase) : null,
    }));
  }

  async findOne(id: string) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
        designationRel: true,
        campus: true,
        reportingManager: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        contracts: {
          orderBy: { startDate: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { effectiveDate: 'desc' },
        },
      },
    });
    if (!emp) throw new NotFoundException(`Employee ${id} not found`);

    return {
      ...emp,
      salaryBase: emp.salaryBase ? Number(emp.salaryBase) : null,
    };
  }

  async create(organizationId: string, dto: any, creatorId?: string) {
    const passwordHash = await argon2.hash(dto.password || 'Employee@2026!');
    const role = await this.prisma.role.findFirst({
      where: { organizationId, code: dto.roleCode || 'GENERAL_EMPLOYEE' },
    });

    const employeeCode = dto.employeeCode || (await this.generateSequentialEmployeeCode(organizationId));

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        campusId: dto.campusId,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone,
        gender: dto.gender,
        createdBy: creatorId,
        userRoles: role ? { create: { roleId: role.id } } : undefined,
      },
    });

    const emp = await this.prisma.employeeProfile.create({
      data: {
        userId: user.id,
        campusId: dto.campusId,
        departmentId: dto.departmentId,
        designationId: dto.designationId,
        employeeCode,
        preferredName: dto.preferredName,
        designation: dto.designation,
        employmentType: dto.employmentType || 'FULL_TIME',
        lifecycleStatus: dto.lifecycleStatus || 'ACTIVE',
        joiningDate: new Date(dto.joiningDate || Date.now()),
        confirmationDate: dto.confirmationDate ? new Date(dto.confirmationDate) : null,
        nationalId: dto.nationalId,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRelation: dto.emergencyContactRelation,
        qualifications: dto.qualifications || [],
        experienceYears: dto.experienceYears ? Number(dto.experienceYears) : 0,
        skills: dto.skills || [],
        reportingManagerId: dto.reportingManagerId,
        salaryBase: dto.salaryBase !== undefined && dto.salaryBase !== null ? Number(dto.salaryBase) : null,
        createdBy: creatorId,
      },
      include: { user: true, department: true, designationRel: true },
    });

    // Record initial status in status history
    await this.prisma.employeeStatusHistory.create({
      data: {
        employeeId: emp.id,
        newStatus: emp.lifecycleStatus,
        effectiveDate: emp.joiningDate,
        reason: 'Initial employment record creation',
        changedBy: creatorId,
      },
    });

    await this.auditService.log({
      organizationId,
      userId: creatorId || 'system',
      action: 'CREATE',
      resource: 'EMPLOYEE_PROFILE',
      resourceId: emp.id,
      details: { employeeCode: emp.employeeCode, name: `${user.firstName} ${user.lastName}` },
    });

    return {
      ...emp,
      salaryBase: emp.salaryBase ? Number(emp.salaryBase) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Phase 4H Extended Operations
  // ---------------------------------------------------------------------------

  async updateEmployee(id: string, dto: UpdateEmployeeDto, user: CurrentUserPayload) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!emp) throw new NotFoundException(`Employee ${id} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Update User attributes if provided
      if (dto.firstName || dto.lastName || dto.phone || dto.gender) {
        await tx.user.update({
          where: { id: emp.userId },
          data: {
            firstName: dto.firstName ? dto.firstName.trim() : undefined,
            lastName: dto.lastName ? dto.lastName.trim() : undefined,
            phone: dto.phone !== undefined ? dto.phone : undefined,
            gender: dto.gender !== undefined ? dto.gender : undefined,
          },
        });
      }

      const updated = await tx.employeeProfile.update({
        where: { id },
        data: {
          preferredName: dto.preferredName !== undefined ? dto.preferredName : undefined,
          departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
          designationId: dto.designationId !== undefined ? dto.designationId : undefined,
          designation: dto.designation !== undefined ? dto.designation : undefined,
          employmentType: dto.employmentType ? (dto.employmentType as any) : undefined,
          nationalId: dto.nationalId !== undefined ? dto.nationalId : undefined,
          address: dto.address !== undefined ? dto.address : undefined,
          emergencyContactName: dto.emergencyContactName !== undefined ? dto.emergencyContactName : undefined,
          emergencyContactPhone: dto.emergencyContactPhone !== undefined ? dto.emergencyContactPhone : undefined,
          emergencyContactRelation: dto.emergencyContactRelation !== undefined ? dto.emergencyContactRelation : undefined,
          qualifications: dto.qualifications !== undefined ? dto.qualifications : undefined,
          experienceYears: dto.experienceYears !== undefined ? Number(dto.experienceYears) : undefined,
          skills: dto.skills !== undefined ? dto.skills : undefined,
          reportingManagerId: dto.reportingManagerId !== undefined ? dto.reportingManagerId : undefined,
          salaryBase: dto.salaryBase !== undefined ? Number(dto.salaryBase) : undefined,
          updatedBy: user.id,
        },
        include: {
          user: true,
          department: true,
          designationRel: true,
        },
      });

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'UPDATE',
        resource: 'EMPLOYEE_PROFILE',
        resourceId: id,
        details: { updatedFields: Object.keys(dto) },
      });

      return {
        ...updated,
        salaryBase: updated.salaryBase ? Number(updated.salaryBase) : null,
      };
    });
  }

  async changeStatus(employeeId: string, dto: ChangeEmployeeStatusDto, user: CurrentUserPayload) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const previousStatus = emp.lifecycleStatus;
    const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Record in append-only status history
      const historyEntry = await tx.employeeStatusHistory.create({
        data: {
          employeeId,
          previousStatus,
          newStatus: dto.newStatus,
          effectiveDate,
          reason: dto.reason.trim(),
          notes: dto.notes || null,
          changedBy: user.id,
        },
      });

      // 2. Update employee profile status
      const updated = await tx.employeeProfile.update({
        where: { id: employeeId },
        data: {
          lifecycleStatus: dto.newStatus,
          // If terminated or resigned, set RecordStatus to INACTIVE
          status:
            dto.newStatus === 'TERMINATED' || dto.newStatus === 'RESIGNED' || dto.newStatus === 'ARCHIVED'
              ? 'INACTIVE'
              : 'ACTIVE',
        },
        include: { user: true },
      });

      await this.auditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'STATUS_CHANGE',
        resource: 'EMPLOYEE_PROFILE',
        resourceId: employeeId,
        details: { previousStatus, newStatus: dto.newStatus, reason: dto.reason },
      });

      return {
        employee: updated,
        historyEntry,
      };
    });
  }

  async getStatusHistory(employeeId: string) {
    return this.prisma.employeeStatusHistory.findMany({
      where: { employeeId },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Contract Management
  // ---------------------------------------------------------------------------

  async createContract(employeeId: string, dto: CreateContractDto, user: CurrentUserPayload) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const contractNumber = await this.generateSequentialContractNumber();

    const contract = await this.prisma.employmentContract.create({
      data: {
        employeeId,
        contractNumber,
        contractType: (dto.contractType || emp.employmentType) as any,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        terms: dto.terms || null,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : null,
        documentUrl: dto.documentUrl || null,
        createdBy: user.id,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE_CONTRACT',
      resource: 'EMPLOYMENT_CONTRACT',
      resourceId: contract.id,
      details: { contractNumber, employeeId, startDate: contract.startDate },
    });

    return contract;
  }

  async getContracts(employeeId: string) {
    return this.prisma.employmentContract.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getExpiringContracts(organizationId: string, daysAhead: number = 30) {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return this.prisma.employmentContract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: threshold,
        },
        employee: {
          user: { organizationId },
        },
      },
      include: {
        employee: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            department: true,
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Document Management
  // ---------------------------------------------------------------------------

  async uploadDocument(employeeId: string, dto: UploadEmployeeDocumentDto, user: CurrentUserPayload) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const doc = await this.prisma.employeeDocument.create({
      data: {
        employeeId,
        title: dto.title.trim(),
        documentType: dto.documentType,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize || null,
        mimeType: dto.mimeType || null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        notes: dto.notes || null,
        uploadedBy: user.id,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPLOAD_DOCUMENT',
      resource: 'EMPLOYEE_DOCUMENT',
      resourceId: doc.id,
      details: { title: doc.title, documentType: doc.documentType, employeeId },
    });

    return doc;
  }

  async getDocuments(employeeId: string) {
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Employee Self-Service
  // ---------------------------------------------------------------------------

  async getSelfServiceProfile(userId: string) {
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        department: true,
        designationRel: true,
        campus: true,
        contracts: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        salaryAssignments: {
          where: { status: 'ACTIVE' },
          include: {
            salaryStructure: {
              include: { components: true },
            },
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        leaveBalances: {
          include: { leaveType: true },
        },
        loans: {
          where: { status: { in: ['APPROVED', 'ACTIVE'] } },
        },
      },
    });

    if (!emp) throw new NotFoundException('Employee profile not found for this user');

    // Fetch recent 30-day attendance counts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAttendances = await this.prisma.employeeAttendance.findMany({
      where: {
        employeeId: emp.id,
        date: { gte: thirtyDaysAgo },
      },
    });

    const attendanceSummary = {
      present: recentAttendances.filter((a) => a.status === 'PRESENT').length,
      absent: recentAttendances.filter((a) => a.status === 'ABSENT').length,
      late: recentAttendances.filter((a) => a.status === 'LATE').length,
      halfDay: recentAttendances.filter((a) => a.status === 'HALF_DAY').length,
    };

    // Fetch recent payslips
    const payslips = await this.prisma.payslip.findMany({
      where: {
        employeeRecord: { employeeId: emp.id },
      },
      orderBy: { year: 'desc' },
      take: 6,
    });

    return {
      profile: {
        ...emp,
        salaryBase: emp.salaryBase ? Number(emp.salaryBase) : null,
      },
      activeContract: emp.contracts[0] || null,
      salaryAssignment: emp.salaryAssignments[0]
        ? {
            ...emp.salaryAssignments[0],
            baseSalaryOverride: emp.salaryAssignments[0].baseSalaryOverride
              ? Number(emp.salaryAssignments[0].baseSalaryOverride)
              : null,
            salaryStructure: {
              ...emp.salaryAssignments[0].salaryStructure,
              baseSalary: Number(emp.salaryAssignments[0].salaryStructure.baseSalary),
              components: emp.salaryAssignments[0].salaryStructure.components.map((c) => ({
                ...c,
                value: Number(c.value),
              })),
            },
          }
        : null,
      recentAttendanceSummary: attendanceSummary,
      leaveBalances: emp.leaveBalances.map((b) => ({
        leaveTypeName: b.leaveType?.name || 'Leave',
        allocatedDays: Number(b.allocatedDays),
        usedDays: Number(b.usedDays),
        remainingDays: Number(b.remainingDays),
      })),
      recentPayslips: payslips.map((p) => ({
        ...p,
        grossPay: Number(p.grossPay),
        totalDeductions: Number(p.totalDeductions),
        netPay: Number(p.netPay),
      })),
      activeLoans: emp.loans.map((l) => ({
        ...l,
        principalAmount: Number(l.principalAmount),
        monthlyInstallment: Number(l.monthlyInstallment),
        totalRepaid: Number(l.totalRepaid),
        remainingBalance: Number(l.remainingBalance),
      })),
    };
  }
}
