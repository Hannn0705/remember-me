import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateUserStatusDto, UpdateUserRoleDto, UpdateConfigDto } from './admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get paginated user list with search and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'user@example.com' })
  @ApiQuery({ name: 'role', required: false, enum: ['USER', 'ADMIN'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUsers(page || 1, limit || 20, search, role, status);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Enable or disable a user account' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto.isActive);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change a user role' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user permanently' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('email-stats')
  @ApiOperation({ summary: 'Get email sending statistics' })
  async getEmailStats() {
    return this.adminService.getEmailStats();
  }

  @Get('configs')
  @ApiOperation({ summary: 'Get all system configurations' })
  async getSystemConfigs() {
    return this.adminService.getSystemConfigs();
  }

  @Put('configs/:key')
  @ApiOperation({ summary: 'Update a system configuration' })
  async updateSystemConfig(
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.adminService.updateSystemConfig(key, dto.value);
  }

  @Get('activity-logs')
  @ApiOperation({ summary: 'Get recent activity logs' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getActivityLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getActivityLogs(page || 1, limit || 20);
  }
}
