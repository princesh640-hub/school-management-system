import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ example: ['TEACHER', 'CLASS_TEACHER'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleCodes!: string[];
}

export class PermissionOverrideDto {
  @ApiProperty({ example: 'students:delete' })
  @IsString()
  permissionCode!: string;

  @ApiProperty({ example: true, description: 'true = explicitly granted, false = explicitly revoked' })
  isGranted!: boolean;
}
