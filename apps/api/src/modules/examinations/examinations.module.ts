import { Module } from '@nestjs/common';
import { ExaminationsController } from './examinations.controller';
import { ExaminationsService } from './examinations.service';
import { GradingEngineService } from './grading-engine.service';
import { ExamSessionsService } from './exam-sessions.service';
import { MarksEntryService } from './marks-entry.service';
import { ResultProcessingService } from './result-processing.service';
import { ReportCardService } from './report-card.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ExaminationsController],
  providers: [
    ExaminationsService,
    GradingEngineService,
    ExamSessionsService,
    MarksEntryService,
    ResultProcessingService,
    ReportCardService,
  ],
  exports: [
    ExaminationsService,
    GradingEngineService,
    ExamSessionsService,
    MarksEntryService,
    ResultProcessingService,
    ReportCardService,
  ],
})
export class ExaminationsModule {}
