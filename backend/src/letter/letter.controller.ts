import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LetterService } from './letter.service';
import { CreateLetterDto, ScheduleLetterDto } from './letter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Letters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('letters')
export class LetterController {
  constructor(private letterService: LetterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建信件（草稿/立即发送/定时发送）' })
  async createLetter(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLetterDto,
  ) {
    return this.letterService.createLetter(userId, dto);
  }

  @Get('inbox')
  @ApiOperation({ summary: '获取收到的信件' })
  async getInbox(@CurrentUser('id') userId: string) {
    return this.letterService.getInbox(userId);
  }

  @Get('outbox')
  @ApiOperation({ summary: '获取发出的信件' })
  async getOutbox(@CurrentUser('id') userId: string) {
    return this.letterService.getOutbox(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单封信件详情' })
  async getLetter(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.letterService.getLetter(id, userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记信件为已读' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.letterService.markAsRead(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除信件' })
  async deleteLetter(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.letterService.deleteLetter(id, userId);
  }

  @Post(':id/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '定时发送信件' })
  async scheduleLetter(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ScheduleLetterDto,
  ) {
    return this.letterService.scheduleLetter(userId, id, dto.scheduledAt);
  }
}
