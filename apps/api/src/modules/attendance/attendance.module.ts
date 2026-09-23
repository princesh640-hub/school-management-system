import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { EmployeeAttendanceController } from './employee-attendance.controller';
import { EmployeeAttendanceService } from './employee-attendance.service';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [AttendanceController, EmployeeAttendanceController, LeaveController],
  providers: [AttendanceService, EmployeeAttendanceService, LeaveService],
  exports: [AttendanceService, EmployeeAttendanceService, LeaveService],
})
export class AttendanceModule {}
