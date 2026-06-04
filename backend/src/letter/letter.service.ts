import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLetterDto } from './letter.dto';

@Injectable()
export class LetterService {
  private readonly logger = new Logger(LetterService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a letter (draft, send immediately, or schedule for later).
   */
  async createLetter(senderId: string, dto: CreateLetterDto) {
    // Validate receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
      select: { id: true, nickname: true },
    });
    if (!receiver) {
      throw new NotFoundException('接收者用户不存在');
    }

    // Cannot send letter to self
    if (senderId === dto.receiverId) {
      throw new BadRequestException('不能给自己写信');
    }

    const isDraft = dto.isDraft ?? false;
    const isScheduled = !!dto.scheduledAt && !isDraft;
    const sendImmediately = !isDraft && !isScheduled;

    const letter = await this.prisma.letter.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        title: dto.title,
        content: dto.content,
        isDraft,
        isSent: sendImmediately,
        scheduledAt: isScheduled && dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        sentAt: sendImmediately ? new Date() : null,
      },
      include: {
        sender: { select: { id: true, nickname: true, avatarUrl: true } },
        receiver: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    // Create notification if sent immediately
    if (sendImmediately) {
      await this.prisma.notification.create({
        data: {
          userId: dto.receiverId,
          type: 'LETTER_RECEIVED',
          title: '收到一封新信件',
          content: `${letter.sender.nickname || '对方'} 给你写了一封信：《${letter.title}》`,
          data: JSON.stringify({ letterId: letter.id }),
        },
      });
      this.logger.log(
        `Letter sent immediately: ${letter.id} from ${senderId} to ${dto.receiverId}`,
      );
    } else if (isScheduled) {
      this.logger.log(`Letter scheduled: ${letter.id} for ${dto.scheduledAt}`);
    } else {
      this.logger.log(`Letter saved as draft: ${letter.id}`);
    }

    return letter;
  }

  /**
   * Schedule an existing draft/letter for future delivery.
   */
  async scheduleLetter(senderId: string, letterId: string, scheduledAt: string) {
    const letter = await this.prisma.letter.findUnique({
      where: { id: letterId },
    });
    if (!letter) {
      throw new NotFoundException('信件不存在');
    }
    if (letter.senderId !== senderId) {
      throw new ForbiddenException('无权操作此信件');
    }
    if (letter.isSent) {
      throw new BadRequestException('信件已发送，无法重新定时');
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('定时时间必须在当前时间之后');
    }

    const updated = await this.prisma.letter.update({
      where: { id: letterId },
      data: {
        scheduledAt: scheduledDate,
        isDraft: false,
        isSent: false,
      },
    });

    this.logger.log(`Letter scheduled: ${letterId} at ${scheduledAt}`);

    return updated;
  }

  /**
   * Get received letters (inbox). Shows letters that have been sent
   * or are past their scheduled time. Excludes drafts and future-scheduled letters.
   */
  async getInbox(userId: string) {
    const letters = await this.prisma.letter.findMany({
      where: {
        receiverId: userId,
        isDraft: false,
        OR: [{ isSent: true }, { scheduledAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    return letters;
  }

  /**
   * Get sent letters (outbox), including drafts, sent, and scheduled letters.
   */
  async getOutbox(userId: string) {
    const letters = await this.prisma.letter.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        receiver: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    return letters;
  }

  /**
   * Get a single letter by ID. The requesting user must be the sender or receiver.
   */
  async getLetter(letterId: string, userId: string) {
    const letter = await this.prisma.letter.findUnique({
      where: { id: letterId },
      include: {
        sender: { select: { id: true, nickname: true, avatarUrl: true } },
        receiver: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    if (!letter) {
      throw new NotFoundException('信件不存在');
    }

    // Verify access: must be sender or receiver
    if (letter.senderId !== userId && letter.receiverId !== userId) {
      throw new ForbiddenException('无权查看此信件');
    }

    return letter;
  }

  async markAsRead(letterId: string, userId: string) {
    const letter = await this.prisma.letter.findUnique({
      where: { id: letterId },
      select: { id: true, receiverId: true },
    });

    if (!letter) {
      throw new NotFoundException('信件不存在');
    }

    if (letter.receiverId !== userId) {
      throw new ForbiddenException('无权操作此信件');
    }

    await this.prisma.letter.update({
      where: { id: letterId },
      data: { isRead: true },
    });

    return { message: '已标记为已读' };
  }

  /**
   * Delete a letter. The requesting user must be the sender or receiver.
   *
   * NOTE: This performs a hard delete. For soft-delete support, add a
   * `deletedAt DateTime?` field to the Letter model in schema.prisma,
   * run `npx prisma generate`, then change this method to set `deletedAt`
   * instead of calling `delete()`.
   */
  async deleteLetter(letterId: string, userId: string) {
    const letter = await this.prisma.letter.findUnique({
      where: { id: letterId },
      select: { id: true, senderId: true, receiverId: true },
    });

    if (!letter) {
      throw new NotFoundException('信件不存在');
    }

    // Verify access: must be sender or receiver
    if (letter.senderId !== userId && letter.receiverId !== userId) {
      throw new ForbiddenException('无权删除此信件');
    }

    await this.prisma.letter.delete({
      where: { id: letterId },
    });

    this.logger.log(`Letter deleted: ${letterId} by user ${userId}`);

    return { message: '信件已删除' };
  }

  /**
   * Get letters that are ready to be delivered by the cron job
   * (scheduledAt <= now, not draft, not yet sent).
   */
  async getScheduledLetters() {
    const letters = await this.prisma.letter.findMany({
      where: {
        isDraft: false,
        isSent: false,
        scheduledAt: {
          not: null,
          lte: new Date(),
        },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        sender: { select: { id: true, nickname: true, avatarUrl: true } },
        receiver: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    return letters;
  }

  /**
   * Mark a letter as sent. Called by the cron job after delivery.
   * Also creates a notification for the receiver.
   */
  async markAsSent(letterId: string) {
    const letter = await this.prisma.letter.findUnique({
      where: { id: letterId },
      select: { id: true, isSent: true, senderId: true, receiverId: true, title: true },
    });

    if (!letter) {
      throw new NotFoundException('信件不存在');
    }
    if (letter.isSent) {
      throw new BadRequestException('信件已发送');
    }

    const updated = await this.prisma.letter.update({
      where: { id: letterId },
      data: {
        isSent: true,
        sentAt: new Date(),
      },
    });

    // Look up sender nickname for the notification
    const sender = await this.prisma.user.findUnique({
      where: { id: letter.senderId },
      select: { nickname: true },
    });

    await this.prisma.notification.create({
      data: {
        userId: letter.receiverId,
        type: 'LETTER_RECEIVED',
        title: '收到一封新信件',
        content: `${sender?.nickname || '对方'} 给你写了一封信：《${letter.title}》`,
        data: JSON.stringify({ letterId: letter.id }),
      },
    });

    this.logger.log(`Letter marked as sent: ${letterId}`);

    return updated;
  }
}
