import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AcademicsService {
  private readonly logger = new Logger(AcademicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Academic Years & Terms
  // ---------------------------------------------------------------------------

  async getYears(organizationId: string, campusId?: string) {
    return this.prisma.academicYear.findMany({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
      },
      include: {
        terms: {
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: {
            enrollments: true,
            curricula: true,
            subjectOfferings: true,
            calendarEvents: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async createYear(organizationId: string, dto: any, userId?: string) {
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { organizationId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.academicYear.create({
      data: {
        organizationId,
        campusId: dto.campusId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
        createdBy: userId,
      },
      include: { terms: true },
    });
  }

  async setCurrentYear(id: string, organizationId: string, userId?: string) {
    await this.prisma.academicYear.updateMany({
      where: { organizationId, isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true, updatedBy: userId },
      include: { terms: true },
    });
  }

  async getTerms(academicYearId: string) {
    return this.prisma.term.findMany({
      where: { academicYearId },
      orderBy: { startDate: 'asc' },
    });
  }

  async createTerm(
    academicYearId: string,
    dto: { name: string; code: string; startDate: string | Date; endDate: string | Date; isCurrent?: boolean },
    userId?: string,
  ) {
    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: { academicYearId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.term.create({
      data: {
        academicYearId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
        createdBy: userId,
      },
    });
  }

  async updateTerm(
    id: string,
    dto: { name?: string; startDate?: string | Date; endDate?: string | Date; isCurrent?: boolean },
    userId?: string,
  ) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) throw new NotFoundException(`Term with ID ${id} not found`);

    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: { academicYearId: term.academicYearId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.term.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
        updatedBy: userId,
      },
    });
  }

  async setCurrentTerm(id: string, academicYearId: string, userId?: string) {
    await this.prisma.term.updateMany({
      where: { academicYearId, isCurrent: true },
      data: { isCurrent: false },
    });

    return this.prisma.term.update({
      where: { id },
      data: { isCurrent: true, updatedBy: userId },
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Classes & Progression
  // ---------------------------------------------------------------------------

  async getClasses(campusId: string) {
    return this.prisma.class.findMany({
      where: { campusId },
      include: {
        nextClass: {
          select: { id: true, name: true, code: true },
        },
        sections: {
          include: {
            classTeacher: {
              include: { user: { select: { firstName: true, lastName: true, email: true } } },
            },
            _count: {
              select: { enrollments: true },
            },
          },
        },
        curricula: {
          where: { status: 'ACTIVE' },
          include: {
            subjects: {
              include: { subject: true },
            },
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async createClass(campusId: string, dto: any, userId?: string) {
    const existing = await this.prisma.class.findUnique({
      where: {
        campusId_code: { campusId, code: dto.code.toUpperCase() },
      },
    });

    if (existing) {
      throw new ConflictException(`Class with code ${dto.code} already exists`);
    }

    return this.prisma.class.create({
      data: {
        campusId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        orderIndex: dto.orderIndex ?? 0,
        nextClassId: dto.nextClassId || null,
        createdBy: userId,
      },
    });
  }

  async updateClass(id: string, dto: any, userId?: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException(`Class with ID ${id} not found`);

    return this.prisma.class.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.nextClassId !== undefined ? { nextClassId: dto.nextClassId || null } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedBy: userId,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Sections
  // ---------------------------------------------------------------------------

  async getSections(classId: string) {
    return this.prisma.section.findMany({
      where: { classId },
      include: {
        class: { select: { id: true, name: true, code: true, campusId: true } },
        classTeacher: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        _count: {
          select: { enrollments: true, subjectOfferings: true },
        },
      },
    });
  }

  async createSection(dto: any, userId?: string) {
    const existing = await this.prisma.section.findUnique({
      where: {
        classId_name: { classId: dto.classId, name: dto.name },
      },
    });

    if (existing) {
      throw new ConflictException(`Section ${dto.name} already exists in this class`);
    }

    return this.prisma.section.create({
      data: {
        classId: dto.classId,
        name: dto.name,
        capacity: dto.capacity ?? 40,
        roomNumber: dto.roomNumber || null,
        classTeacherId: dto.classTeacherId || null,
        createdBy: userId,
      },
      include: {
        class: true,
        classTeacher: { include: { user: true } },
      },
    });
  }

  async updateSection(id: string, dto: any, userId?: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException(`Section with ID ${id} not found`);

    return this.prisma.section.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.roomNumber !== undefined ? { roomNumber: dto.roomNumber } : {}),
        ...(dto.classTeacherId !== undefined ? { classTeacherId: dto.classTeacherId || null } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedBy: userId,
      },
      include: {
        class: true,
        classTeacher: { include: { user: true } },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Subjects
  // ---------------------------------------------------------------------------

  async getSubjects(category?: string) {
    return this.prisma.subject.findMany({
      where: {
        ...(category ? { category: category as any } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: {
          select: { subjectOfferings: true, curriculumSubjects: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(dto: any) {
    const existing = await this.prisma.subject.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Subject code ${dto.code} already exists`);
    }

    return this.prisma.subject.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        shortName: dto.shortName || null,
        category: dto.category || 'CORE',
        departmentId: dto.departmentId || null,
        creditHours: dto.creditHours,
        isElective: dto.isElective ?? false,
      },
      include: {
        department: true,
      },
    });
  }

  async updateSubject(id: string, dto: any) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException(`Subject with ID ${id} not found`);

    return this.prisma.subject.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.shortName !== undefined ? { shortName: dto.shortName } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId || null } : {}),
        ...(dto.creditHours !== undefined ? { creditHours: dto.creditHours } : {}),
        ...(dto.isElective !== undefined ? { isElective: dto.isElective } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Curriculum Management
  // ---------------------------------------------------------------------------

  async getCurricula(organizationId: string, query?: { campusId?: string; academicYearId?: string; classId?: string }) {
    return this.prisma.curriculum.findMany({
      where: {
        organizationId,
        ...(query?.campusId ? { campusId: query.campusId } : {}),
        ...(query?.academicYearId ? { academicYearId: query.academicYearId } : {}),
        ...(query?.classId ? { classId: query.classId } : {}),
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true } },
        subjects: {
          include: {
            subject: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCurriculum(organizationId: string, dto: any, userId?: string) {
    const existing = await this.prisma.curriculum.findUnique({
      where: {
        academicYearId_classId_code: {
          academicYearId: dto.academicYearId,
          classId: dto.classId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Curriculum with code ${dto.code} already exists for this class and academic year`);
    }

    const curriculum = await this.prisma.curriculum.create({
      data: {
        organizationId,
        campusId: dto.campusId || null,
        academicYearId: dto.academicYearId,
        classId: dto.classId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        version: dto.version || '1.0',
        description: dto.description || null,
        createdBy: userId,
      },
    });

    if (dto.subjects && Array.isArray(dto.subjects) && dto.subjects.length > 0) {
      for (const [index, sub] of dto.subjects.entries()) {
        await this.prisma.curriculumSubject.create({
          data: {
            curriculumId: curriculum.id,
            subjectId: sub.subjectId,
            isRequired: sub.isRequired ?? true,
            creditHours: sub.creditHours ?? null,
            weeklyPeriods: sub.weeklyPeriods ?? 3,
            orderIndex: sub.orderIndex ?? index + 1,
          },
        });
      }
    }

    return this.prisma.curriculum.findUnique({
      where: { id: curriculum.id },
      include: {
        class: true,
        academicYear: true,
        subjects: { include: { subject: true }, orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async addSubjectToCurriculum(curriculumId: string, dto: any) {
    const curriculum = await this.prisma.curriculum.findUnique({ where: { id: curriculumId } });
    if (!curriculum) throw new NotFoundException(`Curriculum with ID ${curriculumId} not found`);

    return this.prisma.curriculumSubject.upsert({
      where: {
        curriculumId_subjectId: {
          curriculumId,
          subjectId: dto.subjectId,
        },
      },
      update: {
        isRequired: dto.isRequired ?? true,
        creditHours: dto.creditHours ?? null,
        weeklyPeriods: dto.weeklyPeriods ?? 3,
        orderIndex: dto.orderIndex ?? 0,
      },
      create: {
        curriculumId,
        subjectId: dto.subjectId,
        isRequired: dto.isRequired ?? true,
        creditHours: dto.creditHours ?? null,
        weeklyPeriods: dto.weeklyPeriods ?? 3,
        orderIndex: dto.orderIndex ?? 0,
      },
      include: {
        subject: true,
      },
    });
  }

  async removeSubjectFromCurriculum(curriculumId: string, subjectId: string) {
    return this.prisma.curriculumSubject.delete({
      where: {
        curriculumId_subjectId: {
          curriculumId,
          subjectId,
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Subject Offerings & Teacher Assignment
  // ---------------------------------------------------------------------------

  async getSubjectOfferings(
    organizationId: string,
    query?: { academicYearId?: string; termId?: string; classId?: string; sectionId?: string; teacherId?: string },
  ) {
    return this.prisma.subjectOffering.findMany({
      where: {
        academicYear: { organizationId },
        ...(query?.academicYearId ? { academicYearId: query.academicYearId } : {}),
        ...(query?.termId ? { termId: query.termId } : {}),
        ...(query?.classId ? { classId: query.classId } : {}),
        ...(query?.sectionId ? { sectionId: query.sectionId } : {}),
        ...(query?.teacherId ? { primaryTeacherId: query.teacherId } : {}),
      },
      include: {
        subject: true,
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, capacity: true } },
        primaryTeacher: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: {
          select: { courseEnrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubjectOffering(dto: any) {
    const existing = await this.prisma.subjectOffering.findUnique({
      where: {
        academicYearId_sectionId_subjectId: {
          academicYearId: dto.academicYearId,
          sectionId: dto.sectionId,
          subjectId: dto.subjectId,
        },
      },
    });

    if (existing) {
      return this.prisma.subjectOffering.update({
        where: { id: existing.id },
        data: {
          termId: dto.termId || null,
          classId: dto.classId,
          primaryTeacherId: dto.primaryTeacherId || null,
          weeklyPeriods: dto.weeklyPeriods ?? 4,
          status: dto.status || 'ACTIVE',
        },
        include: {
          subject: true,
          class: true,
          section: true,
          primaryTeacher: { include: { user: true } },
        },
      });
    }

    return this.prisma.subjectOffering.create({
      data: {
        academicYearId: dto.academicYearId,
        termId: dto.termId || null,
        classId: dto.classId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        primaryTeacherId: dto.primaryTeacherId || null,
        weeklyPeriods: dto.weeklyPeriods ?? 4,
      },
      include: {
        subject: true,
        class: true,
        section: true,
        primaryTeacher: { include: { user: true } },
      },
    });
  }

  async assignSubjectTeacher(dto: { subjectId: string; teacherId: string; sectionId: string }) {
    return this.prisma.subjectTeacher.upsert({
      where: {
        subjectId_teacherId_sectionId: {
          subjectId: dto.subjectId,
          teacherId: dto.teacherId,
          sectionId: dto.sectionId,
        },
      },
      update: {},
      create: {
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        sectionId: dto.sectionId,
      },
    });
  }

  async assignClassTeacher(
    sectionId: string,
    teacherId: string,
    academicYearId: string,
    userId?: string,
  ) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { class: true },
    });
    if (!section) throw new NotFoundException(`Section with ID ${sectionId} not found`);

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException(`Teacher with ID ${teacherId} not found`);

    // End current active assignment for this section
    await this.prisma.classTeacherAssignment.updateMany({
      where: { sectionId, isCurrent: true },
      data: { isCurrent: false, endDate: new Date() },
    });

    // Create new assignment record
    const assignment = await this.prisma.classTeacherAssignment.create({
      data: {
        sectionId,
        teacherId,
        academicYearId,
        startDate: new Date(),
        isCurrent: true,
      },
    });

    // Update section classTeacherId
    await this.prisma.section.update({
      where: { id: sectionId },
      data: {
        classTeacherId: teacherId,
        updatedBy: userId,
      },
    });

    // Log audited assignment
    const campus = await this.prisma.campus.findUnique({ where: { id: section.class.campusId } });
    if (campus) {
      await this.auditService.log({
        organizationId: campus.organizationId,
        campusId: campus.id,
        userId: userId || 'system',
        action: 'ASSIGN_CLASS_TEACHER',
        module: 'academics',
        resourceId: sectionId,
        newValues: {
          sectionId,
          sectionName: section.name,
          teacherId,
          teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`,
          academicYearId,
        },
      });
    }

    return assignment;
  }

  async getClassTeacherHistory(sectionId: string) {
    return this.prisma.classTeacherAssignment.findMany({
      where: { sectionId },
      include: {
        teacher: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getTeacherWorkload(teacherId: string, academicYearId?: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!teacher) throw new NotFoundException(`Teacher with ID ${teacherId} not found`);

    const offerings = await this.prisma.subjectOffering.findMany({
      where: {
        primaryTeacherId: teacherId,
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        subject: true,
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
    });

    const classTeacherSections = await this.prisma.section.findMany({
      where: { classTeacherId: teacherId },
      include: {
        class: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    });

    const totalWeeklyPeriods = offerings.reduce((acc, curr) => acc + (curr.weeklyPeriods || 0), 0);

    return {
      teacher,
      offerings,
      classTeacherSections,
      totalOfferings: offerings.length,
      totalWeeklyPeriods,
    };
  }

  // ---------------------------------------------------------------------------
  // 7. Enrollments & Roster (Capacity Validation + Overrides)
  // ---------------------------------------------------------------------------

  async enrollStudent(
    dto: {
      academicYearId: string;
      studentId: string;
      sectionId: string;
      rollNumber?: string;
      allowCapacityOverride?: boolean;
    },
    userId?: string,
  ) {
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        academicYearId_studentId: {
          academicYearId: dto.academicYearId,
          studentId: dto.studentId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Student is already enrolled in this academic year');
    }

    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
      include: {
        class: { include: { campus: true } },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${dto.sectionId} not found`);
    }

    // Capacity check
    const currentEnrolledCount = await this.prisma.enrollment.count({
      where: {
        sectionId: dto.sectionId,
        academicYearId: dto.academicYearId,
        status: 'ACTIVE',
      },
    });

    if (currentEnrolledCount >= section.capacity) {
      if (!dto.allowCapacityOverride) {
        throw new ConflictException(
          `Section capacity limit reached (${section.capacity} students). Capacity override required to proceed.`,
        );
      }

      // Log capacity override audit event
      await this.auditService.log({
        organizationId: section.class.campus.organizationId,
        campusId: section.class.campus.id,
        userId: userId || 'system',
        action: 'CAPACITY_OVERRIDE',
        module: 'academics',
        resourceId: dto.sectionId,
        newValues: {
          sectionId: dto.sectionId,
          studentId: dto.studentId,
          sectionCapacity: section.capacity,
          currentCount: currentEnrolledCount,
          academicYearId: dto.academicYearId,
        },
      });
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        academicYearId: dto.academicYearId,
        studentId: dto.studentId,
        sectionId: dto.sectionId,
        rollNumber: dto.rollNumber,
      },
      include: {
        student: { include: { user: true } },
        section: { include: { class: true } },
      },
    });

    // Auto-enroll student into active subject offerings for this section
    const offerings = await this.prisma.subjectOffering.findMany({
      where: {
        academicYearId: dto.academicYearId,
        sectionId: dto.sectionId,
        status: 'ACTIVE',
      },
    });

    for (const offering of offerings) {
      await this.prisma.courseEnrollment.upsert({
        where: {
          enrollmentId_subjectOfferingId: {
            enrollmentId: enrollment.id,
            subjectOfferingId: offering.id,
          },
        },
        update: {},
        create: {
          enrollmentId: enrollment.id,
          subjectOfferingId: offering.id,
          status: 'ACTIVE',
        },
      });
    }

    return enrollment;
  }

  async transferSection(enrollmentId: string, newSectionId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment record not found');
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { sectionId: newSectionId },
    });
  }

  async getSectionRoster(sectionId: string, academicYearId?: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { class: true },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const where: any = { sectionId };
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      orderBy: { rollNumber: 'asc' },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return {
      section,
      students: enrollments.map((e) => ({
        enrollmentId: e.id,
        rollNumber: e.rollNumber,
        studentId: e.studentId,
        admissionNumber: e.student.admissionNumber,
        name: `${e.student.user.firstName} ${e.student.user.lastName}`,
        gender: e.student.user.gender,
        email: e.student.user.email,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 8. Academic Calendar & Events
  // ---------------------------------------------------------------------------

  async getCalendarEvents(
    organizationId: string,
    query?: {
      campusId?: string;
      academicYearId?: string;
      termId?: string;
      category?: any;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.prisma.academicCalendarEvent.findMany({
      where: {
        organizationId,
        ...(query?.campusId ? { campusId: query.campusId } : {}),
        ...(query?.academicYearId ? { academicYearId: query.academicYearId } : {}),
        ...(query?.termId ? { termId: query.termId } : {}),
        ...(query?.category ? { category: query.category } : {}),
        ...(query?.startDate && query?.endDate
          ? {
              startDate: { gte: new Date(query.startDate) },
              endDate: { lte: new Date(query.endDate) },
            }
          : {}),
      },
      include: {
        academicYear: { select: { id: true, name: true } },
        term: { select: { id: true, name: true, code: true } },
        campus: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async createCalendarEvent(organizationId: string, dto: any, userId?: string) {
    return this.prisma.academicCalendarEvent.create({
      data: {
        organizationId,
        campusId: dto.campusId || null,
        academicYearId: dto.academicYearId,
        termId: dto.termId || null,
        title: dto.title,
        description: dto.description || null,
        category: dto.category || 'EVENT',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isHoliday: dto.isHoliday ?? false,
        targetAudience: dto.targetAudience || 'ALL',
        createdBy: userId,
      },
      include: {
        academicYear: true,
        term: true,
      },
    });
  }

  async updateCalendarEvent(id: string, organizationId: string, dto: any, userId?: string) {
    const event = await this.prisma.academicCalendarEvent.findFirst({
      where: { id, organizationId },
    });

    if (!event) throw new NotFoundException(`Calendar event with ID ${id} not found`);

    return this.prisma.academicCalendarEvent.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isHoliday !== undefined ? { isHoliday: dto.isHoliday } : {}),
        ...(dto.targetAudience ? { targetAudience: dto.targetAudience } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedBy: userId,
      },
    });
  }

  async deleteCalendarEvent(id: string, organizationId: string) {
    const event = await this.prisma.academicCalendarEvent.findFirst({
      where: { id, organizationId },
    });

    if (!event) throw new NotFoundException(`Calendar event with ID ${id} not found`);

    return this.prisma.academicCalendarEvent.delete({
      where: { id },
    });
  }

  // ---------------------------------------------------------------------------
  // 9. Academic Overview
  // ---------------------------------------------------------------------------

  async getAcademicOverview(organizationId: string, campusId?: string) {
    const [
      totalYears,
      activeYear,
      totalTerms,
      totalClasses,
      totalSections,
      totalSubjects,
      totalOfferings,
      totalCurricula,
      upcomingEventsCount,
    ] = await Promise.all([
      this.prisma.academicYear.count({
        where: { organizationId, ...(campusId ? { campusId } : {}) },
      }),
      this.prisma.academicYear.findFirst({
        where: { organizationId, isCurrent: true, ...(campusId ? { campusId } : {}) },
        select: { id: true, name: true, startDate: true, endDate: true },
      }),
      this.prisma.term.count({
        where: { academicYear: { organizationId, ...(campusId ? { campusId } : {}) } },
      }),
      this.prisma.class.count({
        where: { campus: { organizationId, ...(campusId ? { id: campusId } : {}) } },
      }),
      this.prisma.section.count({
        where: { class: { campus: { organizationId, ...(campusId ? { id: campusId } : {}) } } },
      }),
      this.prisma.subject.count(),
      this.prisma.subjectOffering.count({
        where: { academicYear: { organizationId, ...(campusId ? { campusId } : {}) } },
      }),
      this.prisma.curriculum.count({
        where: { organizationId, ...(campusId ? { campusId } : {}) },
      }),
      this.prisma.academicCalendarEvent.count({
        where: {
          organizationId,
          ...(campusId ? { campusId } : {}),
          startDate: { gte: new Date() },
        },
      }),
    ]);

    return {
      totalYears,
      activeYear,
      totalTerms,
      totalClasses,
      totalSections,
      totalSubjects,
      totalOfferings,
      totalCurricula,
      upcomingEventsCount,
    };
  }
}
