import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CronService } from './cron.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCronJobDto, UpdateCronJobDto } from './cron.dto';

@ApiTags('Admin - Cron Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('cron')
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List all cron jobs' })
  async getCronJobs() {
    return this.cronService.getCronJobs();
  }

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new cron job' })
  async createCronJob(@Body() dto: CreateCronJobDto) {
    return this.cronService.createCronJob(dto);
  }

  @Put('jobs/:id')
  @ApiOperation({ summary: 'Update a cron job' })
  async updateCronJob(@Param('id') id: string, @Body() dto: UpdateCronJobDto) {
    return this.cronService.updateCronJob(id, dto);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete a cron job' })
  async deleteCronJob(@Param('id') id: string) {
    return this.cronService.deleteCronJob(id);
  }

  @Post('jobs/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle a cron job enabled/disabled' })
  async toggleCronJob(@Param('id') id: string) {
    return this.cronService.toggleCronJob(id);
  }
}
