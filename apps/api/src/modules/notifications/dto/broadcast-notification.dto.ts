import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Campus Maintenance Notice' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'The main campus library will be closed this Saturday for routine maintenance.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'INFO' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: '/portal/dashboard' })
  @IsString()
  @IsOptional()
  linkUrl?: string;

  @ApiPropertyOptional({ example: 'STUDENT', description: 'Target role code or empty for all users' })
  @IsString()
  @IsOptional()
  targetRole?: string;
}
