import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FinancialCalculatorService } from './financial-calculator.service';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicingService } from './invoicing.service';
import { PaymentsService } from './payments.service';
import { RefundsAdjustmentsService } from './refunds-adjustments.service';
import { StudentLedgerService } from './student-ledger.service';
import { FinancialReportsService } from './financial-reports.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [FeesController],
  providers: [
    FeesService,
    FinancialCalculatorService,
    FeeStructuresService,
    InvoicingService,
    PaymentsService,
    RefundsAdjustmentsService,
    StudentLedgerService,
    FinancialReportsService,
  ],
  exports: [
    FeesService,
    FinancialCalculatorService,
    FeeStructuresService,
    InvoicingService,
    PaymentsService,
    RefundsAdjustmentsService,
    StudentLedgerService,
    FinancialReportsService,
  ],
})
export class FeesModule {}
