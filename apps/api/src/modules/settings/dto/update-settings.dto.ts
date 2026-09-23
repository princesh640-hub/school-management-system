import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @ApiProperty({ example: 'site_title' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Beacon Horizon Academy' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ example: 'Application display title' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}
