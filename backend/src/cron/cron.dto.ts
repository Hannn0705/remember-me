import { IsString, IsOptional, IsBoolean, IsObject, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCronJobDto {
  @ApiProperty({ example: 'letter-delivery', description: 'Unique name for the cron job' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Deliver scheduled letters every minute', description: 'Job description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '* * * * *', description: 'Cron expression' })
  @IsString()
  @MinLength(1)
  cronExpr: string;

  @ApiProperty({ example: 'LETTER_DELIVERY', description: 'Task type identifier' })
  @IsString()
  @MinLength(1)
  taskType: string;

  @ApiPropertyOptional({
    example: { maxPerRun: 50 },
    description: 'JSON configuration for the task',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateCronJobDto {
  @ApiPropertyOptional({ example: 'Deliver scheduled letters every minute', description: 'Job description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '*/5 * * * *', description: 'Cron expression' })
  @IsOptional()
  @IsString()
  cronExpr?: string;

  @ApiPropertyOptional({ example: 'LETTER_DELIVERY', description: 'Task type identifier' })
  @IsOptional()
  @IsString()
  taskType?: string;

  @ApiPropertyOptional({
    example: { maxPerRun: 100 },
    description: 'JSON configuration for the task',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ example: true, description: 'Whether the job is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
