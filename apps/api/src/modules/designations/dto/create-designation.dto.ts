import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDesignationDto {
  @ApiProperty({ example: 'Senior Lecturer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'SNR_LECTURER' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'Senior level teaching faculty' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'dept-uuid' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
