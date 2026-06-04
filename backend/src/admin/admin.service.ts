import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard statistics: counts of users, stars, letters, emails, errors.
   */
  async getDashboard() {
    const [
      totalUsers,
      activeUsers,
      totalStars,
      totalLetters,
      lettersSent,
      lettersScheduled,
      emailsSent,
      emailsFailed,
      totalNotifications,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.star.count(),
      this.prisma.letter.count(),
      this.prisma.letter.count({ where: { isSent: true } }),
      this.prisma.letter.count({
        where: { isSent: false, isDraft: false, scheduledAt: { not: null } },
      }),
      this.prisma.emailLog.count({ where: { status: 'SENT' } }),
      this.prisma.emailLog.count({ where: { status: 'FAILED' } }),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      stars: {
        total: totalStars,
      },
      letters: {
        total: totalLetters,
        sent: lettersSent,
        scheduled: lettersScheduled,
      },
      emails: {
        sent: emailsSent,
        failed: emailsFailed,
        total: emailsSent + emailsFailed,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
    };
  }

  /**
   * Get paginated user list with optional search, role, and status filters.
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { nickname: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status !== undefined) {
      where.isActive = status === 'active';
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          emailVerified: true,
          partnerId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              stars: true,
              lettersSent: true,
              lettersReceived: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
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
   * Enable or disable a user account.
   */
  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        nickname: true,
        isActive: true,
        role: true,
      },
    });

    this.logger.log(`User ${userId} status updated to isActive=${isActive}`);
    return updated;
  }

  /**
   * Change a user's role.
   */
  async updateUserRole(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        isActive: true,
      },
    });

    this.logger.log(`User ${userId} role updated to ${role}`);
    return updated;
  }

  /**
   * Delete a user permanently.
   */
  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // Prevent deleting the last admin
    if (user.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        throw new BadRequestException('无法删除唯一的系统管理员');
      }
    }

    await this.prisma.user.delete({ where: { id: userId } });

    this.logger.log(`User ${userId} (${user.email}) deleted by admin`);
    return { message: '用户已删除' };
  }

  /**
   * Get email sending statistics.
   */
  async getEmailStats() {
    const [totalSent, totalFailed, totalBounced, dailyStats] = await Promise.all([
      this.prisma.emailLog.count({ where: { status: 'SENT' } }),
      this.prisma.emailLog.count({ where: { status: 'FAILED' } }),
      this.prisma.emailLog.count({ where: { status: 'BOUNCED' } }),
      this.getDailyEmailStats(),
    ]);

    return {
      total: totalSent + totalFailed + totalBounced,
      sent: totalSent,
      failed: totalFailed,
      bounced: totalBounced,
      successRate: totalSent + totalFailed > 0
        ? Math.round((totalSent / (totalSent + totalFailed)) * 10000) / 100
        : 0,
      daily: dailyStats,
    };
  }

  /**
   * Get all system configurations.
   */
  async getSystemConfigs() {
    const configs = await this.prisma.systemConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Transform into key-value map for easier consumption
    const result: Record<string, any> = {};
    for (const config of configs) {
      try {
        result[config.key] = JSON.parse(config.value);
      } catch {
        result[config.key] = config.value;
      }
    }

    return result;
  }

  /**
   * Update a system configuration value.
   */
  async updateSystemConfig(key: string, value: string) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });

    if (config) {
      await this.prisma.systemConfig.update({
        where: { key },
        data: { value },
      });
    } else {
      await this.prisma.systemConfig.create({
        data: { key, value },
      });
    }

    this.logger.log(`System config "${key}" updated`);
    return { key, value, message: '配置已更新' };
  }

  /**
   * Get recent activity logs (notifications, email sends, etc.).
   */
  async getActivityLogs(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Combine recent notifications and email logs as a unified activity feed
    const [notifications, emailLogs, totalNotifications, totalEmailLogs] = await Promise.all([
      this.prisma.notification.findMany({
        skip,
        take: Math.ceil(limit / 2),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, nickname: true } },
        },
      }),
      this.prisma.emailLog.findMany({
        skip,
        take: Math.ceil(limit / 2),
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.notification.count(),
      this.prisma.emailLog.count(),
    ]);

    // Merge and sort by date
    const activities = [
      ...notifications.map((n) => ({
        id: n.id,
        type: 'notification',
        action: n.type,
        title: n.title,
        description: n.content,
        user: n.user,
        createdAt: n.createdAt,
      })),
      ...emailLogs.map((e) => ({
        id: e.id,
        type: 'email',
        action: `EMAIL_${e.status}`,
        title: `Email to ${e.to}`,
        description: `Subject: ${e.subject}${e.error ? ` | Error: ${e.error}` : ''}`,
        user: null,
        createdAt: e.sentAt,
      })),
    ];

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = totalNotifications + totalEmailLogs;

    return {
      items: activities.slice(0, limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== Private Helpers ====================

  /**
   * Get email send counts grouped by day for the last 30 days.
   */
  private async getDailyEmailStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await this.prisma.emailLog.findMany({
      where: {
        sentAt: { gte: thirtyDaysAgo },
      },
      select: {
        status: true,
        sentAt: true,
      },
      orderBy: { sentAt: 'asc' },
    });

    // Group by date
    const dailyMap: Record<string, { sent: number; failed: number }> = {};

    for (const log of logs) {
      const dateKey = log.sentAt.toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { sent: 0, failed: 0 };
      }
      if (log.status === 'SENT') {
        dailyMap[dateKey].sent++;
      } else {
        dailyMap[dateKey].failed++;
      }
    }

    return Object.entries(dailyMap)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
