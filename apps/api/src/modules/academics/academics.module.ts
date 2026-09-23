import { Module } from '@nestjs/common';
import { AcademicsService } from './academics.service';
import { AcademicsController } from './academics.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AcademicsController],
  providers: [AcademicsService],
  exports: [AcademicsService],
})
export class AcademicsModule {}

