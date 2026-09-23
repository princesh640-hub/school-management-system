import { IsEnum, IsString, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserLifecycleAction {
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  SUSPEND = 'SUSPEND',
  RESTORE = 'RESTORE',
  ARCHIVE = 'ARCHIVE',
}

export class UserLifecycleDto {
  @ApiProperty({ enum: UserLifecycleAction, example: UserLifecycleAction.SUSPEND })
  @IsEnum(UserLifecycleAction)
  action: UserLifecycleAction;

  @ApiPropertyOptional({ example: 'Violation of institutional administrative policy' })
  @ValidateIf((o) => o.action === UserLifecycleAction.SUSPEND || o.action === UserLifecycleAction.ARCHIVE)
  @IsString()
  reason?: string;
}
