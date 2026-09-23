import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GradingEngineService } from './grading-engine.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  CreateGradeScaleDto,
  CalculateSessionResultDto,
  PublishResultsDto,
  ClassResultAnalytics,
  GradeDistribution,
} from '@school/shared-types';

@Injectable()
export class ResultProcessingService {
  private readonly logger = new Logger(ResultProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly gradingEngine: GradingEngineService,
  ) {}

  // ---------------------------------------------------------------------------
  // Grade Scales Management
  // ---------------------------------------------------------------------------

  async createGradeScale(user: CurrentUserPayload, dto: CreateGradeScaleDto) {
    const existing = await this.prisma.gradeScale.findFirst({
      where: {
        organizationId: user.organizationId,
        code: dto.code.toUpperCase().trim(),
        campusId: dto.campusId || null,
      },
    });
    if (existing) {
      throw new BadRequestException(`Grade scale with code '${dto.code}' already exists`);
    }

    if (dto.isDefault) {
      await this.prisma.gradeScale.updateMany({
        where: {
          organizationId: user.organizationId,
          campusId: dto.campusId || null,
        },
        data: { isDefault: false },
      });
    }

    const scale = await this.prisma.gradeScale.create({
      data: {
        organizationId: user.organizationId,
        campusId: dto.campusId || null,
        name: dto.name,
        code: dto.code.toUpperCase().trim(),
        description: dto.description,
        isDefault: Boolean(dto.isDefault),
        rules: {
          create: (dto.rules || []).map((r, idx) => ({
            grade: r.grade,
            minPercentage: r.minPercentage,
            maxPercentage: r.maxPercentage,
            gradePoint: r.gradePoint !== undefined ? r.gradePoint : null,
            description: r.description,
            isPass: r.isPass !== undefined ? r.isPass : true,
            sequence: r.sequence || idx + 1,
          })),
        },
      },
      include: { rules: { orderBy: { sequence: 'asc' } } },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resource: 'GRADE_SCALE',
      resourceId: scale.id,
      details: { name: scale.name, rulesCount: scale.rules.length },
    });

    return scale;
  }

