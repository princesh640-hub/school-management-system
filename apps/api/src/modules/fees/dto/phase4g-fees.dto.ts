import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import {
  FeeFrequency,
  DiscountType,
  LateFeeType,
  AdjustmentType,
} from '@school/shared-types';

export class CreateFeeCategoryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campusId?: string;

  @ApiProperty({ example: 'Tuition Fees' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'TUITION' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'Regular academic tuition fees' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateExtendedFeeStructureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campusId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  feeCategoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiProperty({ example: 'Senior Secondary Tuition' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1250.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'MONTHLY' })
  @IsString()
  @IsNotEmpty()
  frequency: FeeFrequency | string;

  @ApiPropertyOptional({ example: 'Grade 11 & 12 standard monthly tuition' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateFeeScheduleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campusId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feeStructureId: string;

  @ApiProperty({ example: 'October 2026 Tuition Schedule' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsString()
  @IsNotEmpty()
  billingDate: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ enum: ['FIXED', 'DAILY_RATE', 'PERCENTAGE'], default: 'FIXED' })
  @IsOptional()
  lateFeeType?: LateFeeType;

  @ApiPropertyOptional({ example: 25.0, default: 0 })
  @IsNumber()
  @IsOptional()
  lateFeeValue?: number;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsNumber()
  @IsOptional()
  graceDays?: number;

  @ApiPropertyOptional({ example: 100.0 })
  @IsNumber()
  @IsOptional()
  maxLateFee?: number;
}

export class CreateFeeDiscountDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campusId?: string;

  @ApiProperty({ example: 'Merit Scholarship 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MERIT-25' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'SCHOLARSHIP', 'SIBLING_CONCESSION', 'SPECIAL_WAIVER'] })
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({ example: 25.0 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 'Academic excellence discount' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  validUntil?: string;
}

export class AssignStudentFeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feeStructureId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  feeDiscountId?: string;

  @ApiPropertyOptional({ example: 950.0 })
  @IsNumber()
  @IsOptional()
  customAmount?: number;

  @ApiPropertyOptional({ example: 'Granted sibling fee rate' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class InvoiceLineItemInputDto {
  @ApiProperty({ example: 'Tuition Base' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 1200.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  quantity?: number;
}

export class GenerateSingleInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feeStructureId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ example: '2026-11-15' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ type: [InvoiceLineItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemInputDto)
  @IsOptional()
  lineItems?: InvoiceLineItemInputDto[];

  @ApiPropertyOptional({ example: 100.0 })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiPropertyOptional({ enum: ['FIXED', 'DAILY_RATE', 'PERCENTAGE'] })
  @IsOptional()
  lateFeeType?: LateFeeType;

  @ApiPropertyOptional({ example: 20.0 })
  @IsNumber()
  @IsOptional()
  lateFeeValue?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @IsOptional()
  graceDays?: number;

  @ApiPropertyOptional({ example: 'Term 1 comprehensive invoice' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ProcessPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feeInvoiceId: string;

  @ApiProperty({ example: 450.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN-984210' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Tuition payment received' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ example: 'idem-key-83921' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cashierShiftId?: string;
}

export class RequestRefundDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentTransactionId: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Course fee waived by principal' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewRefundDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ example: 'Approved after verification of receipt' })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}

export class CreateFeeAdjustmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  feeInvoiceId: string;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT', 'CORRECTION', 'WAIVER'] })
  @IsNotEmpty()
  type: AdjustmentType;

  @ApiProperty({ example: 50.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Library late return fine waiver' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class OpenCashierShiftDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campusId?: string;

  @ApiProperty({ example: 200.0, default: 0 })
  @IsNumber()
  @Min(0)
  openingBalance: number;
}

export class CloseCashierShiftDto {
  @ApiProperty({ example: 1450.0 })
  @IsNumber()
  @Min(0)
  closingBalance: number;

  @ApiPropertyOptional({ example: 'Shift balanced without discrepancy' })
  @IsString()
  @IsOptional()
  notes?: string;
}
