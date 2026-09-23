import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrReportsService } from './hr-reports.service';

@Module({
  controllers: [HrController],
  providers: [HrReportsService],
  exports: [HrReportsService],
})
export class HrModule {}
