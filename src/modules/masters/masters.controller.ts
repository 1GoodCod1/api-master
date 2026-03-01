import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MastersService } from './masters.service';
import { UpdateMasterDto } from './dto/update-master.dto';
import { SearchMastersDto } from './dto/search-masters.dto';
import { SetMasterAvatarDto } from './dto/set-avatar.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { UpdateAvailabilityStatusDto } from './dto/update-availability-status.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import { UpdateQuickRepliesDto } from './dto/update-quick-replies.dto';
import { UpdateAutoresponderSettingsDto } from './dto/update-autoresponder-settings.dto';
import { ClaimFreePlanDto } from './dto/claim-free-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlansGuard } from '../../common/guards/plans.guard';
import { Plans } from '../../common/decorators/plans.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import type { RequestWithOptionalUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Masters')
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  @Get()
  @ApiOperation({ summary: 'Search masters with filters' })
  async findAll(@Query() searchDto: SearchMastersDto) {
    return this.mastersService.findAll(searchDto);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available search filters' })
  async getFilters() {
    return this.mastersService.getSearchFilters();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular masters' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPopularMasters(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.mastersService.getPopularMasters(limit);
  }

  @Get(':slug/photos')
  @ApiOperation({ summary: 'Get master photos (public, max 15)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMasterPhotos(
    @Param('slug') slugOrId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 15,
  ) {
    return this.mastersService.getMasterPhotos(slugOrId, limit);
  }

  @Get('new')
  @ApiOperation({ summary: 'Get new masters' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNewMasters(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.mastersService.getNewMasters(limit);
  }

  @Get('landing-stats')
  @ApiOperation({ summary: 'Get landing page stats (public)' })
  async getLandingStats() {
    return this.mastersService.getLandingStats();
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get master profile (authenticated)' })
  async getProfile(@GetUser() user: JwtUser) {
    return this.mastersService.getProfile(user.id);
  }

  @Put('profile/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update master profile' })
  async updateProfile(
    @GetUser() user: JwtUser,
    @Body() updateDto: UpdateMasterDto,
  ) {
    return this.mastersService.updateProfile(user.id, updateDto);
  }

  @Patch('avatar/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set current user master avatar by fileId' })
  async setAvatar(@Body() dto: SetMasterAvatarDto, @GetUser() user: JwtUser) {
    return this.mastersService.setMyAvatar(user.id, dto.fileId);
  }

  @Get('photos/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my photos' })
  async getMyPhotos(@GetUser() user: JwtUser) {
    return this.mastersService.getMyPhotos(user.id);
  }

  @Delete('photos/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get by my photo by id' })
  async removeMyPhoto(
    @Param('fileId') fileId: string,
    @GetUser() user: JwtUser,
  ) {
    return this.mastersService.removeMyPhoto(user.id, fileId);
  }

  @Get('tariff/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tariff info' })
  async getTariff(@GetUser() user: JwtUser) {
    return this.mastersService.getTariff(user.id);
  }

  @Post('tariff/claim-free')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Claim free plan (verified masters only, 1-click)',
  })
  async claimFreePlan(@GetUser() user: JwtUser, @Body() dto: ClaimFreePlanDto) {
    return this.mastersService.claimFreePlan(user.id, dto.tariffType);
  }

  @Get('stats/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get master statistics' })
  async getStats(@GetUser() user: JwtUser) {
    return this.mastersService.getStats(user.id);
  }

  @Get('stats/me/views-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile views history (past weeks or months)' })
  @ApiQuery({ name: 'period', required: true, enum: ['week', 'month'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getViewsHistory(
    @GetUser() user: JwtUser,
    @Query('period') period: 'week' | 'month' = 'week',
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 12,
  ) {
    const safePeriod = period === 'month' ? 'month' : 'week';
    return this.mastersService.getViewsHistory(
      user.id,
      safePeriod,
      Math.min(Math.max(limit || 12, 1), 24),
    );
  }

  @Patch('online-status/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update master online status' })
  async updateOnlineStatus(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateOnlineStatusDto,
  ) {
    return this.mastersService.updateOnlineStatus(user.id, dto.isOnline);
  }

  @Patch('availability-status/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update master availability status and max leads' })
  async updateAvailabilityStatus(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateAvailabilityStatusDto,
  ) {
    return this.mastersService.updateAvailabilityStatus(user.id, dto);
  }

  @Get('availability-status/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get master availability status' })
  async getAvailabilityStatus(@GetUser() user: JwtUser) {
    return this.mastersService.getAvailabilityStatus(user.id);
  }

  @Get('notifications-settings/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification settings (Telegram, WhatsApp)' })
  async getNotificationSettings(@GetUser() user: JwtUser) {
    return await this.mastersService.getNotificationSettings(user.id);
  }

  @Patch('notifications-settings/me')
  @UseGuards(JwtAuthGuard, RolesGuard, PlansGuard)
  @Plans('VIP', 'PREMIUM')
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update notification settings (Telegram, WhatsApp). Premium only.',
  })
  async updateNotificationSettings(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return await this.mastersService.updateNotificationSettings(user.id, dto);
  }

  @Get('schedule-settings/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get schedule settings (working hours, slot duration)',
  })
  async getScheduleSettings(@GetUser() user: JwtUser) {
    return await this.mastersService.getScheduleSettings(user.id);
  }

  @Patch('schedule-settings/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update schedule settings (working hours, slot duration)',
  })
  async updateScheduleSettings(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateScheduleSettingsDto,
  ) {
    return await this.mastersService.updateScheduleSettings(user.id, dto);
  }

  @Get('quick-replies/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my quick replies (master)' })
  async getMyQuickReplies(@GetUser() user: JwtUser) {
    return this.mastersService.getQuickReplies(user.id);
  }

  @Put('quick-replies/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace my quick replies list (master)' })
  async replaceMyQuickReplies(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateQuickRepliesDto,
  ) {
    return this.mastersService.replaceQuickReplies(user.id, dto);
  }

  @Get('autoresponder/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my autoresponder settings (master)' })
  async getMyAutoresponderSettings(@GetUser() user: JwtUser) {
    return this.mastersService.getAutoresponderSettings(user.id);
  }

  @Patch('autoresponder/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MASTER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my autoresponder settings (master)' })
  async updateMyAutoresponderSettings(
    @GetUser() user: JwtUser,
    @Body() dto: UpdateAutoresponderSettingsDto,
  ) {
    return this.mastersService.updateAutoresponderSettings(user.id, dto);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get master by slug or ID' })
  async findOne(
    @Param('slug') slugOrId: string,
    @Req() req: RequestWithOptionalUser,
  ): Promise<unknown> {
    return this.mastersService.findOne(slugOrId, req, true);
  }
}
