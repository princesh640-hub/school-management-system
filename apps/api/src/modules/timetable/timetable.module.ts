import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { TimetableConflictService } from './timetable-conflict.service';
import { TimetableSolverService } from './timetable-solver.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [TimetableController],
  providers: [TimetableService, TimetableConflictService, TimetableSolverService],
  exports: [TimetableService, TimetableConflictService],
})
export class TimetableModule {}
