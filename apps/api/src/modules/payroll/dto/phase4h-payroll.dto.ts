import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SalaryComponentType,
  SalaryCalculationType,
} from '@school/shared-types';

export class CreateSalaryComponentInputDto {
  @ApiProperty({ example: 'Housing Allowance' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['ALLOWANCE', 'DEDUCTION'], example: 'ALLOWANCE' })
  @IsNotEmpty()
  type: SalaryComponentType;

  @ApiProperty({ enum: ['FIXED', 'PERCENTAGE_OF_BASE'], example: 'FIXED' })
  @IsNotEmpty()
  calculationType: SalaryCalculationType;

  @ApiProperty({ example: 450.0 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isTaxable?: boolean;
}

export class CreateSalaryStructureDto {
  @ApiProperty({ example: 'Senior Faculty Teaching Scale' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SCALE-FACULTY-SR' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 4500.0 })
  @IsNumber()
  @Min(0)
  baseSalary: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'MONTHLY', default: 'MONTHLY' })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiPropertyOptional({ example: 'Standard compensation for senior secondary faculty' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [CreateSalaryComponentInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalaryComponentInputDto)
  @IsOptional()
  components?: CreateSalaryComponentInputDto[];
}

export class AssignSalaryStructureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  salaryStructureId: string;

  @ApiPropertyOptional({ example: 4800.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  baseSalaryOverride?: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsString()
  @IsNotEmpty()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2027-08-31' })
  @IsString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: 'Annual increment promotion' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreatePayrollPeriodDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campusId?: string;

  @ApiProperty({ example: 'October 2026 Payroll' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-10-31' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsString()
  @IsOptional()
  paymentDate?: string;
}

export class ProcessPayrollRunDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payrollPeriodId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campusId?: string;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  dailyRateDenominator?: number;
}

export class CreatePayrollAdjustmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeRecordId: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: ['EARNING', 'DEDUCTION'], example: 'EARNING' })
  @IsNotEmpty()
  type: 'EARNING' | 'DEDUCTION';

  @ApiProperty({ example: 'Supervised science fair weekend event' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateEmployeeLoanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 2400.0 })
  @IsNumber()
  @Min(1)
  principalAmount: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  repaymentTermMonths: number;

  @ApiPropertyOptional({ example: 'Emergency medical advance' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RecordLoanRepaymentDto {
  @ApiProperty({ example: 200.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'DIRECT_CASH', default: 'PAYROLL_DEDUCTION' })
  @IsString()
  @IsOptional()
  repaymentMethod?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