  async getGradeScales(user: CurrentUserPayload, campusId?: string) {
    return this.prisma.gradeScale.findMany({
      where: {
        organizationId: user.organizationId,
        ...(campusId ? { OR: [{ campusId }, { campusId: null }] } : {}),
      },
      include: {
        rules: {
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Session Results Calculation & Ranking
  // ---------------------------------------------------------------------------

  async calculateSessionResults(user: CurrentUserPayload, dto: CalculateSessionResultDto) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.examSessionId },
      include: {
        schedules: {
          include: {
            subject: true,
            examResults: true,
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Exam session not found');

    if (session.schedules.length === 0) {
      throw new BadRequestException('Session has no scheduled examinations to calculate results for');
    }

    // Determine scale rules
    const scaleRules = await this.gradingEngine.getGradeScaleRules(
      dto.gradeScaleId,
      user.organizationId,
      user.campusId,
    );

    // Filter schedules if section is specified
    const schedules = dto.sectionId
      ? session.schedules.filter((s) => !s.sectionId || s.sectionId === dto.sectionId)
      : session.schedules;

    // Collect all unique student IDs with results in these schedules
    const studentIds = new Set<string>();
    for (const sch of schedules) {
      for (const res of sch.examResults) {
        studentIds.add(res.studentId);
      }
    }

    if (studentIds.size === 0) {
      throw new BadRequestException('No marks found in scheduled exams for this session');
    }

    const calculatedRecords = [];

    for (const studentId of Array.from(studentIds)) {
      // Find active enrollment for section mapping
      const enrollment = await this.prisma.studentEnrollment.findFirst({
        where: {
          studentId,
          status: 'ACTIVE',
          ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
        },
        include: { section: true },
      });

      const sectionId = enrollment?.sectionId || schedules[0]?.sectionId;
      if (!sectionId) continue;

      let totalMarksObtained = 0;
      let totalMaxMarks = 0;
      let hasFailedSubject = false;
      let hasAbsent = false;
      const gpaItems: Array<{ gradePoint: number }> = [];

      for (const sch of schedules) {
        const result = sch.examResults.find((r) => r.studentId === studentId);
        const schMax = Number(sch.maxMarks);
        totalMaxMarks += schMax;

        if (result) {
          totalMarksObtained += Number(result.marksObtained);
          if (result.isAbsent) hasAbsent = true;
          if (!result.isPassed && !result.isExempt) hasFailedSubject = true;
          if (result.gradePoint !== null && result.gradePoint !== undefined) {
            gpaItems.push({ gradePoint: Number(result.gradePoint) });
          }
        } else {
          hasFailedSubject = true;
        }
      }

      const percentage = this.gradingEngine.computePercentage(totalMarksObtained, totalMaxMarks);
      const gradeRes = this.gradingEngine.resolveGrade(percentage, scaleRules);
      const gpa = this.gradingEngine.computeGPA(gpaItems);

      let resultStatus: 'PASS' | 'FAIL' | 'ABSENT' = 'PASS';
      if (hasAbsent && totalMarksObtained === 0) {
        resultStatus = 'ABSENT';
      } else if (hasFailedSubject || !gradeRes.isPass) {
        resultStatus = 'FAIL';
      }

      const overall = await this.prisma.examOverallResult.upsert({
        where: {
          examSessionId_studentId: {
            examSessionId: dto.examSessionId,
            studentId,
          },
        },
        update: {
          sectionId,
          totalMarksObtained,
          totalMaxMarks,
          percentage,
          grade: gradeRes.grade,
          gpa,
          resultStatus,
          isLocked: false,
          updatedAt: new Date(),
        },
        create: {
          examSessionId: dto.examSessionId,
          studentId,
          sectionId,
          totalMarksObtained,
          totalMaxMarks,
          percentage,
          grade: gradeRes.grade,
          gpa,
          resultStatus,
          isLocked: false,
        },
      });

      calculatedRecords.push(overall);
    }

    // Compute and assign ranks (order descending by total marks obtained)
    calculatedRecords.sort(
      (a, b) => Number(b.totalMarksObtained) - Number(a.totalMarksObtained),
    );

    let currentRank = 1;
    for (let i = 0; i < calculatedRecords.length; i++) {
      if (
        i > 0 &&
        Number(calculatedRecords[i].totalMarksObtained) <
          Number(calculatedRecords[i - 1].totalMarksObtained)
      ) {
        currentRank = i + 1;
      }
      calculatedRecords[i].rank = currentRank;

      await this.prisma.examOverallResult.update({
        where: { id: calculatedRecords[i].id },
        data: { rank: currentRank },
      });
    }

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CALCULATE_RESULTS',
      resource: 'EXAM_SESSION',
      resourceId: dto.examSessionId,
      details: { studentCount: calculatedRecords.length },
    });

    return {
      message: `Successfully calculated and ranked overall results for ${calculatedRecords.length} students`,
      examSessionId: dto.examSessionId,
      calculatedCount: calculatedRecords.length,
      results: calculatedRecords,
    };
  }

  // ---------------------------------------------------------------------------
  // Approval, Locking & Publication Gates
  // ---------------------------------------------------------------------------

  async approveResults(user: CurrentUserPayload, sessionId: string, sectionId?: string) {
    const where: any = { examSessionId: sessionId };
    if (sectionId) where.sectionId = sectionId;

    const overallList = await this.prisma.examOverallResult.findMany({ where });
    if (overallList.length === 0) {
      throw new NotFoundException('No calculated results found for this session');
    }

    // Mark individual exam results as APPROVED
    const schedules = await this.prisma.examSchedule.findMany({
      where: {
        examSessionId: sessionId,
        ...(sectionId ? { sectionId } : {}),
      },
      select: { id: true },
    });

    const scheduleIds = schedules.map((s) => s.id);
    if (scheduleIds.length > 0) {
      await this.prisma.examResult.updateMany({
        where: { examScheduleId: { in: scheduleIds } },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: user.id,
        },
      });
    }

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'APPROVE_RESULTS',
      resource: 'EXAM_SESSION',
      resourceId: sessionId,
      details: { studentCount: overallList.length, sectionId },
    });

    return {
      message: `Results successfully approved for ${overallList.length} students`,
      approvedCount: overallList.length,
    };
  }

  async lockResults(user: CurrentUserPayload, sessionId: string, sectionId?: string) {
    const where: any = { examSessionId: sessionId };
    if (sectionId) where.sectionId = sectionId;

    const updated = await this.prisma.examOverallResult.updateMany({
      where,
      data: { isLocked: true },
    });

    // Lock subject exam results too
    const schedules = await this.prisma.examSchedule.findMany({
      where: {
        examSessionId: sessionId,
        ...(sectionId ? { sectionId } : {}),
      },
      select: { id: true },
    });

    const scheduleIds = schedules.map((s) => s.id);
    if (scheduleIds.length > 0) {
      await this.prisma.examResult.updateMany({
        where: { examScheduleId: { in: scheduleIds } },
        data: { isLocked: true, status: 'LOCKED' },
      });
    }

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'LOCK_RESULTS',
      resource: 'EXAM_SESSION',
      resourceId: sessionId,
      details: { lockedCount: updated.count },
    });

