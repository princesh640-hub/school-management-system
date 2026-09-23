import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Science & Mathematics' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SCI-MATH' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'campus-uuid' })
  @IsString()
  @IsOptional()
  campusId?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Science & Computing' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'campus-uuid' })
  @IsString()
  @IsOptional()
  campusId?: string;
}
