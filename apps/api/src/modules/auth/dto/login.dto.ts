import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@school.edu', description: 'User account email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User account password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', required: false })
  @IsOptional()
  @IsUUID()
  campusId?: string;
}
