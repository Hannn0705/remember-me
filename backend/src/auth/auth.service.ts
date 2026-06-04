import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, VerifyCodeDto, ResetPasswordDto, ChangePasswordDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    // Check existing
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('该邮箱已被注册');
    }

    // Validate password strength
    this.validatePassword(dto.password);

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate partner code
    const partnerCode = this.generatePartnerCode();

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nickname: dto.nickname || dto.email.split('@')[0],
        partnerCode,
        emailVerified: true, // No verification needed in dev
      },
    });

    this.logger.log(`New user registered: ${user.email}`);

    // Send welcome email (async)
    this.emailService.sendTemplate(user.email, 'welcome', {
      nickname: user.nickname || user.email,
    }).catch(e => this.logger.error('Welcome email failed:', e));

    return {
      message: '注册成功',
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('账号已被禁用');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'remember-me-refresh-secret-dev',
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token 无效或已过期');
    }
  }

  async sendVerificationCode(email: string, type: string = 'REGISTER') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.emailVerification.create({
      data: { email, code, type, expiresAt },
    });

    const templateName = type === 'RESET_PASSWORD' ? 'password_reset' : 'verification_code';
    await this.emailService.sendTemplate(email, templateName, { code });

    // In development mode, return the code so users can see it without real SMTP
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      this.logger.log(`[DEV] Verification code for ${email}: ${code}`);
      return { message: '验证码已发送', code, _dev: true };
    }

    return { message: '验证码已发送' };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const record = await this.prisma.emailVerification.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        type: dto.type,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('验证码无效或已过期');
    }

    await this.prisma.emailVerification.update({
      where: { id: record.id },
      data: { used: true },
    });

    if (dto.type === 'REGISTER') {
      await this.prisma.user.update({
        where: { email: dto.email },
        data: { emailVerified: true },
      });
    }

    return { message: '验证成功', verified: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Verify code first
    await this.verifyCode({
      email: dto.email,
      code: dto.code,
      type: 'RESET_PASSWORD',
    });

    this.validatePassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: { passwordHash },
    });

    return { message: '密码重置成功' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');

    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('原密码错误');

    this.validatePassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: '密码修改成功' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        partnerId: true,
        partnerCode: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    return user;
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'remember-me-refresh-secret-dev',
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: user.role,
        partnerId: user.partnerId,
        partnerCode: user.partnerCode,
      },
    };
  }

  private validatePassword(password: string) {
    if (password.length < 8) {
      throw new BadRequestException('密码至少8个字符');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('密码需要包含至少一个大写字母');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('密码需要包含至少一个小写字母');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('密码需要包含至少一个数字');
    }
  }

  private generatePartnerCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
