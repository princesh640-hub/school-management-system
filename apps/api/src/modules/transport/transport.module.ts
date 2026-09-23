// =============================================================================
// Phase 4J: Transport Management Module
// =============================================================================
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TransportController } from './transport.controller';
import { TransportFacilityService, VehicleService } from './transport-vehicles.service';
import { TransportPersonnelService } from './transport-personnel.service';
import { TransportRoutesService } from './transport-routes.service';
import { TransportScheduleService } from './transport-schedule.service';
import { TransportMaintenanceService } from './transport-maintenance.service';
import { TransportReportsService } from './transport-reports.service';

@Module({
  imports: [AuditModule],
  controllers: [TransportController],
  providers: [
    TransportFacilityService,
    VehicleService,
    TransportPersonnelService,
    TransportRoutesService,
    TransportScheduleService,
    TransportMaintenanceService,
    TransportReportsService,
  ],
  exports: [
    TransportFacilityService,
    VehicleService,
    TransportPersonnelService,
    TransportRoutesService,
    TransportScheduleService,
    TransportMaintenanceService,
    TransportReportsService,
  ],
})
export class TransportModule {}
