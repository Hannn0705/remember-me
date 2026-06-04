import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTemplateDto, UpdateTemplateDto, TestSendDto } from './email.dto';

@ApiTags('Admin - Email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get paginated email logs' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.emailService.getEmailLogs(page || 1, limit || 20);
  }

  @Post('resend-failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry all failed emails' })
  async resendFailed() {
    return this.emailService.resendFailed();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all email templates' })
  async getTemplates() {
    return this.emailService.getTemplates();
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new email template' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.emailService.createTemplate(dto);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update an email template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.emailService.updateTemplate(id, dto);
  }

  @Post('test-send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test email' })
  async testSend(
    @Body() dto: TestSendDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    await this.emailService.sendEmail(dto.to, dto.subject, dto.html);
    return { success: true, message: `Test email sent to ${dto.to}` };
  }
}
