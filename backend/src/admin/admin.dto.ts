import { IsString, IsBoolean, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ example: true, description: 'Whether the user account is active' })
  @IsBoolean()
  isActive: boolean;
}

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'ADMIN', enum: ['USER', 'ADMIN'], description: 'User role' })
  @IsString()
  @IsIn(['USER', 'ADMIN'], { message: '角色必须是 USER 或 ADMIN' })
  role: string;
}

export class UpdateConfigDto {
  @ApiProperty({ example: '8080', description: 'Configuration value (stored as JSON string)' })
  @IsString()
  @MinLength(1)
  value: string;
}
