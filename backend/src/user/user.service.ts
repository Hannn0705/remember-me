import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { UpdateProfileDto } from './user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve all users (admin use-case).
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find a single user by ID.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        partnerId: true,
        partnerCode: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /**
   * Update the current user's profile (nickname, avatarUrl).
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        role: true,
      },
    });

    this.logger.log(`User ${userId} updated profile`);
    return updated;
  }

  /**
   * Search users by nickname or email (partial match).
   */
  async searchUsers(query: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('搜索关键词不能为空');
    }

    return this.prisma.user.findMany({
      where: {
        OR: [
          { nickname: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Handle avatar upload. Saves the file record and returns the user with updated avatarUrl.
   * The actual file persistence (local / cloud) is handled by the caller (controller / multer).
   */
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // Build the URL path — adjust to match your static-file serving prefix
    const avatarUrl = `/uploads/avatars/${file.filename}`;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
      },
    });

    this.logger.log(`User ${userId} uploaded avatar: ${file.filename}`);
    return updated;
  }
}
