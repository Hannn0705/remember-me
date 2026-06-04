import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../email/email.service';
import { PetService } from '../pet/pet.service';
import { CreateCronJobDto, UpdateCronJobDto } from './cron.dto';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly petService: PetService,
  ) {}

  /**
   * Built-in cron job: runs every minute to deliver scheduled letters.
   * Finds letters where scheduledAt <= now and isSent = false,
   * marks them as sent, creates notifications, and sends email alerts.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'letterDelivery' })
  async handleScheduledLetters() {
    this.logger.debug('Checking for scheduled letters to deliver...');

    try {
      const now = new Date();

      const pendingLetters = await this.prisma.letter.findMany({
        where: {
          scheduledAt: { lte: now },
          isSent: false,
          isDraft: false,
        },
        include: {
          sender: { select: { id: true, email: true, nickname: true } },
          receiver: { select: { id: true, email: true, nickname: true } },
        },
      });

      if (pendingLetters.length === 0) {
        return;
      }

      this.logger.log(`Delivering ${pendingLetters.length} scheduled letter(s)`);

      for (const letter of pendingLetters) {
        try {
          // Mark letter as sent
          await this.prisma.letter.update({
            where: { id: letter.id },
            data: {
              isSent: true,
              sentAt: now,
            },
          });

          // Create notification for the receiver
          await this.prisma.notification.create({
            data: {
              userId: letter.receiverId,
              type: 'LETTER_RECEIVED',
              title: '收到一封情书',
              content: `${letter.sender.nickname || letter.sender.email} 给你写了一封情书: ${letter.title}`,
              data: JSON.stringify({
                letterId: letter.id,
                senderId: letter.senderId,
                senderName: letter.sender.nickname || letter.sender.email,
              }),
            },
          });

          // Send email notification to receiver
          try {
            await this.emailService.sendTemplate(letter.receiver.email, 'letter_received', {
              nickname: letter.receiver.nickname || letter.receiver.email,
              senderName: letter.sender.nickname || letter.sender.email,
              letterTitle: letter.title,
            });
          } catch (emailError: any) {
            this.logger.error(
              `Failed to send email notification for letter ${letter.id}: ${emailError.message}`,
            );
          }

          this.logger.log(`Delivered letter ${letter.id} from ${letter.senderId} to ${letter.receiverId}`);
        } catch (letterError: any) {
          this.logger.error(
            `Failed to deliver letter ${letter.id}: ${letterError.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in scheduled letter delivery: ${error.message}`);
    }
  }

  /**
   * Check CronJob table for jobs that need to run.
   * This is a generic cron dispatcher that runs every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'cronJobDispatcher' })
  async handleCronJobs() {
    try {
      const now = new Date();

      const dueJobs = await this.prisma.cronJob.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
        },
      });

      for (const job of dueJobs) {
        this.logger.log(`Executing cron job: ${job.name} (${job.taskType})`);

        try {
          switch (job.taskType) {
            case 'LETTER_DELIVERY':
              // handled by handleScheduledLetters above
              break;

            case 'EMAIL_NOTIFICATION':
              // Generic email notification task
              await this.handleEmailNotificationJob(job);
              break;

            case 'CLEANUP':
              await this.handleCleanupJob(job);
              break;

            default:
              this.logger.warn(`Unknown task type: ${job.taskType} for job: ${job.name}`);
          }

          // Update lastRunAt and calculate nextRunAt
          const nextRun = this.calculateNextRun(job.cronExpr);
          await this.prisma.cronJob.update({
            where: { id: job.id },
            data: {
              lastRunAt: now,
              nextRunAt: nextRun,
            },
          });
        } catch (jobError: any) {
          this.logger.error(`Failed to execute cron job ${job.name}: ${jobError.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in cron job dispatcher: ${error.message}`);
    }
  }

  /**
   * Create a new cron job record.
   */
  async createCronJob(dto: CreateCronJobDto) {
    const existing = await this.prisma.cronJob.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Cron job with this name already exists');
    }

    const nextRun = this.calculateNextRun(dto.cronExpr);

    return this.prisma.cronJob.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        cronExpr: dto.cronExpr,
        taskType: dto.taskType,
        config: dto.config ? JSON.stringify(dto.config) : null,
        nextRunAt: nextRun,
      },
    });
  }

  /**
   * Update a cron job record.
   */
  async updateCronJob(id: string, dto: UpdateCronJobDto) {
    const existing = await this.prisma.cronJob.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Cron job not found');
    }

    const data: any = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.cronExpr !== undefined) data.cronExpr = dto.cronExpr;
    if (dto.taskType !== undefined) data.taskType = dto.taskType;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.config !== undefined) data.config = JSON.stringify(dto.config);

    // Recalculate nextRunAt if cron expression changed
    if (dto.cronExpr && dto.cronExpr !== existing.cronExpr) {
      data.nextRunAt = this.calculateNextRun(dto.cronExpr);
    }

    return this.prisma.cronJob.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a cron job record.
   */
  async deleteCronJob(id: string) {
    const existing = await this.prisma.cronJob.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Cron job not found');
    }

    await this.prisma.cronJob.delete({ where: { id } });
    return { message: 'Cron job deleted successfully' };
  }

  /**
   * List all cron jobs.
   */
  async getCronJobs() {
    return this.prisma.cronJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Toggle a cron job's active state.
   */
  async toggleCronJob(id: string) {
    const existing = await this.prisma.cronJob.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Cron job not found');
    }

    return this.prisma.cronJob.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  // ==================== Private Helpers ====================

  /**
   * Handle generic email notification cron jobs.
   */
  private async handleEmailNotificationJob(job: any) {
    const config = job.config ? JSON.parse(job.config) : {};
    this.logger.log(`Running EMAIL_NOTIFICATION job: ${job.name} with config:`, config);
    // Placeholder: extend with actual email notification logic
  }

  /**
   * Handle cleanup cron jobs (e.g., old logs, expired verifications).
   */
  private async handleCleanupJob(job: any) {
    const config = job.config ? JSON.parse(job.config) : {};
    const retentionDays = config.retentionDays || 90;

    this.logger.log(`Running CLEANUP job: ${job.name}, retention: ${retentionDays} days`);

    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      // Delete old email logs
      const deletedLogs = await this.prisma.emailLog.deleteMany({
        where: { sentAt: { lt: cutoff } },
      });

      // Delete expired email verifications
      const deletedVerifications = await this.prisma.emailVerification.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      this.logger.log(
        `Cleanup complete: ${deletedLogs.count} logs, ${deletedVerifications.count} verifications removed`,
      );
    } catch (error: any) {
      this.logger.error(`Cleanup job failed: ${error.message}`);
    }
  }

  /**
   * Calculate the next run time from a cron expression.
   * Simple approximation using fixed intervals for common expressions.
   */
  private calculateNextRun(cronExpr: string): Date {
    const now = new Date();

    // Map common cron expressions to time offsets
    const intervalMap: Record<string, number> = {
      '* * * * *': 60, // every minute
      '*/5 * * * *': 300, // every 5 minutes
      '*/10 * * * *': 600, // every 10 minutes
      '*/15 * * * *': 900, // every 15 minutes
      '*/30 * * * *': 1800, // every 30 minutes
      '0 * * * *': 3600, // every hour
      '0 */2 * * *': 7200, // every 2 hours
      '0 */3 * * *': 10800, // every 3 hours
      '0 */4 * * *': 14400, // every 4 hours
      '0 */6 * * *': 21600, // every 6 hours
      '0 */12 * * *': 43200, // every 12 hours
      '0 0 * * *': 86400, // daily at midnight
      '0 6 * * *': 86400, // daily at 6 AM
      '0 0 * * 0': 604800, // weekly on Sunday
      '0 0 1 * *': 2592000, // monthly on 1st
    };

    const offsetSeconds = intervalMap[cronExpr] || 3600; // default to 1 hour
    return new Date(now.getTime() + offsetSeconds * 1000);
  }

  /**
   * Pet stat decay: runs every 30 minutes.
   * Decreases hunger, happiness, clean, energy for all pets.
   */
  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'petStatDecay' })
  async handlePetStatDecay() {
    this.logger.debug('Running pet stat decay...');
    try {
      const result = await this.petService.decayStats();
      this.logger.log(`Pet stats decayed: ${result.decayed} pets`);
    } catch (error) {
      this.logger.error('Pet stat decay failed:', error);
    }
  }
}
