import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@school/shared-types';

export class AttendanceRecordItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class MarkAttendanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ example: '2026-09-17' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ type: [AttendanceRecordItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordItemDto)
  records: AttendanceRecordItemDto[];
}
