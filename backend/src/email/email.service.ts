import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../config/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './email.dto';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private useConsoleTransport = false;

  constructor(private prisma: PrismaService) {
    this.initializeTransporter();
  }

  /**
   * Initialize the nodemailer transporter.
   * If SMTP credentials are not configured, falls back to console logging.
   */
  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: { user, pass },
      });

      this.transporter
        .verify()
        .then(() => this.logger.log('SMTP transporter verified and ready'))
        .catch((err) => {
          this.logger.warn(`SMTP verification failed, falling back to console: ${err.message}`);
          this.transporter = null;
          this.useConsoleTransport = true;
        });
    } else {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). Emails will be logged to console.',
      );
      this.useConsoleTransport = true;
    }
  }

  /**
   * Send an email using the configured transporter or console fallback.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const options: SendEmailOptions = { to, subject, html };

    if (this.useConsoleTransport || !this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Body: ${html.substring(0, 200)}...`);

      await this.logEmail(to, subject, null, 'SENT', null);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `"Remember Me" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });

      await this.logEmail(to, subject, null, 'SENT', null);
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`);
      await this.logEmail(to, subject, null, 'FAILED', errorMessage);
      throw new InternalServerErrorException(`邮件发送失败: ${errorMessage}`);
    }
  }

  /**
   * Send a templated email by rendering the template with provided variables.
   */
  async sendTemplate(
    to: string,
    templateName: string,
    variables: Record<string, any> = {},
  ): Promise<void> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { name: templateName },
    });

    if (!template) {
      this.logger.warn(`Email template "${templateName}" not found. Sending raw.`);
      await this.sendEmail(to, templateName, JSON.stringify(variables));
      return;
    }

    if (!template.isActive) {
      this.logger.warn(`Email template "${templateName}" is inactive. Skipping.`);
      return;
    }

    const subject = this.renderTemplate(template.subject, variables);
    const htmlBody = this.renderTemplate(template.htmlBody, variables);

    if (this.useConsoleTransport || !this.transporter) {
      this.logger.log(`[DEV EMAIL TEMPLATE] To: ${to}`);
      this.logger.log(`[DEV EMAIL TEMPLATE] Template: ${templateName}`);
      this.logger.log(`[DEV EMAIL TEMPLATE] Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL TEMPLATE] Body: ${htmlBody.substring(0, 200)}...`);

      await this.logEmail(to, subject, templateName, 'SENT', null);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `"Remember Me" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlBody,
      });

      await this.logEmail(to, subject, templateName, 'SENT', null);
      this.logger.log(`Template email sent to ${to}: ${subject}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Failed to send template email to ${to}: ${errorMessage}`);
      await this.logEmail(to, subject, templateName, 'FAILED', errorMessage);
      throw new InternalServerErrorException(`邮件发送失败: ${errorMessage}`);
    }
  }

  /**
   * Get paginated email logs.
   */
  async getEmailLogs(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.emailLog.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retry all failed emails.
   */
  async resendFailed(): Promise<{ retried: number }> {
    const failedEmails = await this.prisma.emailLog.findMany({
      where: { status: 'FAILED' },
    });

    let retried = 0;

    for (const email of failedEmails) {
      try {
        // Attempt to resend — we don't have the original HTML body stored,
        // so we try fetching the template if one was used.
        if (email.template) {
          await this.sendTemplate(email.to, email.template);
        } else {
          // Cannot resend without a template reference; mark as informational.
          this.logger.warn(`Cannot resend email to ${email.to}: no template reference.`);
          continue;
        }

        // Update the log entry to SENT
        await this.prisma.emailLog.update({
          where: { id: email.id },
          data: { status: 'SENT', error: null },
        });

        retried++;
      } catch (error: any) {
        this.logger.error(`Retry failed for email ${email.id}: ${error.message}`);
      }
    }

    return { retried };
  }

  /**
   * Get all email templates.
   */
  async getTemplates() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an email template.
   */
  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('邮件模板不存在');
    }

    const data: any = {};
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.htmlBody !== undefined) data.htmlBody = dto.htmlBody;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.variables !== undefined) data.variables = JSON.stringify(dto.variables);

    return this.prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Create a new email template.
   */
  async createTemplate(dto: CreateTemplateDto) {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('模板名称已存在');
    }

    return this.prisma.emailTemplate.create({
      data: {
        name: dto.name,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        variables: JSON.stringify(dto.variables || []),
        isActive: dto.isActive ?? true,
      },
    });
  }

  // ==================== Private Helpers ====================

  /**
   * Log an email send attempt to the database.
   */
  private async logEmail(
    to: string,
    subject: string,
    template: string | null,
    status: string,
    error: string | null,
  ) {
    try {
      await this.prisma.emailLog.create({
        data: { to, subject, template, status, error },
      });
    } catch (dbError: any) {
      this.logger.error(`Failed to write email log: ${dbError.message}`);
    }
  }

  /**
   * Render a template string by replacing {{variable}} placeholders.
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (variables[key] === undefined || variables[key] === null) {
        return match;
      }
      return String(variables[key]);
    });
  }
}
