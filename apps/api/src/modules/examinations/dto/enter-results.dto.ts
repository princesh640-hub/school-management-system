import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ResultItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: 85.5 })
  @IsNumber()
  @Min(0)
  marksObtained: number;

  @ApiPropertyOptional({ example: 'Excellent performance' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class EnterResultsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  examScheduleId: string;

  @ApiProperty({ type: [ResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultItemDto)
  results: ResultItemDto[];
}
