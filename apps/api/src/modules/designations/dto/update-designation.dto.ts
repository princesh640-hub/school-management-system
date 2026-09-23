import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecordStatus } from '@school/shared-types';

export class UpdateDesignationDto {
  @ApiPropertyOptional({ example: 'Principal Lecturer' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ enum: RecordStatus })
  @IsEnum(RecordStatus)
  @IsOptional()
  status?: RecordStatus;
}
