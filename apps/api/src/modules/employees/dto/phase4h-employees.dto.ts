import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
  IsEnum,
  IsArray,
} from 'class-validator';
import { EmployeeLifecycleStatus } from '@school/shared-types';

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  preferredName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  designationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  employmentType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nationalId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  emergencyContactRelation?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  qualifications?: string[];

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  experienceYears?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @ApiPropertyOptional({ example: 4500.0 })
  @IsNumber()
  @IsOptional()
  salaryBase?: number;
}

export class ChangeEmployeeStatusDto {
  @ApiProperty({
    enum: [
      'APPLICANT',
      'ON_PROBATION',
      'ACTIVE',
      'CONFIRMED',
      'ON_LEAVE',
      'SUSPENDED',
      'RESIGNED',
      'TERMINATED',
      'RETIRED',
      'INACTIVE',
      'ARCHIVED',
    ],
  })
  @IsNotEmpty()
  newStatus: EmployeeLifecycleStatus;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsString()
  @IsOptional()
  effectiveDate?: string;

  @ApiProperty({ example: 'Completed 6 months probation with excellent evaluation' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateContractDto {
  @ApiProperty({ example: 'FULL_TIME' })
  @IsString()
  @IsOptional()
  contractType?: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ example: '2027-08-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'One-year renewable academic faculty contract' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ example: '2027-07-01' })
  @IsString()
  @IsOptional()
  renewalDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  documentUrl?: string;
}

export class UploadEmployeeDocumentDto {
  @ApiProperty({ example: 'Master Degree Certificate' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'QUALIFICATION',
    enum: ['CONTRACT', 'QUALIFICATION', 'IDENTITY', 'EXPERIENCE', 'APPOINTMENT_LETTER', 'DISCIPLINARY', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiProperty({ example: 'https://minio.school.internal/hr/doc-9812.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional({ example: 1048576 })
  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ example: '2024-06-15' })
  @IsString()
  @IsOptional()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Verified original verified by HR' })
  @IsString()
  @IsOptional()
  notes?: string;
}
