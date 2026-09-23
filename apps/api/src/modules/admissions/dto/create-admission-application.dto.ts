import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class CreateAdmissionApplicationDto {
  @ApiProperty({ description: 'Campus ID' })
  @IsString()
  @IsNotEmpty()
  campusId: string;

  @ApiProperty({ description: 'Academic Year ID' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({ description: 'Class ID' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE', 'OTHER'], example: 'MALE' })
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender: Gender;

  @ApiProperty({ example: '2012-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '123 School Lane' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Greenwood Elementary' })
  @IsString()
  @IsOptional()
  previousSchool?: string;

  @ApiPropertyOptional({ example: 'Grade 4' })
  @IsString()
  @IsOptional()
  previousGrade?: string;

  @ApiProperty({ example: 'Robert Doe' })
  @IsString()
  @IsNotEmpty()
  guardianName: string;

  @ApiProperty({ example: 'Father' })
  @IsString()
  @IsNotEmpty()
  guardianRelation: string;

  @ApiProperty({ example: '+1987654321' })
  @IsString()
  @IsNotEmpty()
  guardianPhone: string;

  @ApiPropertyOptional({ example: 'robert.doe@example.com' })
  @IsEmail()
  @IsOptional()
  guardianEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  guardianAddress?: string;

  @ApiPropertyOptional({ example: 'Civil Engineer' })
  @IsString()
  @IsOptional()
  guardianOccupation?: string;
}
