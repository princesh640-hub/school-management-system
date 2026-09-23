// =============================================================================
// Phase 4K: Hostel Management Module
// =============================================================================
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { HostelController } from './hostel.controller';
import { HostelStructureService } from './hostel-structure.service';
import { HostelAllocationService } from './hostel-allocation.service';
import { HostelAttendanceService } from './hostel-attendance.service';
import { HostelMovementService } from './hostel-movement.service';
import { HostelOperationsService } from './hostel-operations.service';
import { HostelReportsService } from './hostel-reports.service';

@Module({
  imports: [AuditModule],
  controllers: [HostelController],
  providers: [
    HostelStructureService,
    HostelAllocationService,
    HostelAttendanceService,
    HostelMovementService,
    HostelOperationsService,
    HostelReportsService,
  ],
  exports: [
    HostelStructureService,
    HostelAllocationService,
    HostelAttendanceService,
    HostelMovementService,
    HostelOperationsService,
    HostelReportsService,
  ],
})
export class HostelModule {}
