import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty } from 'class-validator';

export class GenerateInvoicesDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feeStructureId: string;

  @ApiProperty({ type: [String], example: ['student-uuid-1'] })
  @IsArray()
  @ArrayNotEmpty()
  studentIds: string[];

  @ApiProperty({ example: '2026-10-31' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;
}
