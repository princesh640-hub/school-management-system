// =============================================================================
// Phase 4Q: Printing Module
// =============================================================================
import { Module } from '@nestjs/common';
import { PrintingController } from './printing.controller';
import { PrintingService } from './printing.service';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../../core/queue/queue.module';

@Module({
  imports: [QueueModule, AuditModule],
  controllers: [PrintingController],
  providers: [PrintingService],
  exports: [PrintingService],
})
export class PrintingModule {}
