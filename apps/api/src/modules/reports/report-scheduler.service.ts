// =============================================================================
// Phase 4R: Report Scheduler Service (BullMQ & Recurring Reports)
// =============================================================================
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { QueueService, QueueName } from '../../core/queue/queue.service';
import { AuditService } from '../audit/audit.service';
import { IScheduledReport, IScheduledReportCreateDto } from '@school/shared-types';

@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly audit: AuditService,
  ) {}

  async listSchedules(orgId: string): Promise<IScheduledReport[]> {
    const records = await this.prisma.scheduledReport.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDto(r));
  }

  async createSchedule(
    orgId: string,
    campusId: string | null,
    userId: string,
    dto: IScheduledReportCreateDto,
  ): Promise<IScheduledReport> {
    const frequency = dto.frequency || 'WEEKLY';
    let cron = dto.cronExpression;
    if (!cron) {
      switch (frequency) {
        case 'DAILY':
          cron = '0 8 * * *';
          break;
        case 'MONTHLY':
          cron = '0 8 1 * *';
          break;
        case 'WEEKLY':
        default:
          cron = '0 8 * * 1';
          break;
      }
    }

    const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const record = await this.prisma.scheduledReport.create({
      data: {
        organizationId: orgId,
        campusId,
        userId,
        savedReportId: dto.savedReportId || null,
        reportKey: dto.reportKey,
        name: dto.name,
        cronExpression: cron,
        frequency,
        format: dto.format || 'CSV',
        filters: dto.filters || {},
        recipients: dto.recipients || [],
        channel: dto.channel || 'EMAIL',
        isActive: true,
        nextRunAt: nextRun,
      },
    });

    // Enqueue initial background registration in BullMQ
    try {
      await this.queueService.addJob(
        QueueName.REPORTS,
        'scheduled-report-registered',
        {
          scheduleId: record.id,
          orgId,
          reportKey: record.reportKey,
          cronExpression: record.cronExpression,
          recipients: record.recipients,
        },
      );
    } catch (err: any) {
      this.logger.warn(`Could not enqueue schedule job: ${err.message}`);
    }

    await this.audit.logAction({
      action: 'SCHEDULED_REPORT_CREATED',
      entity: 'ScheduledReport',
      entityId: record.id,
      userId,
      orgId,
      details: { name: record.name, frequency: record.frequency, cron },
    });

    return this.mapToDto(record);
  }

  async updateSchedule(
    orgId: string,
    id: string,
    dto: Partial<IScheduledReportCreateDto> & { isActive?: boolean },
  ): Promise<IScheduledReport> {
    const existing = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException(`Scheduled report ${id} not found`);
    }

    const updated = await this.prisma.scheduledReport.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.frequency ? { frequency: dto.frequency } : {}),
        ...(dto.cronExpression ? { cronExpression: dto.cronExpression } : {}),
        ...(dto.format ? { format: dto.format } : {}),
        ...(dto.filters ? { filters: dto.filters } : {}),
        ...(dto.recipients ? { recipients: dto.recipients } : {}),
        ...(dto.channel ? { channel: dto.channel } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.mapToDto(updated);
  }

  async triggerImmediateRun(orgId: string, id: string, userId: string): Promise<{ jobId: string; status: string }> {
    const schedule = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!schedule) {
      throw new NotFoundException(`Scheduled report ${id} not found`);
    }

    const job = await this.queueService.addJob(
      QueueName.REPORTS,
      'execute-scheduled-report',
      {
        scheduleId: schedule.id,
        orgId,
        reportKey: schedule.reportKey,
        format: schedule.format,
        recipients: schedule.recipients,
        triggeredBy: userId,
      },
    );

    await this.prisma.scheduledReport.update({
      where: { id },
      data: { lastRunAt: new Date(), lastRunStatus: 'QUEUED' },
    });

    return {
      jobId: job?.id || 'immediate-run',
      status: 'QUEUED',
    };
  }

  async deleteSchedule(orgId: string, id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException(`Scheduled report ${id} not found`);
    }

    await this.prisma.scheduledReport.delete({ where: { id } });
    return { success: true };
  }

  private mapToDto(r: any): IScheduledReport {
    return {
      id: r.id,
      organizationId: r.organizationId,
      campusId: r.campusId,
      userId: r.userId,
      savedReportId: r.savedReportId,
      reportKey: r.reportKey,
      name: r.name,
      cronExpression: r.cronExpression,
      frequency: r.frequency,
      format: r.format,
      filters: r.filters as Record<string, any>,
      recipients: r.recipients as string[],
      channel: r.channel,
      isActive: r.isActive,
      lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
      nextRunAt: r.nextRunAt ? r.nextRunAt.toISOString() : null,
      lastRunStatus: r.lastRunStatus,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
