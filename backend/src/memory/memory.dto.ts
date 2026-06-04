import {
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStarDto {
  @ApiProperty({ description: '日期 (ISO 8601)', example: '2024-06-15' })
  @IsDateString({}, { message: '请提供有效的日期格式' })
  date: string;

  @ApiPropertyOptional({ description: '星星标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '心情 (emoji 或文字)', example: 'happy' })
  @IsOptional()
  @IsString()
  mood?: string;

  @ApiPropertyOptional({ description: '星星颜色 (HEX)', example: '#FFD700' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateStarDto {
  @ApiPropertyOptional({ description: '星星标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '心情 (emoji 或文字)', example: 'happy' })
  @IsOptional()
  @IsString()
  mood?: string;

  @ApiPropertyOptional({ description: '星星颜色 (HEX)', example: '#FF6B6B' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '是否锁定（锁定后不可编辑）' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

export class AddMemoryDto {
  @ApiPropertyOptional({ description: '记忆文字内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '语音记录 URL' })
  @IsOptional()
  @IsString()
  voiceUrl?: string;
}
