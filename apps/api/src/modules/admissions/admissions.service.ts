import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto';
import { ReviewAdmissionApplicationDto, ConvertAdmissionApplicationDto } from './dto/review-admission-application.dto';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class AdmissionsService {
  private readonly logger = new Logger(AdmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Collision-safe application number generator: APP-{YEAR}-{5_DIGIT_SEQ}
   */
  async generateApplicationNumber(organizationId: string, year = new Date().getFullYear()): Promise<string> {
    const prefix = `APP-${year}-`;
    const count = await this.prisma.admissionApplication.count({
      where: {
        organizationId,
        applicationNumber: { startsWith: prefix },
      },
    });

    let seq = count + 1;
    let applicationNumber = `${prefix}${String(seq).padStart(5, '0')}`;

    // Protect against race conditions or deletions causing duplicate sequence numbers
    while (await this.prisma.admissionApplication.findUnique({ where: { applicationNumber } })) {
      seq++;
      applicationNumber = `${prefix}${String(seq).padStart(5, '0')}`;
    }

    return applicationNumber;
  }

  /**
   * Collision-safe admission number generator: ADM-{YEAR}-{5_DIGIT_SEQ}
   */
  async generateAdmissionNumber(organizationId: string, year = new Date().getFullYear()): Promise<string> {
    const prefix = `ADM-${year}-`;
    const count = await this.prisma.studentProfile.count({
      where: {
        user: { organizationId },
        admissionNumber: { startsWith: prefix },
      },
    });

    let seq = count + 1;
    let admissionNumber = `${prefix}${String(seq).padStart(5, '0')}`;

    while (await this.prisma.studentProfile.findUnique({ where: { admissionNumber } })) {
      seq++;
      admissionNumber = `${prefix}${String(seq).padStart(5, '0')}`;
    }

    return admissionNumber;
  }

  /**
   * Heuristic duplicate detection across applications and active students
   */
  async checkDuplicates(
    organizationId: string,
    dto: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      guardianPhone?: string;
      email?: string;
    },
  ) {
    const dob = new Date(dto.dateOfBirth);
    const matches: Array<{ type: string; id: string; name: string; details: string }> = [];

    // 1. Check existing applications
    const appMatches = await this.prisma.admissionApplication.findMany({
      where: {
        organizationId,
        OR: [
          {
            firstName: { equals: dto.firstName, mode: 'insensitive' },
            lastName: { equals: dto.lastName, mode: 'insensitive' },
            dateOfBirth: dob,
          },
          ...(dto.guardianPhone ? [{ guardianPhone: dto.guardianPhone }] : []),
          ...(dto.email ? [{ email: { equals: dto.email, mode: 'insensitive' } }] : []),
        ],
      },
      select: {
        id: true,
        applicationNumber: true,
        firstName: true,
        lastName: true,
        status: true,
        guardianName: true,
      },
      take: 5,
    });

    for (const app of appMatches) {
      matches.push({
        type: 'ADMISSION_APPLICATION',
        id: app.id,
        name: `${app.firstName} ${app.lastName}`,
        details: `Application #${app.applicationNumber} (Status: ${app.status}, Guardian: ${app.guardianName})`,
      });
    }

    // 2. Check existing student profiles
    const studentMatches = await this.prisma.studentProfile.findMany({
      where: {
        user: {
          organizationId,
          firstName: { equals: dto.firstName, mode: 'insensitive' },
          lastName: { equals: dto.lastName, mode: 'insensitive' },
        },
        dateOfBirth: dob,
      },
      select: {
        id: true,
        admissionNumber: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      take: 5,
    });

    for (const stu of studentMatches) {
      matches.push({
        type: 'STUDENT_PROFILE',
        id: stu.id,
        name: `${stu.user.firstName} ${stu.user.lastName}`,
        details: `Active Student #${stu.admissionNumber} (${stu.user.email})`,
      });
    }

    return {
      isDuplicate: matches.length > 0,
      matchCount: matches.length,
      matches,
    };
  }

  /**
   * List applications with multi-criteria filtering
   */
  async findAll(
    organizationId: string,
    campusId?: string,
    query?: {
      academicYearId?: string;
      classId?: string;
      status?: ApplicationStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(campusId ? { campusId } : {}),
      ...(query?.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query?.classId ? { classId: query.classId } : {}),
      ...(query?.status ? { status: query.status } : {}),
    };

    if (query?.search) {
      where.OR = [
        { applicationNumber: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { guardianName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { guardianPhone: { contains: query.search } },
      ];
    }

    const [totalItems, items] = await Promise.all([
      this.prisma.admissionApplication.count({ where }),
      this.prisma.admissionApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campus: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true, code: true } },
          academicYear: { select: { id: true, name: true } },
          documents: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Detail of an application
   */
  async findOne(id: string) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { id },
      include: {
        campus: true,
        class: true,
        academicYear: true,
        documents: true,
        admittedStudent: {
          include: {
            user: true,
            enrollments: { include: { section: true } },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Admission Application ${id} not found`);
    }

    return application;
  }

  /**
   * Submit new admission application
   */
  async create(organizationId: string, dto: CreateAdmissionApplicationDto, creatorId?: string) {
    const applicationNumber = await this.generateApplicationNumber(organizationId);

    const application = await this.prisma.admissionApplication.create({
      data: {
        organizationId,
        campusId: dto.campusId,
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        applicationNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        address: dto.address,
        previousSchool: dto.previousSchool,
        previousGrade: dto.previousGrade,
        guardianName: dto.guardianName,
        guardianRelation: dto.guardianRelation,
        guardianPhone: dto.guardianPhone,
        guardianEmail: dto.guardianEmail?.toLowerCase(),
        guardianAddress: dto.guardianAddress,
        guardianOccupation: dto.guardianOccupation,
        status: 'SUBMITTED',
        createdBy: creatorId,
      },
      include: {
        campus: true,
        class: true,
        academicYear: true,
      },
    });

    await this.auditService.log({
      organizationId,
      campusId: dto.campusId,
      userId: creatorId,
      action: 'SUBMIT_APPLICATION',
      module: 'admissions',
      resourceId: application.id,
      newValues: {
        applicationNumber,
        applicantName: `${dto.firstName} ${dto.lastName}`,
        classId: dto.classId,
      },
    });

    return application;
  }

  /**
   * Review application (add notes and change review status)
   */
  async review(id: string, dto: ReviewAdmissionApplicationDto, reviewerId: string) {
    const app = await this.findOne(id);

    if (app.status === 'ADMITTED') {
      throw new ConflictException('Cannot review an application that has already been converted to student');
    }

    const updated = await this.prisma.admissionApplication.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNotes: dto.reviewNotes ?? app.reviewNotes,
        decisionReason: dto.decisionReason ?? app.decisionReason,
        reviewedBy: reviewerId,
      },
      include: { class: true, campus: true },
    });

    await this.auditService.log({
      organizationId: app.organizationId,
      campusId: app.campusId,
      userId: reviewerId,
      action: 'REVIEW_APPLICATION',
      module: 'admissions',
      resourceId: id,
      oldValues: { status: app.status },
      newValues: { status: dto.status, notes: dto.reviewNotes },
    });

    return updated;
  }

  /**
   * Approve application
   */
  async approve(id: string, reviewerId: string, reason?: string) {
    const app = await this.findOne(id);
    if (app.status === 'ADMITTED') {
      throw new ConflictException('Application is already admitted');
    }

    const updated = await this.prisma.admissionApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decisionDate: new Date(),
        decisionReason: reason || 'Application approved for admission',
        reviewedBy: reviewerId,
      },
    });

    await this.auditService.log({
      organizationId: app.organizationId,
      campusId: app.campusId,
      userId: reviewerId,
      action: 'APPROVE_APPLICATION',
      module: 'admissions',
      resourceId: id,
      newValues: { status: 'APPROVED', reason },
    });

    return updated;
  }

  /**
   * Reject application
   */
  async reject(id: string, reviewerId: string, reason: string) {
    const app = await this.findOne(id);
    if (app.status === 'ADMITTED') {
      throw new ConflictException('Cannot reject an admitted student application');
    }

    const updated = await this.prisma.admissionApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decisionDate: new Date(),
        decisionReason: reason,
        reviewedBy: reviewerId,
      },
    });

    await this.auditService.log({
      organizationId: app.organizationId,
      campusId: app.campusId,
      userId: reviewerId,
      action: 'REJECT_APPLICATION',
      module: 'admissions',
      resourceId: id,
      newValues: { status: 'REJECTED', reason },
    });

    return updated;
  }

  /**
   * Transactional Conversion of Approved Application to Student Profile & User
   */
  async convertToStudent(id: string, dto: ConvertAdmissionApplicationDto, actorId: string) {
    const app = await this.findOne(id);

    if (app.status === 'ADMITTED' || app.admittedStudentId) {
      throw new ConflictException(`Application #${app.applicationNumber} has already been converted to student`);
    }

    if (app.status !== 'APPROVED') {
      throw new BadRequestException(`Application must be APPROVED before admission conversion (Current status: ${app.status})`);
    }

    // 1. Admission Number
    const admissionNumber = dto.admissionNumber || (await this.generateAdmissionNumber(app.organizationId));

    // 2. Execute within Prisma transaction boundary
    const result = await this.prisma.$transaction(async (tx) => {
      // Find STUDENT system role
      const studentRole = await tx.role.findFirst({
        where: { organizationId: app.organizationId, code: 'STUDENT' },
      });

      // Default student password hash
      const passwordHash = await argon2.hash('Student@2026!');

      // Check if user account exists with this email or create new
      const studentEmail = app.email
        ? app.email.toLowerCase()
        : `std.${admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.local`;

      let user = await tx.user.findUnique({ where: { email: studentEmail } });
      if (!user) {
        user = await tx.user.create({
          data: {
            organizationId: app.organizationId,
            campusId: app.campusId,
            email: studentEmail,
            passwordHash,
            firstName: app.firstName,
            lastName: app.lastName,
            gender: app.gender,
            phone: app.phone,
            createdBy: actorId,
            userRoles: studentRole ? { create: { roleId: studentRole.id } } : undefined,
          },
        });
      }

      // Create StudentProfile
      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          admissionNumber,
          admissionDate: new Date(),
          dateOfBirth: app.dateOfBirth,
          address: app.address,
          previousSchool: app.previousSchool,
          emergencyContactName: app.guardianName,
          emergencyContactPhone: app.guardianPhone,
          emergencyContactRelation: app.guardianRelation,
          lifecycleStatus: 'ADMITTED',
          createdBy: actorId,
        },
      });

      // Process Guardian Profile if requested
      if (dto.createGuardianAccount !== false && app.guardianPhone) {
        const guardianRole = await tx.role.findFirst({
          where: { organizationId: app.organizationId, code: 'PARENT' },
        });

        const guardianEmail = app.guardianEmail
          ? app.guardianEmail.toLowerCase()
          : `parent.${app.guardianPhone.replace(/[^0-9]/g, '')}@school.local`;

        let guardianUser = await tx.user.findUnique({ where: { email: guardianEmail } });
        if (!guardianUser) {
          const names = app.guardianName.trim().split(' ');
          const gFirstName = names[0] || 'Guardian';
          const gLastName = names.slice(1).join(' ') || 'Parent';

          guardianUser = await tx.user.create({
            data: {
              organizationId: app.organizationId,
              email: guardianEmail,
              passwordHash: await argon2.hash('Parent@2026!'),
              firstName: gFirstName,
              lastName: gLastName,
              phone: app.guardianPhone,
              createdBy: actorId,
              userRoles: guardianRole ? { create: { roleId: guardianRole.id } } : undefined,
            },
          });
        }

        let guardianProfile = await tx.guardianProfile.findUnique({ where: { userId: guardianUser.id } });
        if (!guardianProfile) {
          guardianProfile = await tx.guardianProfile.create({
            data: {
              userId: guardianUser.id,
              relationship: app.guardianRelation,
              occupation: app.guardianOccupation,
              address: app.guardianAddress || app.address,
              createdBy: actorId,
            },
          });
        }

        // Link in StudentGuardian
        await tx.studentGuardian.upsert({
          where: {
            studentId_guardianId: {
              studentId: studentProfile.id,
              guardianId: guardianProfile.id,
            },
          },
          create: {
            studentId: studentProfile.id,
            guardianId: guardianProfile.id,
            relationship: app.guardianRelation,
            isPrimary: true,
            isEmergencyContact: true,
          },
          update: {},
        });
      }

      // Initial Enrollment if sectionId provided
      if (dto.sectionId) {
        await tx.enrollment.create({
          data: {
            academicYearId: app.academicYearId,
            studentId: studentProfile.id,
            sectionId: dto.sectionId,
            rollNumber: dto.rollNumber,
          },
        });
      }

      // Transfer documents
      await tx.studentDocument.updateMany({
        where: { admissionApplicationId: id },
        data: { studentId: studentProfile.id },
      });

      // Update Application status to ADMITTED
      await tx.admissionApplication.update({
        where: { id },
        data: {
          status: 'ADMITTED',
          admittedStudentId: studentProfile.id,
        },
      });

      // Record StudentStatusHistory
      await tx.studentStatusHistory.create({
        data: {
          studentId: studentProfile.id,
          previousStatus: 'APPLICANT',
          newStatus: 'ADMITTED',
          reason: `Converted from Admission Application #${app.applicationNumber}`,
          changedBy: actorId,
        },
      });

      return { studentProfile, admissionNumber, user };
    });

    await this.auditService.log({
      organizationId: app.organizationId,
      campusId: app.campusId,
      userId: actorId,
      action: 'CONVERT_TO_STUDENT',
      module: 'admissions',
      resourceId: result.studentProfile.id,
      newValues: {
        applicationNumber: app.applicationNumber,
        admissionNumber: result.admissionNumber,
        studentId: result.studentProfile.id,
      },
    });

    return {
      message: `Applicant converted to student successfully!`,
      studentId: result.studentProfile.id,
      admissionNumber: result.admissionNumber,
      userId: result.user.id,
    };
  }

  /**
   * Attach document to admission application
   */
  async attachDocument(
    applicationId: string,
    dto: {
      documentType: string;
      fileKey: string;
      fileName: string;
      mimeType: string;
      sizeInBytes?: number;
      notes?: string;
    },
    uploaderId?: string,
  ) {
    const app = await this.findOne(applicationId);

    const doc = await this.prisma.studentDocument.create({
      data: {
        admissionApplicationId: applicationId,
        studentId: app.admittedStudentId,
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
      organizationId: app.organizationId,
      campusId: app.campusId,
      userId: uploaderId,
      action: 'ATTACH_DOCUMENT',
      module: 'admissions',
      resourceId: doc.id,
      newValues: { applicationId, documentType: dto.documentType, fileKey: dto.fileKey },
    });

    return doc;
  }
}
