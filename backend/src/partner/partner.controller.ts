import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PartnerService } from './partner.service';
import { SendPartnerRequestDto } from './partner.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('partners')
export class PartnerController {
  constructor(private partnerService: PartnerService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '发送伴侣请求' })
  async sendRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: SendPartnerRequestDto,
  ) {
    return this.partnerService.sendRequest(userId, dto.toCode, dto.message);
  }

  @Post('accept/:requestId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '接受伴侣请求' })
  async acceptRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.partnerService.acceptRequest(userId, requestId);
  }

  @Post('reject/:requestId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '拒绝伴侣请求' })
  async rejectRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.partnerService.rejectRequest(userId, requestId);
  }

  @Get('requests')
  @ApiOperation({ summary: '获取我的伴侣请求列表（收到的和发出的）' })
  async getRequests(@CurrentUser('id') userId: string) {
    return this.partnerService.getRequests(userId);
  }

  @Get('info')
  @ApiOperation({ summary: '获取伴侣信息' })
  async getPartner(@CurrentUser('id') userId: string) {
    return this.partnerService.getPartner(userId);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '解除伴侣关系' })
  async disconnect(@CurrentUser('id') userId: string) {
    return this.partnerService.disconnect(userId);
  }
}
