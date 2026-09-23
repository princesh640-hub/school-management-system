import { Module } from '@nestjs/common';
import { DesignationsController } from './designations.controller';
import { DesignationsService } from './designations.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DesignationsController],
  providers: [DesignationsService],
  exports: [DesignationsService],
})
export class DesignationsModule {}
