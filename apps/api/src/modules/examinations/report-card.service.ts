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
  GenerateReportCardDto,
  GenerateTranscriptDto,
} from '@school/shared-types';

@Injectable()
export class ReportCardService {
  private readonly logger = new Logger(ReportCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Report Card Templates
  // ---------------------------------------------------------------------------

  async createTemplate(user: CurrentUserPayload, data: { name: string; code: string; config: any; isDefault?: boolean }) {
    if (data.isDefault) {
      await this.prisma.reportCardTemplate.updateMany({
        where: { organizationId: user.organizationId },
        data: { isDefault: false },
      });
    }

    return this.prisma.reportCardTemplate.create({
      data: {
        organizationId: user.organizationId,
        campusId: user.campusId || null,
        name: data.name,
        code: data.code.toUpperCase().trim(),
        config: data.config || {},
        isDefault: Boolean(data.isDefault),
      },
    });
  }

  async getTemplates(user: CurrentUserPayload) {
    return this.prisma.reportCardTemplate.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Report Card Assembly
  // ---------------------------------------------------------------------------

  async generateReportCard(user: CurrentUserPayload, dto: GenerateReportCardDto) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.examSessionId },
      include: {
        academicYear: true,
        examType: true,
      },
    });
    if (!session) throw new NotFoundException('Exam session not found');

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            class: true,
            section: true,
          },
        },
      },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    // Retrieve Overall Session Result
    const overall = await this.prisma.examOverallResult.findUnique({
      where: {
        examSessionId_studentId: {
          examSessionId: dto.examSessionId,
          studentId: dto.studentId,
        },
      },
    });

    // Retrieve Individual Subject Results in this session
    const subjectResults = await this.prisma.examResult.findMany({
      where: {
        studentId: dto.studentId,
        examSchedule: { examSessionId: dto.examSessionId },
      },
      include: {
        examSchedule: {
          include: { subject: true },
        },
        componentMarks: {
          include: { component: true },
        },
      },
      orderBy: { examSchedule: { examDate: 'asc' } },
    });

    // Integrate with Phase 4D Student Attendance Subsystem
    const attendanceRecords = await this.prisma.studentAttendance.findMany({
      where: {
        studentId: dto.studentId,
        date: {
          gte: session.startDate,
          lte: session.endDate,
        },
      },
    });

    const totalDays = attendanceRecords.length;
    const daysPresent = attendanceRecords.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY',
    ).length;
    const daysAbsent = attendanceRecords.filter((a) => a.status === 'ABSENT').length;
    const attendancePercentage =
      totalDays > 0 ? Math.round((daysPresent / totalDays) * 1000) / 10 : 100.0;

    // Upsert ReportCard record
    const reportCard = await this.prisma.reportCard.upsert({
      where: {
        examSessionId_studentId: {
          examSessionId: dto.examSessionId,
          studentId: dto.studentId,
        },
      },
      update: {
        templateId: dto.templateId || null,
        daysPresent,
        daysAbsent,
        attendancePercentage,
        teacherRemarks: dto.teacherRemarks,
        principalRemarks: dto.principalRemarks,
        issueDate: new Date(),
      },
      create: {
        examSessionId: dto.examSessionId,
        studentId: dto.studentId,
        templateId: dto.templateId || null,
        daysPresent,
        daysAbsent,
        attendancePercentage,
        teacherRemarks: dto.teacherRemarks,
        principalRemarks: dto.principalRemarks,
        issueDate: new Date(),
      },
    });

    // Fetch Organization for Letterhead
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const currentEnrollment = student.enrollments[0];

    const assembledReportCard = {
      id: reportCard.id,
      institution: {
        name: org?.name || 'Enterprise School System',
        code: org?.code || 'SCH',
      },
      student: {
        id: student.id,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
        className: currentEnrollment?.class?.name || 'N/A',
        sectionName: currentEnrollment?.section?.name || 'N/A',
      },
      session: {
        id: session.id,
        name: session.name,
        examType: session.examType.name,
        academicYear: session.academicYear.name,
        startDate: session.startDate,
        endDate: session.endDate,
      },
      attendance: {
        totalDays,
        daysPresent,
        daysAbsent,
        attendancePercentage,
      },
      subjects: subjectResults.map((sr) => ({
        subjectId: sr.examSchedule.subjectId,
        subjectName: sr.examSchedule.subject.name,
        maxMarks: Number(sr.examSchedule.maxMarks),
        passingMarks: Number(sr.examSchedule.passingMarks),
        marksObtained: Number(sr.marksObtained),
        percentage: Number(sr.percentage || 0),
        grade: sr.grade,
        gradePoint: sr.gradePoint ? Number(sr.gradePoint) : null,
        isPassed: sr.isPassed,
        isAbsent: sr.isAbsent,
        isExempt: sr.isExempt,
        remarks: sr.remarks,
        components: sr.componentMarks.map((cm) => ({
          name: cm.component.name,
          marksObtained: Number(cm.marksObtained),
          maxMarks: Number(cm.component.maxMarks),
        })),
      })),
      summary: {
        totalMarksObtained: overall ? Number(overall.totalMarksObtained) : 0,
        totalMaxMarks: overall ? Number(overall.totalMaxMarks) : 0,
        percentage: overall ? Number(overall.percentage) : 0,
        grade: overall?.grade || 'N/A',
        gpa: overall?.gpa ? Number(overall.gpa) : null,
        rank: overall?.rank || null,
        resultStatus: overall?.resultStatus || 'PASS',
      },
      remarks: {
        teacher: dto.teacherRemarks || 'Satisfactory academic progress demonstrated this term.',
        principal: dto.principalRemarks || 'Promoted with commendable performance.',
      },
      issueDate: reportCard.issueDate,
    };

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'GENERATE_REPORT_CARD',
      resource: 'REPORT_CARD',
      resourceId: reportCard.id,
      details: { studentId: dto.studentId, sessionId: dto.examSessionId },
    });

    return assembledReportCard;
  }

  async getReportCardById(id: string) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: { id },
      include: {
        examSession: { include: { academicYear: true, examType: true } },
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            enrollments: {
              where: { status: 'ACTIVE' },
              include: { class: true, section: true },
            },
          },
        },
      },
    });
    if (!reportCard) throw new NotFoundException('Report card not found');
    return reportCard;
  }

  // ---------------------------------------------------------------------------
  // Cumulative Multi-Year Transcript
  // ---------------------------------------------------------------------------

  async generateTranscript(user: CurrentUserPayload, dto: GenerateTranscriptDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        enrollments: {
          include: { class: true, section: true, academicYear: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    // Retrieve all historical session overall results for this student
    const overallResults = await this.prisma.examOverallResult.findMany({
      where: { studentId: dto.studentId },
      include: {
        examSession: {
          include: { academicYear: true, examType: true },
        },
        section: { include: { class: true } },
      },
      orderBy: { examSession: { startDate: 'asc' } },
    });

    // Retrieve all historical subject exam results for this student
    const subjectResults = await this.prisma.examResult.findMany({
      where: { studentId: dto.studentId },
      include: {
        examSchedule: {
          include: {
            subject: true,
            academicYear: true,
            examSession: true,
          },
        },
      },
      orderBy: { examSchedule: { examDate: 'asc' } },
    });

    // Compute cumulative GPA
    const validGpas = overallResults
      .map((r) => (r.gpa ? Number(r.gpa) : null))
      .filter((g): g is number => g !== null && g > 0);

    const cumulativeGpa =
      validGpas.length > 0
        ? Math.round((validGpas.reduce((a, b) => a + b, 0) / validGpas.length) * 100) / 100
        : 0;

    const totalCredits = subjectResults.length;

    const transcriptData = {
      studentInfo: {
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        admissionNumber: student.admissionNumber,
      },
      academicHistory: overallResults.map((overall) => {
        const sessionSubjects = subjectResults.filter(
          (sr) => sr.examSchedule.examSessionId === overall.examSessionId,
        );

        return {
          academicYear: overall.examSession.academicYear.name,
          sessionName: overall.examSession.name,
          className: overall.section?.class?.name || 'N/A',
          sectionName: overall.section?.name || 'N/A',
          percentage: Number(overall.percentage),
          grade: overall.grade,
          gpa: overall.gpa ? Number(overall.gpa) : null,
          rank: overall.rank,
          status: overall.resultStatus,
          subjects: sessionSubjects.map((s) => ({
            name: s.examSchedule.subject.name,
            maxMarks: Number(s.examSchedule.maxMarks),
            marksObtained: Number(s.marksObtained),
            percentage: Number(s.percentage || 0),
            grade: s.grade,
            isPassed: s.isPassed,
          })),
        };
      }),
    };

    const transcript = await this.prisma.academicTranscript.create({
      data: {
        organizationId: user.organizationId,
        studentId: dto.studentId,
        issueDate: new Date(),
        cumulativeGpa,
        totalCredits,
        overallOutcome: dto.overallOutcome || 'In Good Academic Standing',
        transcriptData,
        issuedBy: user.id,
      },
    });

    await this.auditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'GENERATE_TRANSCRIPT',
      resource: 'ACADEMIC_TRANSCRIPT',
      resourceId: transcript.id,
      details: { studentId: dto.studentId, cumulativeGpa },
    });

    return transcript;
  }

  async getStudentTranscripts(studentId: string) {
    return this.prisma.academicTranscript.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
