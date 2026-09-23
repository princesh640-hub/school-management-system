// =============================================================================
// Phase 4L: Procurement Management Module
// =============================================================================
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementSuppliersService } from './procurement-suppliers.service';
import { ProcurementRequestsService } from './procurement-requests.service';
import { ProcurementOrdersService } from './procurement-orders.service';
import { ProcurementReceiptsService } from './procurement-receipts.service';
import { ProcurementReportsService } from './procurement-reports.service';

@Module({
  imports: [AuditModule],
  controllers: [ProcurementController],
  providers: [
    ProcurementSuppliersService,
    ProcurementRequestsService,
    ProcurementOrdersService,
    ProcurementReceiptsService,
    ProcurementReportsService,
  ],
  exports: [
    ProcurementSuppliersService,
    ProcurementRequestsService,
    ProcurementOrdersService,
    ProcurementReceiptsService,
    ProcurementReportsService,
  ],
})
export class ProcurementModule {}
