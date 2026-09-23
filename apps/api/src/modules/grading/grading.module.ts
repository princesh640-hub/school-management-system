import { Module } from '@nestjs/common';
import { GradingController } from './grading.controller';

@Module({
  controllers: [GradingController],
})
export class GradingModule {}
