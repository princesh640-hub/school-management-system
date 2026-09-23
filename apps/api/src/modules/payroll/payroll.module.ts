import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { SalaryStructuresService } from './salary-structures.service';
import { LoansService } from './loans.service';
import { PayslipsService } from './payslips.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [PayrollController],
  providers: [
    PayrollCalculatorService,
    SalaryStructuresService,
    LoansService,
    PayrollService,
    PayslipsService,
  ],
  exports: [
    PayrollCalculatorService,
    SalaryStructuresService,
    LoansService,
    PayrollService,
    PayslipsService,
  ],
})
export class PayrollModule {}
