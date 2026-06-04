import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreatePetDto, InviteMemberDto, PetActionDto } from './pet.dto';

@Injectable()
export class PetService {
  private readonly logger = new Logger(PetService.name);
  private readonly MAX_STAT = 100;
  private readonly EXP_PER_LEVEL = 100;

  constructor(private prisma: PrismaService) {}

  // ==================== Create Pet ====================
  async create(userId: string, dto: CreatePetDto) {
    const existing = await this.prisma.pet.findFirst({
      where: { members: { some: { userId, role: 'OWNER' } } },
    });
    if (existing) {
      throw new BadRequestException('你已经有一只宠物了');
    }

    const pet = await this.prisma.pet.create({
      data: {
        name: dto.name,
        avatar: dto.avatar,
        members: {
          create: { userId, role: 'OWNER' },
        },
        activities: {
          create: { userId, type: 'LOGIN', metadata: JSON.stringify({ action: 'created' }) },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, nickname: true, avatarUrl: true } } } },
      },
    });

    this.logger.log(`Pet created: ${pet.name} by user ${userId}`);
    return pet;
  }

  // ==================== Get Pet ====================
  async getPet(petId: string, userId: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, avatarUrl: true, email: true } } },
        },
        _count: { select: { voices: true, activities: true } },
      },
    });
    if (!pet) throw new NotFoundException('宠物不存在');
    const isMember = pet.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('你不是此宠物的成员');
    return pet;
  }

  // ==================== Get My Pets ====================
  async getMyPets(userId: string) {
    return this.prisma.pet.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
        },
        _count: { select: { voices: true, activities: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ==================== Feed ====================
  async feed(petId: string, userId: string, dto: PetActionDto) {
    const pet = await this.verifyMember(petId, userId);
    const amount = dto.amount || 15;
    const newHunger = Math.min(pet.hunger + amount, this.MAX_STAT);
    const expGain = Math.floor(amount / 5);

    const updated = await this.prisma.pet.update({
      where: { id: petId },
      data: {
        hunger: newHunger,
        exp: { increment: expGain },
      },
    });

    await this.recordActivity(petId, userId, 'FEED', { amount, expGain, hunger: newHunger });
    const leveled = await this.checkLevelUp(petId, updated.exp);

    return { ...updated, leveled, message: `喂食成功！饱食度 +${amount - (pet.hunger + amount - newHunger)}` };
  }

  // ==================== Play ====================
  async play(petId: string, userId: string, dto: PetActionDto) {
    const pet = await this.verifyMember(petId, userId);
    const amount = dto.amount || 10;
    const newHappiness = Math.min(pet.happiness + amount, this.MAX_STAT);
    const expGain = Math.floor(amount / 3);

    // Playing also decreases hunger a bit
    const hungerCost = Math.floor(amount / 4);
    const newHunger = Math.max(0, pet.hunger - hungerCost);

    const updated = await this.prisma.pet.update({
      where: { id: petId },
      data: {
        happiness: newHappiness,
        hunger: newHunger,
        exp: { increment: expGain },
      },
    });

    await this.recordActivity(petId, userId, 'PLAY', { amount, expGain, happiness: newHappiness });
    const leveled = await this.checkLevelUp(petId, updated.exp);

    return { ...updated, leveled, message: '玩耍成功！快乐度提升' };
  }

  // ==================== Clean ====================
  async clean(petId: string, userId: string) {
    await this.verifyMember(petId, userId);
    const updated = await this.prisma.pet.update({
      where: { id: petId },
      data: { clean: this.MAX_STAT, exp: { increment: 5 } },
    });

    await this.recordActivity(petId, userId, 'CLEAN', { clean: this.MAX_STAT });
    const leveled = await this.checkLevelUp(petId, updated.exp);

    return { ...updated, leveled, message: '清洁完成！小精灵焕然一新 ✨' };
  }

  // ==================== Voice Upload ====================
  async uploadVoice(petId: string, userId: string, audioUrl: string, duration: number, transcript?: string) {
    await this.verifyMember(petId, userId);

    // Check daily limit (10 recordings per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.prisma.voiceRecord.count({
      where: { userId, petId, createdAt: { gte: today, lt: tomorrow } },
    });

    if (todayCount >= 10) {
      throw new BadRequestException('今日录音已达上限（10条）');
    }

    const voice = await this.prisma.voiceRecord.create({
      data: { petId, userId, audioUrl, duration, transcript },
    });

    await this.recordActivity(petId, userId, 'VOICE', { duration, voiceId: voice.id });
    await this.prisma.pet.update({
      where: { id: petId },
      data: { exp: { increment: 3 } },
    });

    return voice;
  }

  // ==================== Get Voices ====================
  async getVoices(petId: string, userId: string) {
    await this.verifyMember(petId, userId);
    return this.prisma.voiceRecord.findMany({
      where: { petId },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ==================== Get Activities ====================
  async getActivities(petId: string, userId: string) {
    await this.verifyMember(petId, userId);
    return this.prisma.petActivity.findMany({
      where: { petId },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ==================== Invite Member ====================
  async inviteMember(petId: string, userId: string, dto: InviteMemberDto) {
    const pet = await this.verifyMember(petId, userId);
    const member = pet.members.find((m) => m.userId === userId);
    if (!member || member.role !== 'OWNER') {
      throw new ForbiddenException('只有宠物主人才可邀请');
    }

    const invitee = await this.prisma.user.findUnique({ where: { id: dto.inviteeId } });
    if (!invitee) throw new NotFoundException('用户不存在');

    const alreadyMember = pet.members.some((m) => m.userId === dto.inviteeId);
    if (alreadyMember) throw new BadRequestException('该用户已经是成员');

    const existing = await this.prisma.petInvite.findFirst({
      where: { petId, inviteeId: dto.inviteeId, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('已发送过邀请');

    const invite = await this.prisma.petInvite.create({
      data: { petId, inviterId: userId, inviteeId: dto.inviteeId },
      include: { invitee: { select: { id: true, nickname: true, avatarUrl: true } } },
    });

    return invite;
  }

  // ==================== Respond to Invite ====================
  async respondInvite(inviteId: string, userId: string, status: string) {
    const invite = await this.prisma.petInvite.findUnique({
      where: { id: inviteId },
      include: { pet: true },
    });
    if (!invite) throw new NotFoundException('邀请不存在');
    if (invite.inviteeId !== userId) throw new ForbiddenException('无权操作');

    if (status === 'ACCEPTED') {
      await this.prisma.$transaction([
        this.prisma.petMember.create({
          data: { petId: invite.petId, userId, role: 'MEMBER' },
        }),
        this.prisma.petInvite.update({
          where: { id: inviteId },
          data: { status: 'ACCEPTED' },
        }),
      ]);
      await this.recordActivity(invite.petId, userId, 'LOGIN', { action: 'joined' });
    } else {
      await this.prisma.petInvite.update({
        where: { id: inviteId },
        data: { status: 'REJECTED' },
      });
    }

    return { message: status === 'ACCEPTED' ? '已加入' : '已拒绝' };
  }

  // ==================== Get Invites ====================
  async getInvites(userId: string) {
    const sent = await this.prisma.petInvite.findMany({
      where: { inviterId: userId },
      include: { pet: true, invitee: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const received = await this.prisma.petInvite.findMany({
      where: { inviteeId: userId, status: 'PENDING' },
      include: { pet: true, inviter: { select: { id: true, nickname: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { sent, received };
  }

  // ==================== Decay Stats (Cron) ====================
  async decayStats() {
    const pets = await this.prisma.pet.findMany();
    let decayed = 0;
    for (const pet of pets) {
      const newHunger = Math.max(0, pet.hunger - Math.floor(Math.random() * 10 + 5));
      const newHappiness = Math.max(0, pet.happiness - Math.floor(Math.random() * 8 + 3));
      const newClean = Math.max(0, pet.clean - Math.floor(Math.random() * 5 + 2));
      const newEnergy = Math.max(0, (pet.energy || 100) - Math.floor(Math.random() * 6 + 2));

      await this.prisma.pet.update({
        where: { id: pet.id },
        data: { hunger: newHunger, happiness: newHappiness, clean: newClean, energy: newEnergy },
      });
      decayed++;
    }
    this.logger.log(`Decayed stats for ${decayed} pets`);
    return { decayed };
  }

  // ==================== Helpers ====================

  private async verifyMember(petId: string, userId: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      include: { members: true },
    });
    if (!pet) throw new NotFoundException('宠物不存在');
    const isMember = pet.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('你不是此宠物的成员');
    return pet;
  }

  private async recordActivity(petId: string, userId: string, type: string, metadata?: any) {
    return this.prisma.petActivity.create({
      data: { petId, userId, type, metadata: metadata ? JSON.stringify(metadata) : null },
    });
  }

  private async checkLevelUp(petId: string, currentExp: number) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId }, select: { level: true } });
    if (!pet) return false;

    const neededExp = pet.level * this.EXP_PER_LEVEL;
    if (currentExp >= neededExp) {
      const newLevel = pet.level + 1;
      const remainingExp = currentExp - neededExp;
      await this.prisma.pet.update({
        where: { id: petId },
        data: { level: newLevel, exp: remainingExp },
      });

      // Find a member to attribute the level up to
      const member = await this.prisma.petMember.findFirst({ where: { petId } });
      if (member) {
        await this.recordActivity(petId, member.userId, 'LEVEL_UP', { from: pet.level, to: newLevel });
      }

      this.logger.log(`Pet ${petId} leveled up to ${newLevel}!`);
      return { leveled: true, newLevel, remainingExp };
    }
    return { leveled: false };
  }
}
