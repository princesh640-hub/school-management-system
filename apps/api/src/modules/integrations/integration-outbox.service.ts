// =============================================================================
// Phase 4S: Integration Outbox Service (Transactional Durability)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { QueueService, QueueName } from '../../core/queue/queue.service';

@Injectable()
export class IntegrationOutboxService {
  private readonly logger = new Logger(IntegrationOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Persists an external event to the Outbox table within or alongside a database transaction
   */
  async publishEvent(
    organizationId: string,
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, any>,
  ) {
    const outboxRecord = await this.prisma.integrationOutbox.create({
      data: {
        organizationId,
        eventType,
        aggregateType,
        aggregateId,
        payload,
        status: 'PENDING',
      },
    });

    // Enqueue for asynchronous background delivery via BullMQ
    try {
      await this.queueService.addJob(QueueName.INTEGRATIONS, 'dispatch-outbox-event', {
        outboxId: outboxRecord.id,
        organizationId,
        eventType,
      });
    } catch (err: any) {
      this.logger.warn(`Could not enqueue outbox event to BullMQ, will be polled: ${err.message}`);
    }

    return outboxRecord;
  }

  /**
   * Processes a batch of pending outbox events
   */
  async processPendingOutbox(limit: number = 25): Promise<{ processed: number; failures: number }> {
    const pending = await this.prisma.integrationOutbox.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let processed = 0;
    let failures = 0;

    for (const evt of pending) {
      try {
        await this.prisma.integrationOutbox.update({
          where: { id: evt.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        });
        processed++;
      } catch (err: any) {
        failures++;
        const nextAttempts = evt.attempts + 1;
        const isDead = nextAttempts >= evt.maxAttempts;

        await this.prisma.integrationOutbox.update({
          where: { id: evt.id },
          data: {
            attempts: nextAttempts,
            status: isDead ? 'DEAD_LETTER' : 'FAILED',
            lastError: err.message,
            nextRetryAt: isDead ? null : new Date(Date.now() + Math.pow(2, nextAttempts) * 1000),
          },
        });
      }
    }

    return { processed, failures };
  }
}
