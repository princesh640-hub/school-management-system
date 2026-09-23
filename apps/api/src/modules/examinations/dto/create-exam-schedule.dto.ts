import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateExamScheduleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ example: 'Mid-Term Exam 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsString()
  @IsNotEmpty()
  examDate: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '11:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  maxMarks: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0)
  passingMarks: number;
}
