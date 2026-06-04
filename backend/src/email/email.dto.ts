import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'welcome', description: 'Template name (unique identifier)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Welcome to Remember Me!', description: 'Email subject line' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    example: '<h1>Welcome {{nickname}}!</h1><p>Thank you for joining.</p>',
    description: 'HTML body with template variables',
  })
  @IsString()
  htmlBody: string;

  @ApiPropertyOptional({
    example: ['nickname', 'link'],
    description: 'Array of variable names used in the template',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ example: true, description: 'Whether the template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Welcome to Remember Me!', description: 'Email subject line' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({
    example: '<h1>Welcome {{nickname}}!</h1><p>Thank you for joining.</p>',
    description: 'HTML body with template variables',
  })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional({
    example: ['nickname', 'link'],
    description: 'Array of variable names used in the template',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ example: true, description: 'Whether the template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TestSendDto {
  @ApiProperty({ example: 'user@example.com', description: 'Recipient email address' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  to: string;

  @ApiProperty({ example: 'Test Subject', description: 'Email subject' })
  @IsString()
  @MinLength(1)
  subject: string;

  @ApiProperty({
    example: '<h1>Test</h1><p>This is a test email.</p>',
    description: 'HTML body content',
  })
  @IsString()
  @MinLength(1)
  html: string;
}
