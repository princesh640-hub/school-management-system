// =============================================================================
// Phase 4O: Student Portal Module
// =============================================================================
import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentAuthService } from './student-auth.service';
import { StudentDashboardService } from './student-dashboard.service';
import { StudentProfileService } from './student-profile.service';
import { StudentAcademicService } from './student-academic.service';
import { StudentFinanceService } from './student-finance.service';
import { StudentServicesService } from './student-services.service';
import { StudentCommunicationService } from './student-communication.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [StudentController],
  providers: [
    StudentAuthService,
    StudentDashboardService,
    StudentProfileService,
    StudentAcademicService,
    StudentFinanceService,
    StudentServicesService,
    StudentCommunicationService,
  ],
  exports: [
    StudentAuthService,
    StudentDashboardService,
    StudentProfileService,
    StudentAcademicService,
    StudentFinanceService,
    StudentServicesService,
    StudentCommunicationService,
  ],
})
export class StudentModule {}
