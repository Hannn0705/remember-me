import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';

import { MemoryService } from './memory.service';
import { CreateStarDto, UpdateStarDto, AddMemoryDto } from './memory.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Memories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memories')
export class MemoryController {
  private readonly logger = new Logger(MemoryController.name);

  constructor(private readonly memoryService: MemoryService) {}

  // ============================
  //  Star (Grid) Endpoints
  // ============================

  @Get('stars')
  @ApiOperation({ summary: '获取指定月的星星（星格数据）' })
  @ApiQuery({ name: 'year', required: true, type: Number, example: 2024 })
  @ApiQuery({ name: 'month', required: true, type: Number, example: 6 })
  async getStarsByMonth(
    @CurrentUser('id') userId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.memoryService.getStarsByMonth(userId, year, month);
  }

  @Get('stars/:id')
  @ApiOperation({ summary: '获取单个星星详情（含记忆和照片）' })
  async getStarById(@Param('id') starId: string) {
    return this.memoryService.getStarById(starId);
  }

  @Post('stars')
  @ApiOperation({ summary: '为某天创建一颗星星' })
  async createStar(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStarDto,
  ) {
    return this.memoryService.createStar(userId, dto);
  }

  @Patch('stars/:id')
  @ApiOperation({ summary: '更新星星信息（标题、心情、颜色、锁定）' })
  async updateStar(
    @CurrentUser('id') userId: string,
    @Param('id') starId: string,
    @Body() dto: UpdateStarDto,
  ) {
    return this.memoryService.updateStar(userId, starId, dto);
  }

  @Delete('stars/:id')
  @ApiOperation({ summary: '删除一颗星星及其关联的记忆和照片' })
  async deleteStar(
    @CurrentUser('id') userId: string,
    @Param('id') starId: string,
  ) {
    return this.memoryService.deleteStar(userId, starId);
  }

  // ============================
  //  Memory Endpoints
  // ============================

  @Post('stars/:starId/memories')
  @ApiOperation({ summary: '向星星添加记忆（文字/语音）' })
  async addMemory(
    @CurrentUser('id') userId: string,
    @Param('starId') starId: string,
    @Body() dto: AddMemoryDto,
  ) {
    return this.memoryService.addMemory(userId, starId, dto);
  }

  @Delete('memories/:id')
  @ApiOperation({ summary: '删除一条记忆' })
  async deleteMemory(
    @CurrentUser('id') userId: string,
    @Param('id') memoryId: string,
  ) {
    return this.memoryService.deleteMemory(userId, memoryId);
  }

  // ============================
  //  Photo Endpoints
  // ============================

  @Post('stars/:starId/photos')
  @ApiOperation({ summary: '向星星上传照片' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dest = join(process.cwd(), 'uploads', 'photos');
          if (!existsSync(dest)) {
            mkdirSync(dest, { recursive: true });
          }
          cb(null, dest);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async uploadPhoto(
    @CurrentUser('id') userId: string,
    @Param('starId') starId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.memoryService.uploadPhoto(userId, starId, file);
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: '删除一张照片' })
  async deletePhoto(
    @CurrentUser('id') userId: string,
    @Param('id') photoId: string,
  ) {
    return this.memoryService.deletePhoto(userId, photoId);
  }

  // ============================
  //  Timeline
  // ============================

  @Get('timeline')
  @ApiOperation({ summary: '获取时间线（自己和伴侣的星星合并，按日期排序）' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 30,
  })
  async getTimeline(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.memoryService.getTimeline(userId, page, limit);
  }
}
