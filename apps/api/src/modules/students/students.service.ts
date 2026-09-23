import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TransferType } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    organizationId: string,
    campusId: string | undefined,
    query: PaginationQueryDto & { lifecycleStatus?: any },
  ) {
    const where: any = {
      user: {
        organizationId,
        ...(campusId ? { campusId } : {}),
      },
      ...(query?.lifecycleStatus ? { lifecycleStatus: query.lifecycleStatus } : {}),
    };

    if (query?.search) {
      where.OR = [
        { admissionNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [totalItems, students] = await Promise.all([
      this.prisma.studentProfile.count({ where }),
      this.prisma.studentProfile.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              gender: true,
              phone: true,
              status: true,
            },
          },
          enrollments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              academicYear: true,
              section: { include: { class: true } },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data: students,
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

  async findOne(id: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        guardians: {
          include: {
            guardian: {
              include: { user: true },
            },
          },
        },
        enrollments: {
          include: {
            academicYear: true,
            section: { include: { class: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
        transfers: {
          orderBy: { effectiveDate: 'desc' },
        },
        emergencyContacts: {
          where: { isActive: true },
          orderBy: { priority: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        alumniRecord: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student ${id} not found`);
    }

    return student;
  }

  async create(organizationId: string, dto: any, creatorId?: string) {
    const passwordHash = await argon2.hash(dto.password || 'Student@2026!');

    // Get student role
    const studentRole = await this.prisma.role.findFirst({
      where: { organizationId, code: 'STUDENT' },
    });

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        campusId: dto.campusId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        phone: dto.phone,
        createdBy: creatorId,
        userRoles: studentRole ? { create: { roleId: studentRole.id } } : undefined,
      },
    });

    const studentProfile = await this.prisma.studentProfile.create({
      data: {
        userId: user.id,
        admissionNumber: dto.admissionNumber,
        admissionDate: new Date(dto.admissionDate || Date.now()),
        dateOfBirth: new Date(dto.dateOfBirth),
        bloodGroup: dto.bloodGroup,
        emergencyContact: dto.emergencyContact,
        address: dto.address,
        previousSchool: dto.previousSchool,
        lifecycleStatus: 'ACTIVE',
        createdBy: creatorId,
      },
    });

    // Record initial status history
    await this.prisma.studentStatusHistory.create({
      data: {
        studentId: studentProfile.id,
        newStatus: 'ACTIVE',
        reason: 'Direct admission and enrollment',
        changedBy: creatorId,
      },
    });

    // If section and academic year provided, create enrollment
    if (dto.sectionId && dto.academicYearId) {
      await this.prisma.enrollment.create({
        data: {
          academicYearId: dto.academicYearId,
          studentId: studentProfile.id,
          sectionId: dto.sectionId,
          rollNumber: dto.rollNumber,
        },
      });
    }

    await this.auditService.log({
      organizationId,
      campusId: dto.campusId,
      userId: creatorId,
      action: 'ADMIT_STUDENT',
      module: 'students',
      resourceId: studentProfile.id,
      newValues: { admissionNumber: dto.admissionNumber, studentId: studentProfile.id },
    });

    return this.findOne(studentProfile.id);
  }

  async update(id: string, dto: any, updaterId?: string) {
    const profile = await this.prisma.studentProfile.findUnique({ where: { id } });
    if (!profile) return null;

    if (dto.firstName || dto.lastName || dto.phone || dto.gender) {
      await this.prisma.user.update({
        where: { id: profile.userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          gender: dto.gender,
          updatedBy: updaterId,
        },
      });
    }

    const updated = await this.prisma.studentProfile.update({
      where: { id },
      data: {
        bloodGroup: dto.bloodGroup,
        emergencyContact: dto.emergencyContact,
        nationalId: dto.nationalId,
        address: dto.address,
        previousSchool: dto.previousSchool,
        medicalNotes: dto.medicalNotes,
        status: dto.status,
        lifecycleStatus: dto.lifecycleStatus,
        updatedBy: updaterId,
      },
      include: { user: true },
    });

    return updated;
  }

  /**
   * Get append-only lifecycle history
   */
  async getLifecycleHistory(studentId: string) {
    await this.findOne(studentId);
    return this.prisma.studentStatusHistory.findMany({
      where: { studentId },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Controlled Section Transfer
   */
  async transferSection(studentId: string, dto: { toSectionId: string; reason: string; effectiveDate?: string }, actorId: string) {
    const student = await this.findOne(studentId);

    const activeEnrollment = student.enrollments[0];
    if (!activeEnrollment) {
      throw new BadRequestException('Student has no active enrollment to transfer');
    }

    if (activeEnrollment.sectionId === dto.toSectionId) {
      throw new ConflictException('Student is already enrolled in the destination section');
    }

    const targetSection = await this.prisma.section.findUnique({ where: { id: dto.toSectionId } });
    if (!targetSection) {
      throw new NotFoundException(`Target section ${dto.toSectionId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Record transfer
      const transfer = await tx.studentTransfer.create({
        data: {
          studentId,
          type: TransferType.SECTION,
          fromSectionId: activeEnrollment.sectionId,
          toSectionId: dto.toSectionId,
          reason: dto.reason,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
          transferredBy: actorId,
        },
      });

      // 2. Update current enrollment section
      await tx.enrollment.update({
        where: { id: activeEnrollment.id },
        data: { sectionId: dto.toSectionId },
      });

      // 3. Append status history
      await tx.studentStatusHistory.create({
        data: {
          studentId,
          previousStatus: student.lifecycleStatus,
          newStatus: student.lifecycleStatus,
          reason: `Section transferred: ${dto.reason}`,
          changedBy: actorId,
          metadata: { fromSectionId: activeEnrollment.sectionId, toSectionId: dto.toSectionId },
        },
      });

      await this.auditService.log({
        organizationId: student.user.organizationId,
        campusId: student.user.campusId ?? undefined,
        userId: actorId,
        action: 'SECTION_TRANSFER',
        module: 'students',
        resourceId: studentId,
        newValues: { fromSectionId: activeEnrollment.sectionId, toSectionId: dto.toSectionId, reason: dto.reason },
      });

      return transfer;
    });
  }

  /**
   * Controlled Campus Transfer
   */
  async transferCampus(studentId: string, dto: { toCampusId: string; toSectionId?: string; reason: string }, actorId: string) {
    const student = await this.findOne(studentId);

    const fromCampusId = student.user.campusId;
    if (fromCampusId === dto.toCampusId) {
      throw new ConflictException('Student is already affiliated with the target campus');
    }

    const targetCampus = await this.prisma.campus.findUnique({ where: { id: dto.toCampusId } });
    if (!targetCampus) {
      throw new NotFoundException(`Target campus ${dto.toCampusId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.studentTransfer.create({
        data: {
          studentId,
          type: TransferType.CAMPUS,
          fromCampusId,
          toCampusId: dto.toCampusId,
          toSectionId: dto.toSectionId,
          reason: dto.reason,
          transferredBy: actorId,
        },
      });

      await tx.user.update({
        where: { id: student.userId },
        data: { campusId: dto.toCampusId, updatedBy: actorId },
      });

      await tx.studentProfile.update({
        where: { id: studentId },
        data: { lifecycleStatus: 'TRANSFERRED', updatedBy: actorId },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId,
          previousStatus: student.lifecycleStatus,
          newStatus: 'TRANSFERRED',
          reason: `Campus transferred to ${targetCampus.name}: ${dto.reason}`,
          changedBy: actorId,
        },
      });

      await this.auditService.log({
        organizationId: student.user.organizationId,
        campusId: dto.toCampusId,
        userId: actorId,
        action: 'CAMPUS_TRANSFER',
        module: 'students',
        resourceId: studentId,
        newValues: { fromCampusId, toCampusId: dto.toCampusId, reason: dto.reason },
      });

      return transfer;
    });
  }

  /**
   * Controlled Student Withdrawal
   */
  async withdrawStudent(
    studentId: string,
    dto: { withdrawalDate: string; reason: string; exitNotes?: string },
    actorId: string,
  ) {
    const student = await this.findOne(studentId);

    if (student.lifecycleStatus === 'WITHDRAWN') {
      throw new ConflictException('Student is already marked as withdrawn');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { id: studentId },
        data: { lifecycleStatus: 'WITHDRAWN', updatedBy: actorId },
      });

      await tx.user.update({
        where: { id: student.userId },
        data: { status: 'INACTIVE', updatedBy: actorId },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId,
          previousStatus: student.lifecycleStatus,
          newStatus: 'WITHDRAWN',
          reason: dto.reason,
          changedBy: actorId,
          metadata: { exitNotes: dto.exitNotes, withdrawalDate: dto.withdrawalDate },
        },
      });

      await this.auditService.log({
        organizationId: student.user.organizationId,
        campusId: student.user.campusId ?? undefined,
        userId: actorId,
        action: 'WITHDRAW_STUDENT',
        module: 'students',
        resourceId: studentId,
        newValues: { reason: dto.reason, exitNotes: dto.exitNotes },
      });

      return { message: 'Student withdrawal processed successfully', studentId, status: 'WITHDRAWN' };
    });
  }

  /**
   * Controlled Student Graduation
   */
  async graduateStudent(
    studentId: string,
    dto: { graduationYear: number; graduationClass?: string; finalGrade?: string; notes?: string },
    actorId: string,
  ) {
    const student = await this.findOne(studentId);

    if (student.lifecycleStatus === 'GRADUATED') {
      throw new ConflictException('Student is already marked as graduated');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { id: studentId },
        data: { lifecycleStatus: 'GRADUATED', updatedBy: actorId },
      });

      const alumni = await tx.alumniRecord.upsert({
        where: { studentId },
        create: {
          studentId,
          graduationYear: dto.graduationYear,
          graduationClass: dto.graduationClass,
          finalGrade: dto.finalGrade,
          contactEmail: student.user.email,
          contactPhone: student.user.phone,
          notes: dto.notes,
        },
        update: {
          graduationYear: dto.graduationYear,
          graduationClass: dto.graduationClass,
          finalGrade: dto.finalGrade,
          notes: dto.notes,
        },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId,
          previousStatus: student.lifecycleStatus,
          newStatus: 'GRADUATED',
          reason: `Graduated class of ${dto.graduationYear}`,
          changedBy: actorId,
        },
      });

      await this.auditService.log({
        organizationId: student.user.organizationId,
        campusId: student.user.campusId ?? undefined,
        userId: actorId,
        action: 'GRADUATE_STUDENT',
        module: 'students',
        resourceId: studentId,
        newValues: { graduationYear: dto.graduationYear, finalGrade: dto.finalGrade },
      });

      return { message: 'Student graduation recorded successfully', studentId, alumni };
    });
  }

  /**
   * Re-admit previously withdrawn student
   */
  async readmitStudent(
    studentId: string,
    dto: { academicYearId: string; sectionId: string; rollNumber?: string; reason: string },
    actorId: string,
  ) {
    const student = await this.findOne(studentId);

    return this.prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { id: studentId },
        data: { lifecycleStatus: 'ACTIVE', updatedBy: actorId },
      });

      await tx.user.update({
        where: { id: student.userId },
        data: { status: 'ACTIVE', updatedBy: actorId },
      });

      await tx.enrollment.upsert({
        where: {
          academicYearId_studentId: {
            academicYearId: dto.academicYearId,
            studentId,
          },
        },
        create: {
          academicYearId: dto.academicYearId,
          studentId,
          sectionId: dto.sectionId,
          rollNumber: dto.rollNumber,
        },
        update: {
          sectionId: dto.sectionId,
          rollNumber: dto.rollNumber,
        },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId,
          previousStatus: student.lifecycleStatus,
          newStatus: 'ACTIVE',
          reason: `Re-admission: ${dto.reason}`,
          changedBy: actorId,
        },
      });

      await this.auditService.log({
        organizationId: student.user.organizationId,
        campusId: student.user.campusId ?? undefined,
        userId: actorId,
        action: 'READMIT_STUDENT',
        module: 'students',
        resourceId: studentId,
        newValues: { academicYearId: dto.academicYearId, sectionId: dto.sectionId, reason: dto.reason },
      });

      return { message: 'Student re-admitted successfully', studentId, status: 'ACTIVE' };
    });
  }

  /**
   * Dry-run preview for class promotion
   */
  async promotePreview(dto: {
    sourceSectionId: string;
    targetAcademicYearId: string;
    targetClassId: string;
    targetSectionId: string;
  }) {
    const sourceEnrollments = await this.prisma.enrollment.findMany({
      where: { sectionId: dto.sourceSectionId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    const studentIds = sourceEnrollments.map((e) => e.studentId);
    const existingTargetEnrollments = await this.prisma.enrollment.findMany({
      where: {
        academicYearId: dto.targetAcademicYearId,
        studentId: { in: studentIds },
      },
      select: { studentId: true },
    });

    const conflictSet = new Set(existingTargetEnrollments.map((e) => e.studentId));

    const eligible = sourceEnrollments
      .filter((e) => !conflictSet.has(e.studentId))
      .map((e) => ({
        studentId: e.studentId,
        name: `${e.student.user.firstName} ${e.student.user.lastName}`,
        admissionNumber: e.student.admissionNumber,
        rollNumber: e.rollNumber,
      }));

    const conflicts = sourceEnrollments
      .filter((e) => conflictSet.has(e.studentId))
      .map((e) => ({
        studentId: e.studentId,
        name: `${e.student.user.firstName} ${e.student.user.lastName}`,
        reason: 'Already enrolled in target academic year',
      }));

    return {
      totalCandidates: sourceEnrollments.length,
      eligibleCount: eligible.length,
      conflictCount: conflicts.length,
      eligible,
      conflicts,
    };
  }

  /**
   * Bulk Class Promotion
   */
  async bulkPromote(
    dto: {
      sourceSectionId: string;
      targetAcademicYearId: string;
      targetClassId: string;
      targetSectionId: string;
      studentIds: string[];
    },
    actorId: string,
  ) {
    if (!dto.studentIds || dto.studentIds.length === 0) {
      throw new BadRequestException('No student IDs provided for promotion');
    }

    return this.prisma.$transaction(async (tx) => {
      let promotedCount = 0;
      for (const studentId of dto.studentIds) {
        // Upsert enrollment in target academic year
        await tx.enrollment.upsert({
          where: {
            academicYearId_studentId: {
              academicYearId: dto.targetAcademicYearId,
              studentId,
            },
          },
          create: {
            academicYearId: dto.targetAcademicYearId,
            studentId,
            sectionId: dto.targetSectionId,
          },
          update: {
            sectionId: dto.targetSectionId,
          },
        });

        await tx.studentProfile.update({
          where: { id: studentId },
          data: { lifecycleStatus: 'ACTIVE', updatedBy: actorId },
        });

        await tx.studentStatusHistory.create({
          data: {
            studentId,
            newStatus: 'ACTIVE',
            reason: `Promoted to Section ${dto.targetSectionId} for AY ${dto.targetAcademicYearId}`,
            changedBy: actorId,
          },
        });

        promotedCount++;
      }

      await this.auditService.log({
        organizationId: 'system',
        userId: actorId,
        action: 'BULK_PROMOTE',
        module: 'students',
        resourceId: dto.targetSectionId,
        newValues: {
          sourceSectionId: dto.sourceSectionId,
          targetAcademicYearId: dto.targetAcademicYearId,
          promotedCount,
        },
      });

      return {
        message: `Successfully promoted ${promotedCount} students!`,
        promotedCount,
        studentIds: dto.studentIds,
      };
    });
  }

  /**
   * Emergency Contacts
   */
  async getEmergencyContacts(studentId: string) {
    await this.findOne(studentId);
    return this.prisma.emergencyContact.findMany({
      where: { studentId, isActive: true },
      orderBy: { priority: 'asc' },
    });
  }

  async addEmergencyContact(
    studentId: string,
    dto: { name: string; relationship: string; phone: string; altPhone?: string; priority?: number },
  ) {
    await this.findOne(studentId);
    return this.prisma.emergencyContact.create({
      data: {
        studentId,
        name: dto.name,
        relationship: dto.relationship,
        phone: dto.phone,
        altPhone: dto.altPhone,
        priority: dto.priority ?? 1,
      },
    });
  }

  /**
   * Student Documents
   */
  async getDocuments(studentId: string) {
    await this.findOne(studentId);
    return this.prisma.studentDocument.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async attachDocument(
    studentId: string,
    dto: { documentType: string; fileKey: string; fileName: string; mimeType: string; sizeInBytes?: number; notes?: string },
    uploaderId?: string,
  ) {
    const student = await this.findOne(studentId);

    const doc = await this.prisma.studentDocument.create({
      data: {
        studentId,
        documentType: dto.documentType,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeInBytes: dto.sizeInBytes ? BigInt(dto.sizeInBytes) : undefined,
        notes: dto.notes,
        uploadedBy: uploaderId,
      },
    });

    await this.auditService.log({
      organizationId: student.user.organizationId,
      campusId: student.user.campusId ?? undefined,
      userId: uploaderId,
      action: 'ATTACH_DOCUMENT',
      module: 'students',
      resourceId: doc.id,
      newValues: { studentId, documentType: dto.documentType, fileKey: dto.fileKey },
    });

    return doc;
  }
}
