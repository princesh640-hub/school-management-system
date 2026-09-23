import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GradingEngineService } from './grading-engine.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import {
  CreateAssessmentComponentDto,
  EnterMarksBatchDto,
  SubmitMarksDto,
  RequestMarksCorrectionDto,
  ReviewMarksCorrectionDto,
} from '@school/shared-types';

@Injectable()
export class MarksEntryService {
  private readonly logger = new Logger(MarksEntryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly gradingEngine: GradingEngineService,
  ) {}

  // ---------------------------------------------------------------------------
  // Assessment Components
  // ---------------------------------------------------------------------------

  async createAssessmentComponent(dto: CreateAssessmentComponentDto) {
    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id: dto.examScheduleId },
    });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    if (dto.passingMarks > dto.maxMarks) {
      throw new BadRequestException('Component passing marks cannot exceed maximum marks');
    }

    return this.prisma.assessmentComponent.create({
      data: {
        examScheduleId: dto.examScheduleId,
        name: dto.name,
        componentType: dto.componentType || 'THEORY',
        maxMarks: dto.maxMarks,
        passingMarks: dto.passingMarks,
        weight: dto.weight !== undefined ? Number(dto.weight) : null,
        sequence: dto.sequence || 1,
      },
    });
  }

  async getScheduleComponents(scheduleId: string) {
    return this.prisma.assessmentComponent.findMany({
      where: { examScheduleId: scheduleId },
      orderBy: { sequence: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Batch Marks Entry
  // ---------------------------------------------------------------------------

  async enterMarksBatch(user: CurrentUserPayload, dto: EnterMarksBatchDto) {
    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id: dto.examScheduleId },
      include: {
        components: true,
        subject: true,
      },
    });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    const max = Number(schedule.maxMarks);
    const pass = Number(schedule.passingMarks);

    // Fetch dynamic grade scale rules if any
    const gradeRules = await this.gradingEngine.getGradeScaleRules(
      undefined,
      user.organizationId,
      user.campusId,
    );

    const savedResults = [];

    for (const item of dto.results) {
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: item.studentId },
      });
      if (!student) {
        throw new NotFoundException(`Student with ID ${item.studentId} not found`);
      }

      const isAbsent = Boolean(item.isAbsent);
      const isExempt = Boolean(item.isExempt);

      let marksObtained = Number(item.marksObtained || 0);

      // Absent or exempt handling
      if (isAbsent) {
        marksObtained = 0;
      }

      if (marksObtained > max && !isExempt) {
        throw new BadRequestException(
          `Marks obtained (${marksObtained}) for student ${student.admissionNumber} cannot exceed max marks (${max})`,
        );
      }

      if (marksObtained < 0) {
        throw new BadRequestException(`Marks cannot be negative`);
      }

      // Handle components breakdown if provided
      if (item.componentMarks && item.componentMarks.length > 0) {
        const compCalculations = item.componentMarks.map((cm) => {
          const compDef = schedule.components.find((c) => c.id === cm.componentId);
          return {
            marksObtained: Number(cm.marksObtained || 0),
            maxMarks: compDef ? Number(compDef.maxMarks) : 100,
            weight: compDef?.weight ? Number(compDef.weight) : null,
          };
        });

        const compResult = this.gradingEngine.computeComponentTotal(compCalculations);
        if (!item.marksObtained && compResult.totalMarks > 0) {
          marksObtained = compResult.totalMarks;
        }
      }

      const percentage = this.gradingEngine.computePercentage(marksObtained, max);
      const gradeRes = this.gradingEngine.resolveGrade(percentage, gradeRules);
      const isPassed = !isAbsent && (isExempt || (marksObtained >= pass && gradeRes.isPass));

      const examResult = await this.prisma.examResult.upsert({
        where: {
          examScheduleId_studentId: {
            examScheduleId: dto.examScheduleId,
            studentId: item.studentId,
          },
        },
        update: {
          marksObtained,
          percentage,
          grade: isExempt ? 'EX' : isAbsent ? 'AB' : gradeRes.grade,
          gradePoint: isExempt || isAbsent ? 0 : gradeRes.gradePoint,
          isPassed,
          isAbsent,
          isExempt,
          status: 'ENTERED',
          remarks: item.remarks,
          updatedBy: user.id,
        },
        create: {
          examScheduleId: dto.examScheduleId,
          studentId: item.studentId,
          marksObtained,
          percentage,
          grade: isExempt ? 'EX' : isAbsent ? 'AB' : gradeRes.grade,
          gradePoint: isExempt || isAbsent ? 0 : gradeRes.gradePoint,
          isPassed,
          isAbsent,
          isExempt,
          status: 'ENTERED',
          remarks: item.remarks,
          createdBy: user.id,
        },
      });

      // Upsert component breakdowns if given
      if (item.componentMarks && item.componentMarks.length > 0) {
        for (const cm of item.componentMarks) {
          await this.prisma.marksEntryComponent.upsert({
            where: {
              examResultId_componentId: {
                examResultId: examResult.id,
                componentId: cm.componentId,
              },
            },
            update: {
              marksObtained: Number(cm.marksObtained || 0),
              isAbsent: Boolean(cm.isAbsent),
              remarks: cm.remarks,
            },
            create: {
              examResultId: examResult.id,
              componentId: cm.componentId,
              marksObtained: Number(cm.marksObtained || 0),
              isAbsent: Boolean(cm.isAbsent),
              remarks: cm.remarks,
            },
          });
        }
      }

      savedResults.push(examResult);
    }

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ENTER_MARKS',
      resource: 'EXAM_RESULT',
      resourceId: dto.examScheduleId,
      details: { count: savedResults.length },
    });

    return {
      message: `Successfully processed marks for ${savedResults.length} students`,
      examScheduleId: dto.examScheduleId,
      processedCount: savedResults.length,
      results: savedResults,
    };
  }

  // ---------------------------------------------------------------------------
  // Teacher Submission Workflow
  // ---------------------------------------------------------------------------

  async submitMarks(user: CurrentUserPayload, dto: SubmitMarksDto) {
    const schedule = await this.prisma.examSchedule.findUnique({
      where: { id: dto.examScheduleId },
      include: { examResults: true },
    });
    if (!schedule) throw new NotFoundException('Exam schedule not found');

    if (schedule.examResults.length === 0) {
      throw new BadRequestException('Cannot submit empty marks sheet');
    }

    // Check if any results are currently locked
    const lockedCount = schedule.examResults.filter((r) => r.isLocked).length;
    if (lockedCount > 0) {
      throw new BadRequestException('Cannot submit marks: one or more records are locked');
    }

    await this.prisma.examResult.updateMany({
      where: { examScheduleId: dto.examScheduleId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedBy: user.id,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SUBMIT_MARKS',
      resource: 'EXAM_SCHEDULE',
      resourceId: dto.examScheduleId,
      details: { submissionCount: schedule.examResults.length },
    });

    return {
      message: 'Marks sheet submitted successfully for administrative review',
      examScheduleId: dto.examScheduleId,
      submittedCount: schedule.examResults.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Marks Correction Workflow
  // ---------------------------------------------------------------------------

  async requestCorrection(user: CurrentUserPayload, dto: RequestMarksCorrectionDto) {
    const result = await this.prisma.examResult.findUnique({
      where: { id: dto.examResultId },
      include: { examSchedule: true },
    });
    if (!result) throw new NotFoundException('Exam result not found');

    const max = Number(result.examSchedule.maxMarks);
    if (dto.requestedMarks < 0 || dto.requestedMarks > max) {
      throw new BadRequestException(`Requested marks must be between 0 and ${max}`);
    }

    const correction = await this.prisma.marksCorrection.create({
      data: {
        examResultId: dto.examResultId,
        originalMarks: result.marksObtained,
        requestedMarks: dto.requestedMarks,
        reason: dto.reason,
        requestedBy: user.id,
        status: 'PENDING',
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REQUEST_CORRECTION',
      resource: 'MARKS_CORRECTION',
      resourceId: correction.id,
      details: {
        examResultId: dto.examResultId,
        original: result.marksObtained,
        requested: dto.requestedMarks,
        reason: dto.reason,
      },
    });

    return correction;
  }

  async reviewCorrection(user: CurrentUserPayload, dto: ReviewMarksCorrectionDto) {
    const correction = await this.prisma.marksCorrection.findUnique({
      where: { id: dto.correctionId },
      include: {
        examResult: {
          include: { examSchedule: true },
        },
      },
    });
    if (!correction) throw new NotFoundException('Marks correction request not found');

    if (correction.status !== 'PENDING') {
      throw new BadRequestException(`Correction request has already been ${correction.status}`);
    }

    const updatedCorrection = await this.prisma.marksCorrection.update({
      where: { id: dto.correctionId },
      data: {
        status: dto.decision,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewRemarks: dto.reviewRemarks,
      },
    });

    // If APPROVED, update the result with new version
    if (dto.decision === 'APPROVED') {
      const schedule = correction.examResult.examSchedule;
      const maxMarks = Number(schedule.maxMarks);
      const passMarks = Number(schedule.passingMarks);
      const newMarks = Number(correction.requestedMarks);

      const percentage = this.gradingEngine.computePercentage(newMarks, maxMarks);
      const gradeRules = await this.gradingEngine.getGradeScaleRules(
        undefined,
        user.organizationId,
        user.campusId,
      );
      const gradeRes = this.gradingEngine.resolveGrade(percentage, gradeRules);

      await this.prisma.examResult.update({
        where: { id: correction.examResultId },
        data: {
          marksObtained: newMarks,
          percentage,
          grade: gradeRes.grade,
          gradePoint: gradeRes.gradePoint,
          isPassed: newMarks >= passMarks && gradeRes.isPass,
          version: correction.examResult.version + 1,
          updatedBy: user.id,
        },
      });
    }

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REVIEW_CORRECTION',
      resource: 'MARKS_CORRECTION',
      resourceId: dto.correctionId,
      details: { decision: dto.decision, reviewRemarks: dto.reviewRemarks },
    });

    return updatedCorrection;
  }
}
