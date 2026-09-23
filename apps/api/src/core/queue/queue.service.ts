import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export enum QueueName {
  REPORTS = 'queue:reports',
  NOTIFICATIONS = 'queue:notifications',
  EMAILS = 'queue:emails',
  SMS = 'queue:sms',
  PUSH = 'queue:push',
  WHATSAPP = 'queue:whatsapp',
  COMMUNICATIONS = 'queue:communications',
  PAYROLL = 'queue:payroll',
  FILE_PROCESSING = 'queue:file-processing',
  DOCUMENT_GENERATION = 'queue:document-generation',
  INTEGRATIONS = 'queue:integrations',
  WEBHOOKS = 'queue:webhooks',
  DATA_EXCHANGE = 'queue:data-exchange',
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('redis.host', 'localhost');
    const port = this.config.get<number>('redis.port', 6379);
    const password = this.config.get<string | undefined>('redis.password');

    const connection = {
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
    };

    // Initialize core queues
    Object.values(QueueName).forEach((qName) => {
      try {
        const q = new Queue(qName, { connection });
        q.on('error', (err) => {
          this.logger.warn(`Queue ${qName} connection deferred: ${err.message}`);
        });
        this.queues.set(qName, q);
      } catch (err: any) {
        this.logger.warn(`Could not initialize queue ${qName}: ${err.message}`);
      }
    });

    this.logger.log(`Initialized ${this.queues.size} BullMQ background job queues`);
  }

  getQueue(name: QueueName): Queue | undefined {
    return this.queues.get(name);
  }

  async addJob<T = Record<string, unknown>>(
    queueName: QueueName,
    jobName: string,
    data: T,
    opts?: { delay?: number; priority?: number; attempts?: number },
  ) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.warn(`Queue ${queueName} not found, job ${jobName} skipped`);
      return;
    }

    return queue.add(jobName, data, {
      attempts: opts?.attempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      delay: opts?.delay,
      priority: opts?.priority,
    });
  }
}
