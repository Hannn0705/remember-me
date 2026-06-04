import { Controller, Get, Post, Param, Body, UseGuards, Req, UploadedFile, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PetService } from './pet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePetDto, PetActionDto, InviteMemberDto, RespondInviteDto } from './pet.dto';

@ApiTags('Pet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pet')
export class PetController {
  constructor(private petService: PetService) {}

  @Post('create')
  @ApiOperation({ summary: '创建宠物' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreatePetDto) {
    return this.petService.create(userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: '我的宠物列表' })
  async getMyPets(@CurrentUser('id') userId: string) {
    return this.petService.getMyPets(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取宠物详情' })
  async getPet(@Param('id') petId: string, @CurrentUser('id') userId: string) {
    return this.petService.getPet(petId, userId);
  }

  @Post(':id/feed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '喂食宠物' })
  async feed(@Param('id') petId: string, @CurrentUser('id') userId: string, @Body() dto: PetActionDto) {
    return this.petService.feed(petId, userId, dto);
  }

  @Post(':id/play')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '和宠物玩耍' })
  async play(@Param('id') petId: string, @CurrentUser('id') userId: string, @Body() dto: PetActionDto) {
    return this.petService.play(petId, userId, dto);
  }

  @Post(':id/clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '清洁宠物' })
  async clean(@Param('id') petId: string, @CurrentUser('id') userId: string) {
    return this.petService.clean(petId, userId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: '邀请成员' })
  async invite(@Param('id') petId: string, @CurrentUser('id') userId: string, @Body() dto: InviteMemberDto) {
    return this.petService.inviteMember(petId, userId, dto);
  }

  @Post('invite/:inviteId/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '回应邀请' })
  async respondInvite(
    @Param('inviteId') inviteId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RespondInviteDto,
  ) {
    return this.petService.respondInvite(inviteId, userId, dto.status);
  }

  @Get('invites/my')
  @ApiOperation({ summary: '我的邀请列表' })
  async getInvites(@CurrentUser('id') userId: string) {
    return this.petService.getInvites(userId);
  }

  @Post(':id/voice/upload')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads/audio'),
        filename: (_req, file, cb) => {
          const name = uuidv4() + extname(file.originalname || '.webm');
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传语音' })
  async uploadVoice(
    @Param('id') petId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { duration?: string; transcript?: string },
  ) {
    if (!file) throw new Error('请上传音频文件');
    const audioUrl = `/uploads/audio/${file.filename}`;
    const duration = body.duration ? parseInt(body.duration, 10) : 0;
    return this.petService.uploadVoice(petId, userId, audioUrl, duration, body.transcript);
  }

  @Get(':id/voices')
  @ApiOperation({ summary: '语音列表' })
  async getVoices(@Param('id') petId: string, @CurrentUser('id') userId: string) {
    return this.petService.getVoices(petId, userId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: '活动记录' })
  async getActivities(@Param('id') petId: string, @CurrentUser('id') userId: string) {
    return this.petService.getActivities(petId, userId);
  }
}
