import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Gender, RecordStatus } from '@school/shared-types';

export class CreateUserDto {
  @ApiProperty({ example: 'staff.member@school.edu' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'TemporaryPass123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ example: '+1-555-0188' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Gender, default: Gender.OTHER })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'c1234567-89ab-cdef-0123-456789abcdef' })
  @IsOptional()
  @IsUUID()
  campusId?: string;

  @ApiPropertyOptional({ example: ['TEACHER'], type: [String] })
  @IsOptional()
  roleCodes?: string[];
}
