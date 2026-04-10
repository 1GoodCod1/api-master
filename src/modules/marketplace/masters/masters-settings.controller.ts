import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CONTROLLER_PATH } from '../../../common/constants';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { GetUser, Roles } from '../../../common/decorators';
import { encodeId } from '../../shared/utils/id-encoder';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { TelegramConnectService } from '../../notifications/notifications/services/telegram-connect.service';
import { MastersAvailabilityService } from './services/masters-availability.service';
import { MastersNotificationSettingsService } from './services/masters-notification-settings.service';
import { MastersScheduleService } from './services/masters-schedule.service';
import { MastersQuickRepliesService } from './services/masters-quick-replies.service';
import { MastersProfileService } from './services/masters-profile.service';
import { UpdateAvailabilityStatusDto } from './dto/update-availability-status.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import { UpdateQuickRepliesDto } from './dto/update-quick-replies.dto';
import { UpdateAutoresponderSettingsDto } from './dto/update-autoresponder-settings.dto';

@ApiTags('Masters Settings')
@Controller(`${CONTROLLER_PATH.masters}/settings`)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER, UserRole.ADMIN)
@ApiBearerAuth()
export class MastersSettingsController {
  constructor(
    private readonly profileService: MastersProfileService,
    private readonly availabilityService: MastersAvailabilityService,
    private readonly notificationSettingsService: MastersNotificationSettingsService,
    private readonly scheduleService: MastersScheduleService,
    private readonly quickRepliesService: MastersQuickRepliesService,
    private readonly telegramConnect: TelegramConnectService,
  ) {}

  private onInvalidate(masterId: string, slug?: string | null) {
    return this.profileService.invalidateMasterCache(
      masterId,
      slug,
      encodeId(masterId),
    );
  }

  // ==================== AVAILABILITY ====================

  @Patch('availability')
  @ApiOperation({ summary: 'Update master availability status and max leads' })
  async updateAvailabilityStatus(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateAvailabilityStatusDto,
  ) {
    return this.availabilityService.updateAvailabilityStatus(
      user.id,
      dto,
      (m, s) => this.onInvalidate(m, s),
    );
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get master availability status' })
  async getAvailabilityStatus(@GetUser() user: JwtUser) {
    return this.availabilityService.getAvailabilityStatus(user.id);
  }

  // ==================== NOTIFICATIONS ====================

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification settings (Telegram, WhatsApp)' })
  async getNotificationSettings(@GetUser() user: JwtUser) {
    return this.notificationSettingsService.getNotificationSettings(user.id);
  }

  @Patch('notifications')
  @ApiOperation({
    summary: 'Update notification settings (Telegram, WhatsApp). Premium only.',
  })
  async updateNotificationSettings(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationSettingsService.updateNotificationSettings(
      user.id,
      dto,
    );
  }

  @Post('telegram-connect')
  @ApiOperation({
    summary:
      'Create Telegram connect link (Premium only). Opens t.me/bot?start=connect_XXX',
  })
  async createTelegramConnectLink(@GetUser() user: JwtUser) {
    return this.telegramConnect.createConnectLink(user.id);
  }

  // ==================== SCHEDULE ====================

  @Get('schedule')
  @ApiOperation({
    summary: 'Get schedule settings (working hours, slot duration)',
  })
  async getScheduleSettings(@GetUser() user: JwtUser) {
    return this.scheduleService.getScheduleSettings(user.id);
  }

  @Patch('schedule')
  @ApiOperation({
    summary: 'Update schedule settings (working hours, slot duration)',
  })
  async updateScheduleSettings(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateScheduleSettingsDto,
  ) {
    return this.scheduleService.updateScheduleSettings(user.id, dto, (m, s) =>
      this.onInvalidate(m, s),
    );
  }

  // ==================== QUICK REPLIES ====================

  @Get('quick-replies')
  @ApiOperation({ summary: 'Get my quick replies (master)' })
  async getMyQuickReplies(@GetUser() user: JwtUser) {
    return this.quickRepliesService.getQuickReplies(user.id);
  }

  @Put('quick-replies')
  @ApiOperation({ summary: 'Replace my quick replies list (master)' })
  async replaceMyQuickReplies(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateQuickRepliesDto,
  ) {
    return this.quickRepliesService.replaceQuickReplies(user.id, dto, (m, s) =>
      this.onInvalidate(m, s),
    );
  }

  // ==================== AUTORESPONDER ====================

  @Get('autoresponder')
  @ApiOperation({ summary: 'Get my autoresponder settings (master)' })
  async getMyAutoresponderSettings(@GetUser() user: JwtUser) {
    return this.quickRepliesService.getAutoresponderSettings(user.id);
  }

  @Patch('autoresponder')
  @ApiOperation({ summary: 'Update my autoresponder settings (master)' })
  async updateMyAutoresponderSettings(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateAutoresponderSettingsDto,
  ) {
    return this.quickRepliesService.updateAutoresponderSettings(
      user.id,
      dto,
      (m, s) => this.onInvalidate(m, s),
    );
  }
}
