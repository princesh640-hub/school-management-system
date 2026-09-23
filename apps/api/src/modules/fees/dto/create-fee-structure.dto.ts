import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateFeeStructureDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campusId: string;

  @ApiProperty({ example: 'Tuition Fee - Grade 10' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 450.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'MONTHLY' })
  @IsString()
  @IsNotEmpty()
  frequency: string;
}
