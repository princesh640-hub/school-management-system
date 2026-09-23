import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';

export class ReviewAdmissionApplicationDto {
  @ApiProperty({ enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'ADMITTED'] })
  @IsEnum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'ADMITTED'])
  status: ApplicationStatus;

  @ApiPropertyOptional({ example: 'Academic records verified. Applicant meets criteria.' })
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @ApiPropertyOptional({ example: 'Passed assessment with 88% score' })
  @IsString()
  @IsOptional()
  decisionReason?: string;
}

export class ConvertAdmissionApplicationDto {
  @ApiPropertyOptional({ description: 'Target Section ID for initial enrollment' })
  @IsString()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional({ description: 'Specific custom admission number if override allowed' })
  @IsString()
  @IsOptional()
  admissionNumber?: string;

  @ApiPropertyOptional({ description: 'Roll number in section' })
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  createGuardianAccount?: boolean;
}
