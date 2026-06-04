import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLetterDto {
  @ApiProperty({ example: 'uuid-of-receiver', description: '接收者用户ID' })
  @IsString({ message: '接收者ID必须为字符串' })
  @IsUUID('4', { message: '接收者ID格式不正确' })
  receiverId: string;

  @ApiProperty({ example: '给你的一封信', description: '信件标题' })
  @IsString({ message: '标题必须为字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200, { message: '标题不能超过200个字符' })
  title: string;

  @ApiProperty({ example: '这是信件的正文内容...', description: '信件内容' })
  @IsString({ message: '内容必须为字符串' })
  @MinLength(1, { message: '内容不能为空' })
  @MaxLength(50000, { message: '内容不能超过50000个字符' })
  content: string;

  @ApiPropertyOptional({ example: false, description: '是否存为草稿' })
  @IsOptional()
  @IsBoolean({ message: 'isDraft 必须为布尔值' })
  isDraft?: boolean;

  @ApiPropertyOptional({
    example: '2026-06-10T10:00:00.000Z',
    description: '定时发送时间（ISO格式）',
  })
  @IsOptional()
  @IsDateString({}, { message: '定时发送时间格式不正确' })
  scheduledAt?: string;
}

export class ScheduleLetterDto {
  @ApiProperty({
    example: '2026-06-10T10:00:00.000Z',
    description: '定时发送时间（ISO格式）',
  })
  @IsDateString({}, { message: '定时发送时间格式不正确' })
  scheduledAt: string;
}