    return {
      message: `Results locked for ${updated.count} students. Edits now require formal correction requests.`,
      lockedCount: updated.count,
    };
  }

  async publishResults(user: CurrentUserPayload, dto: PublishResultsDto) {
    const where: any = { examSessionId: dto.examSessionId };
    if (dto.sectionId) where.sectionId = dto.sectionId;

    const overallList = await this.prisma.examOverallResult.findMany({ where });
    if (overallList.length === 0) {
      throw new NotFoundException('No overall results found to publish');
    }

    const updated = await this.prisma.examOverallResult.updateMany({
      where,
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: user.id,
      },
    });

    // Mark session status as PUBLISHED if not already
    await this.prisma.examSession.update({
      where: { id: dto.examSessionId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: user.id,
      },
    });

    await this.notificationsService.create({
      organizationId: user.organizationId,
      title: 'Exam Results Published',
      message: 'Examination results are now live and viewable on the student/parent portal.',
      type: 'SYSTEM',
      recipientRole: 'STUDENT',
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PUBLISH_RESULTS',
      resource: 'EXAM_SESSION',
      resourceId: dto.examSessionId,
      details: { publishedCount: updated.count },
    });

    return {
      message: `Results successfully published for ${updated.count} students`,
      publishedCount: updated.count,
    };
  }

  // ---------------------------------------------------------------------------
  // Privacy-Preserving Retrieval for Portals
  // ---------------------------------------------------------------------------

  async getStudentSessionResult(sessionId: string, studentId: string, isStaff: boolean) {
    const result = await this.prisma.examOverallResult.findUnique({
      where: {
        examSessionId_studentId: {
          examSessionId: sessionId,
          studentId,
        },
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        section: { include: { class: true } },
        examSession: { include: { examType: true, academicYear: true } },
      },
    });

    if (!result) throw new NotFoundException('Result record not found');

    if (!isStaff && !result.isPublished) {
      throw new ForbiddenException('Examination results for this session have not yet been published');
    }

    // Fetch individual subject grades for this student
    const subjectResults = await this.prisma.examResult.findMany({
      where: {
        studentId,
        examSchedule: { examSessionId: sessionId },
      },
      include: {
        examSchedule: {
          include: { subject: true },
        },
      },
    });

    return {
      overall: result,
      subjectResults: subjectResults.map((sr) => ({
        id: sr.id,
        subjectName: sr.examSchedule.subject.name,
        examDate: sr.examSchedule.examDate,
        maxMarks: Number(sr.examSchedule.maxMarks),
        passingMarks: Number(sr.examSchedule.passingMarks),
        marksObtained: Number(sr.marksObtained),
        percentage: Number(sr.percentage || 0),
        grade: sr.grade,
        isPassed: sr.isPassed,
        isAbsent: sr.isAbsent,
        isExempt: sr.isExempt,
        remarks: sr.remarks,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Analytics & Distribution
  // ---------------------------------------------------------------------------

  async getSectionAnalytics(sessionId: string, sectionId?: string): Promise<ClassResultAnalytics> {
    const where: any = { examSessionId: sessionId };
    if (sectionId) where.sectionId = sectionId;

    const results = await this.prisma.examOverallResult.findMany({
      where,
      include: {
        section: { include: { class: true } },
      },
    });

    const totalStudents = results.length;
    if (totalStudents === 0) {
      return {
        examSessionId: sessionId,
        sectionId,
        totalStudents: 0,
        evaluatedStudents: 0,
        passedStudents: 0,
        failedStudents: 0,
        passPercentage: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        gradeDistribution: [],
      };
    }

    const passed = results.filter((r) => r.resultStatus === 'PASS');
    const failed = results.filter((r) => r.resultStatus === 'FAIL');

    const scores = results.map((r) => Number(r.totalMarksObtained));
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / totalStudents) * 100) / 100;
    const passPct = Math.round((passed.length / totalStudents) * 1000) / 10;

    // Grade histogram
    const gradeCounts: Record<string, number> = {};
    for (const r of results) {
      const g = r.grade || 'N/A';
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;
    }

    const gradeDistribution: GradeDistribution[] = Object.entries(gradeCounts).map(
      ([grade, count]) => ({
        grade,
        count,
        percentage: Math.round((count / totalStudents) * 1000) / 10,
      }),
    );

    return {
      examSessionId: sessionId,
      sectionId,
      className: results[0]?.section?.class?.name,
      sectionName: results[0]?.section?.name,
      totalStudents,
      evaluatedStudents: totalStudents,
      passedStudents: passed.length,
      failedStudents: failed.length,
      passPercentage: passPct,
      averageScore: avgScore,
      highestScore: highest,
      lowestScore: lowest,
      gradeDistribution,
    };
  }
}
