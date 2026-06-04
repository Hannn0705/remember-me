import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateStarDto, UpdateStarDto, AddMemoryDto } from './memory.dto';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================
  //  Star (Grid Node) Operations
  // ============================

  /**
   * Get all stars for a given user in a specific year/month.
   * Used to render the star grid on the frontend.
   */
  async getStarsByMonth(userId: string, year: number, month: number) {
    // Build date range for the requested month
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const stars = await this.prisma.star.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        _count: {
          select: {
            memories: true,
            photos: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    return stars;
  }

  /**
   * Get a single star by ID, including all its memories and photos.
   */
  async getStarById(starId: string) {
    const star = await this.prisma.star.findUnique({
      where: { id: starId },
      include: {
        memories: {
          orderBy: { createdAt: 'asc' },
        },
        photos: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!star) {
      throw new NotFoundException('星星不存在');
    }

    return star;
  }

  /**
   * Create a new star for a given date.
   * A user can only have one star per date (@@unique([userId, date])).
   */
  async createStar(userId: string, dto: CreateStarDto) {
    const starDate = new Date(dto.date);

    // Normalise to start of day (UTC) to avoid timezone edge-cases
    starDate.setUTCHours(0, 0, 0, 0);

    // Check for existing star on the same date for this user
    const existing = await this.prisma.star.findUnique({
      where: {
        userId_date: {
          userId,
          date: starDate,
        },
      },
    });

    if (existing) {
      throw new ConflictException('该日期已经存在星星');
    }

    const star = await this.prisma.star.create({
      data: {
        userId,
        date: starDate,
        title: dto.title,
        mood: dto.mood,
        color: dto.color || '#FFD700',
      },
    });

    this.logger.log(`Star created: ${star.id} for user ${userId} on ${dto.date}`);
    return star;
  }

  /**
   * Update an existing star (title, mood, color, isLocked).
   */
  async updateStar(userId: string, starId: string, dto: UpdateStarDto) {
    const star = await this.prisma.star.findUnique({ where: { id: starId } });

    if (!star) {
      throw new NotFoundException('星星不存在');
    }

    if (star.userId !== userId) {
      throw new ForbiddenException('无权修改此星星');
    }

    if (star.isLocked) {
      throw new ForbiddenException('星星已锁定，无法修改');
    }

    const updated = await this.prisma.star.update({
      where: { id: starId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.mood !== undefined && { mood: dto.mood }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.isLocked !== undefined && { isLocked: dto.isLocked }),
      },
    });

    this.logger.log(`Star updated: ${starId}`);
    return updated;
  }

  /**
   * Delete a star and all its associated memories & photos (cascaded).
   */
  async deleteStar(userId: string, starId: string) {
    const star = await this.prisma.star.findUnique({ where: { id: starId } });

    if (!star) {
      throw new NotFoundException('星星不存在');
    }

    if (star.userId !== userId) {
      throw new ForbiddenException('无权删除此星星');
    }

    await this.prisma.star.delete({ where: { id: starId } });

    this.logger.log(`Star deleted: ${starId}`);
    return { message: '星星已删除' };
  }

  // ============================
  //  Memory Operations
  // ============================

  /**
   * Add a text / voice memory entry to a star.
   */
  async addMemory(userId: string, starId: string, dto: AddMemoryDto) {
    const star = await this.prisma.star.findUnique({ where: { id: starId } });

    if (!star) {
      throw new NotFoundException('星星不存在');
    }

    if (star.userId !== userId) {
      throw new ForbiddenException('无权为此星星添加记忆');
    }

    if (star.isLocked) {
      throw new ForbiddenException('星星已锁定，无法添加记忆');
    }

    if (!dto.content && !dto.voiceUrl) {
      throw new BadRequestException('请提供记忆内容或语音记录');
    }

    const memory = await this.prisma.memory.create({
      data: {
        starId,
        content: dto.content || null,
        voiceUrl: dto.voiceUrl || null,
      },
    });

    this.logger.log(`Memory added: ${memory.id} to star ${starId}`);
    return memory;
  }

  /**
   * Delete a single memory entry.
   */
  async deleteMemory(userId: string, memoryId: string) {
    const memory = await this.prisma.memory.findUnique({
      where: { id: memoryId },
      include: { star: true },
    });

    if (!memory) {
      throw new NotFoundException('记忆不存在');
    }

    if (memory.star.userId !== userId) {
      throw new ForbiddenException('无权删除此记忆');
    }

    await this.prisma.memory.delete({ where: { id: memoryId } });

    this.logger.log(`Memory deleted: ${memoryId}`);
    return { message: '记忆已删除' };
  }

  // ============================
  //  Photo Operations
  // ============================

  /**
   * Upload a photo to a star. The file has already been persisted by multer;
   * this method records the metadata in the database.
   */
  async uploadPhoto(userId: string, starId: string, file: Express.Multer.File) {
    const star = await this.prisma.star.findUnique({ where: { id: starId } });

    if (!star) {
      throw new NotFoundException('星星不存在');
    }

    if (star.userId !== userId) {
      throw new ForbiddenException('无权为此星星上传照片');
    }

    if (star.isLocked) {
      throw new ForbiddenException('星星已锁定，无法上传照片');
    }

    const url = `/uploads/photos/${file.filename}`;
    const thumbUrl = `/uploads/photos/thumb_${file.filename}`; // Placeholder — real thumb generation would be done offline

    const photo = await this.prisma.photo.create({
      data: {
        starId,
        userId,
        url,
        thumbUrl,
      },
    });

    this.logger.log(`Photo uploaded: ${photo.id} to star ${starId}`);
    return photo;
  }

  /**
   * Delete a photo.
   */
  async deletePhoto(userId: string, photoId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      include: { star: true },
    });

    if (!photo) {
      throw new NotFoundException('照片不存在');
    }

    if (photo.star.userId !== userId) {
      throw new ForbiddenException('无权删除此照片');
    }

    await this.prisma.photo.delete({ where: { id: photoId } });

    this.logger.log(`Photo deleted: ${photoId}`);
    return { message: '照片已删除' };
  }

  // ============================
  //  Timeline
  // ============================

  /**
   * Get a merged timeline of stars for the current user and their partner.
   * Returns all stars sorted by date (descending).
   */
  async getTimeline(userId: string, page: number = 1, limit: number = 30) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // Collect user IDs to include
    const userIds = [userId];
    if (user.partnerId) {
      userIds.push(user.partnerId);
    }

    const skip = (page - 1) * limit;

    const [stars, total] = await Promise.all([
      this.prisma.star.findMany({
        where: { userId: { in: userIds } },
        include: {
          memories: {
            orderBy: { createdAt: 'asc' },
          },
          photos: {
            orderBy: { createdAt: 'asc' },
          },
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.star.count({
        where: { userId: { in: userIds } },
      }),
    ]);

    return {
      data: stars,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
