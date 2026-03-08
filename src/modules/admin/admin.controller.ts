import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Header,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemStats } from './services/admin-system.service';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateMasterDto } from './dto/update-master.dto';
import { BroadcastEmailDto } from './dto/broadcast-email.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard data' })
  async getDashboard() {
    return this.adminService.getDashboardData();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get users list' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'verified', required: false, type: Boolean })
  @ApiQuery({ name: 'banned', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getUsers(
    @Query('role') role?: string,
    @Query('verified') verified?: string,
    @Query('banned') banned?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getUsers({
      role,
      verified:
        verified !== undefined && verified !== null
          ? verified === 'true'
          : undefined,
      banned:
        banned !== undefined && banned !== null ? banned === 'true' : undefined,
      page: Number(page),
      limit: Number(limit),
      cursor,
    });
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  async updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('masters')
  @ApiOperation({ summary: 'Get masters list' })
  @ApiQuery({ name: 'verified', required: false, type: Boolean })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'tariff', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getMasters(
    @Query('verified') verified?: string,
    @Query('featured') featured?: string,
    @Query('tariff') tariff?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getMasters({
      verified: verified ? verified === 'true' : undefined,
      featured: featured ? featured === 'true' : undefined,
      tariff,
      page: Number(page),
      limit: Number(limit),
      cursor,
    });
  }

  @Put('masters/:id')
  @ApiOperation({ summary: 'Update master' })
  async updateMaster(
    @Param('id') id: string,
    @Body() dto: AdminUpdateMasterDto,
  ) {
    return this.adminService.updateMaster(id, dto);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get leads list' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getLeads(
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getLeads({
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: Number(page),
      limit: Number(limit),
      cursor,
    });
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get reviews list' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getReviews(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getReviews({
      status,
      page: Number(page),
      limit: Number(limit),
      cursor,
    });
  }

  @Put('reviews/:id/moderate')
  @ApiOperation({ summary: 'Moderate review' })
  async moderateReview(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.moderateReview(id, status, reason);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payments list' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async getPayments(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getPayments({
      status,
      page: Number(page),
      limit: Number(limit),
      cursor,
    });
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week', 'month'],
  })
  async getAnalytics(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.adminService.getAnalytics(timeframe);
  }

  @Post('backup')
  @ApiOperation({ summary: 'Create backup' })
  async createBackup() {
    return this.adminService.createBackup();
  }

  @Get('backups')
  @ApiOperation({ summary: 'List backups' })
  async listBackups() {
    return this.adminService.listBackups();
  }

  @Get('backups/:filename')
  @ApiOperation({ summary: 'Download backup file' })
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment')
  async downloadBackup(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const { backupDir } = await this.adminService.getBackupPath(filename);

      return res.sendFile(filename, {
        root: backupDir,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message === 'Invalid backup filename' ||
        message === 'Invalid backup path'
      ) {
        throw new BadRequestException(message);
      }
      if (message === 'Backup file not found') {
        throw new NotFoundException(message);
      }
      throw error;
    }
  }

  @Get('settings/referrals')
  @ApiOperation({ summary: 'Get referrals program enabled state' })
  async getReferralsEnabled(): Promise<{ enabled: boolean }> {
    const enabled = await this.adminService.isReferralsEnabled();
    return { enabled };
  }

  @Put('settings/referrals')
  @ApiOperation({ summary: 'Enable or disable referrals program' })
  async setReferralsEnabled(
    @Body('enabled') enabled: boolean,
  ): Promise<{ enabled: boolean }> {
    const result = await this.adminService.setReferralsEnabled(!!enabled);
    return { enabled: result };
  }

  @Post('cache/tariffs/invalidate')
  @ApiOperation({ summary: 'Invalidate tariffs cache (e.g. after seed)' })
  async invalidateTariffsCache(): Promise<{ invalidated: number }> {
    return this.adminService.invalidateTariffsCache();
  }

  @Get('system/info')
  @ApiOperation({ summary: 'Get system information' })
  async getSystemInfo(): Promise<{ stats: SystemStats; timestamp: string }> {
    const stats = await this.adminService.getSystemStats();
    return {
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('masters/inactivity-stats')
  @ApiOperation({ summary: 'Get masters inactivity statistics' })
  async getInactivityStats(): Promise<{
    totalInactive: number;
    totalDeactivated: number;
    thresholdDays: number;
    ratingPenalty: number;
  }> {
    return this.adminService.getInactivityStats();
  }

  @Get('email/templates')
  @ApiOperation({ summary: 'List available broadcast email templates' })
  getBroadcastTemplates(): { templates: string[] } {
    const templates = this.adminService.getBroadcastTemplates();
    return { templates };
  }

  @Post('email/broadcast')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 broadcasts per minute
  @ApiOperation({ summary: 'Send broadcast email to segment' })
  async sendBroadcast(@Body() dto: BroadcastEmailDto) {
    return this.adminService.sendEmailBroadcast(
      dto.segment,
      dto.templateName,
      dto.sinceDate ? { sinceDate: dto.sinceDate } : undefined,
    );
  }
}
