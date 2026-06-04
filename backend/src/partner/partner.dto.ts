import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendPartnerRequestDto {
  @ApiProperty({ example: 'ABC12345', description: '目标用户的伴侣码' })
  @IsString({ message: '伴侣码必须为字符串' })
  @MinLength(1, { message: '伴侣码不能为空' })
  @MaxLength(20, { message: '伴侣码格式不正确' })
  toCode: string;

  @ApiPropertyOptional({ example: '你好，我想和你成为伴侣', description: '附加消息' })
  @IsOptional()
  @IsString({ message: '消息必须为字符串' })
  message?: string;
}
