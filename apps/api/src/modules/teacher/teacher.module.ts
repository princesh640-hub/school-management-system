// =============================================================================
// Phase 4P: Teacher Portal Module
// =============================================================================
import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherAuthService } from './teacher-auth.service';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeacherClassesService } from './teacher-classes.service';
import { TeacherAcademicsService } from './teacher-academics.service';
import { TeacherSelfServiceService } from './teacher-self-service.service';
import { TeacherCommunicationService } from './teacher-communication.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ExaminationsModule } from '../examinations/examinations.module';

@Module({
  imports: [
    AuditModule,
    NotificationsModule,
    AttendanceModule,
    ExaminationsModule,
  ],
  controllers: [TeacherController],
  providers: [
    TeacherAuthService,
    TeacherDashboardService,
    TeacherClassesService,
    TeacherAcademicsService,
    TeacherSelfServiceService,
    TeacherCommunicationService,
  ],
  exports: [
    TeacherAuthService,
    TeacherDashboardService,
    TeacherClassesService,
    TeacherAcademicsService,
  ],
})
export class TeacherModule {}
