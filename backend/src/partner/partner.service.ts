import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Send a partner request to a user identified by their partner code.
   */
  async sendRequest(currentUserId: string, toCode: string, message?: string) {
    // Fetch current user
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser) {
      throw new NotFoundException('当前用户不存在');
    }

    // Check not sending to self
    if (currentUser.partnerCode === toCode) {
      throw new BadRequestException('不能向自己发送伴侣请求');
    }

    // Check current user not already partnered
    if (currentUser.partnerId) {
      throw new BadRequestException('你已有伴侣，无法发送新的请求');
    }

    // Find target user by partner code
    const targetUser = await this.prisma.user.findUnique({
      where: { partnerCode: toCode },
    });
    if (!targetUser) {
      throw new NotFoundException('未找到该伴侣码对应的用户');
    }

    // Check target user not already partnered
    if (targetUser.partnerId) {
      throw new BadRequestException('对方已有伴侣');
    }

    // Check for existing pending request from this user to this target
    const existingRequest = await this.prisma.partnerRequest.findFirst({
      where: {
        fromUserId: currentUserId,
        toCode,
        status: 'PENDING',
      },
    });
    if (existingRequest) {
      throw new BadRequestException('已向该用户发送过伴侣请求，请等待对方处理');
    }

    // Create the partner request
    const request = await this.prisma.partnerRequest.create({
      data: {
        fromUserId: currentUserId,
        toCode,
        status: 'PENDING',
        message: message || null,
      },
    });

    // Create notification for target user
    await this.prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: 'PARTNER_REQUEST',
        title: '新的伴侣请求',
        content: message
          ? `${currentUser.nickname || '一位用户'} 向你发送了伴侣请求：${message}`
          : `${currentUser.nickname || '一位用户'} 向你发送了伴侣请求`,
        data: JSON.stringify({
          requestId: request.id,
          fromUserId: currentUserId,
          fromNickname: currentUser.nickname,
          fromAvatar: currentUser.avatarUrl,
        }),
      },
    });

    this.logger.log(`Partner request sent: ${currentUserId} -> ${targetUser.id}`);

    return {
      message: '伴侣请求已发送',
      requestId: request.id,
    };
  }

  /**
   * Accept a pending partner request and link both users.
   */
  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.partnerRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('伴侣请求不存在');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('该请求已处理');
    }

    // Verify the accepting user is the target (their partnerCode matches)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.partnerCode !== request.toCode) {
      throw new ForbiddenException('无权操作此请求');
    }
    if (user.partnerId) {
      throw new BadRequestException('你已有伴侣');
    }

    // Check sender still exists and is partner-free
    const sender = await this.prisma.user.findUnique({
      where: { id: request.fromUserId },
    });
    if (!sender) {
      throw new NotFoundException('发送方用户已不存在');
    }
    if (sender.partnerId) {
      throw new BadRequestException('对方已有伴侣');
    }

    // Atomically link users and update request status
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.fromUserId },
        data: { partnerId: userId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { partnerId: request.fromUserId },
      }),
      this.prisma.partnerRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    // Reject any other pending requests involving either user
    await this.prisma.partnerRequest.updateMany({
      where: {
        OR: [
          { fromUserId: request.fromUserId, status: 'PENDING' },
          { toCode: request.toCode, status: 'PENDING' },
        ],
        id: { not: requestId },
      },
      data: { status: 'REJECTED' },
    });

    // Notify the sender
    await this.prisma.notification.create({
      data: {
        userId: request.fromUserId,
        type: 'PARTNER_ACCEPTED',
        title: '伴侣请求已接受',
        content: `${user.nickname || '对方'} 已接受你的伴侣请求`,
        data: JSON.stringify({ partnerId: userId }),
      },
    });

    this.logger.log(`Partner request accepted: ${request.fromUserId} <-> ${userId}`);

    return { message: '已接受伴侣请求' };
  }

  /**
   * Reject a pending partner request.
   */
  async rejectRequest(userId: string, requestId: string) {
    const request = await this.prisma.partnerRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('伴侣请求不存在');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('该请求已处理');
    }

    // Verify the user is either the target or the sender
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const isTarget = user.partnerCode === request.toCode;
    const isSender = request.fromUserId === userId;
    if (!isTarget && !isSender) {
      throw new ForbiddenException('无权操作此请求');
    }

    // Delete the request
    await this.prisma.partnerRequest.delete({
      where: { id: requestId },
    });

    this.logger.log(`Partner request rejected: ${requestId} by user ${userId}`);

    return { message: '已拒绝伴侣请求' };
  }

  /**
   * Get all pending requests for the current user (incoming and outgoing).
   */
  async getRequests(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const partnerCode = user.partnerCode || '';
    const [incoming, outgoing] = await Promise.all([
      this.prisma.partnerRequest.findMany({
        where: { toCode: partnerCode, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.partnerRequest.findMany({
        where: { fromUserId: userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Enrich incoming requests with sender info
    let enrichedIncoming: any[] = incoming;
    if (incoming.length > 0) {
      const fromUserIds = incoming.map((r) => r.fromUserId);
      const fromUsers = await this.prisma.user.findMany({
        where: { id: { in: fromUserIds } },
        select: { id: true, nickname: true, avatarUrl: true },
      });
      const userMap = new Map(fromUsers.map((u) => [u.id, u]));
      enrichedIncoming = incoming.map((r) => ({
        ...r,
        fromUser: userMap.get(r.fromUserId) || null,
      }));
    }

    // Enrich outgoing requests with target user info
    let enrichedOutgoing: any[] = outgoing;
    if (outgoing.length > 0) {
      const toCodes = outgoing.map((r) => r.toCode);
      const targetUsers = await this.prisma.user.findMany({
        where: { partnerCode: { in: toCodes } },
        select: { id: true, nickname: true, avatarUrl: true, partnerCode: true },
      });
      const codeMap = new Map(targetUsers.map((u) => [u.partnerCode, u]));
      enrichedOutgoing = outgoing.map((r) => ({
        ...r,
        toUser: codeMap.get(r.toCode) || null,
      }));
    }

    return {
      incoming: enrichedIncoming,
      outgoing: enrichedOutgoing,
    };
  }

  /**
   * Disconnect the partner relationship.
   */
  async disconnect(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, partnerId: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.partnerId) {
      throw new BadRequestException('你暂无伴侣');
    }

    const partnerId = user.partnerId;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { partnerId: null },
      }),
      this.prisma.user.update({
        where: { id: partnerId },
        data: { partnerId: null },
      }),
    ]);

    this.logger.log(`Partner disconnected: ${userId} <-> ${partnerId}`);

    return { message: '已解除伴侣关系' };
  }

  /**
   * Get the current user's partner info.
   */
  async getPartner(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.partnerId) {
      throw new NotFoundException('暂无伴侣');
    }

    const partner = await this.prisma.user.findUnique({
      where: { id: user.partnerId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        email: true,
        createdAt: true,
      },
    });
    if (!partner) {
      throw new NotFoundException('伴侣用户不存在');
    }

    return partner;
  }
}
