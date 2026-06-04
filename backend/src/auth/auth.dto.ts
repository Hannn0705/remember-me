import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ example: 'User@123456' })
  @IsString()
  @MinLength(8, { message: '密码至少8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { message: '密码需要包含大小写字母和数字' })
  password: string;

  @ApiProperty({ example: '小明', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({ example: 'User@123456' })
  @IsString()
  password: string;
}

export class VerifyCodeDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;

  @ApiProperty({ enum: ['REGISTER', 'RESET_PASSWORD'] })
  @IsString()
  @IsIn(['REGISTER', 'RESET_PASSWORD'])
  type: string;
}

export class SendCodeDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['REGISTER', 'RESET_PASSWORD'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['REGISTER', 'RESET_PASSWORD'])
  type?: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
