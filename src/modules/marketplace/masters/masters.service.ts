import { Injectable, Logger } from '@nestjs/common';
import type { RequestWithOptionalUser } from '../../../common/decorators/get-user.decorator';
import { decodeId, encodeId } from '../../shared/utils/id-encoder';
import { SearchMastersDto } from './dto/search-masters.dto';
import { SuggestQueryDto } from './dto/suggest-query.dto';
import { UpdateAvailabilityStatusDto } from './dto/update-availability-status.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import type { UpdateAutoresponderSettingsDto } from './dto/update-autoresponder-settings.dto';
import type { UpdateMasterDto } from './dto/update-master.dto';
import type { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import type { UpdateQuickRepliesDto } from './dto/update-quick-replies.dto';
import { MastersAvailabilityService } from './services/masters-availability.service';
import { MastersLandingStatsService } from './services/masters-landing-stats.service';
import { MastersNotificationSettingsService } from './services/masters-notification-settings.service';
import { MastersPhotosService } from './services/masters-photos.service';
import { MastersProfileService } from './services/masters-profile.service';
import { MastersPublicProfileService } from './services/masters-public-profile.service';
import { MastersQuickRepliesService } from './services/masters-quick-replies.service';
import { MastersScheduleService } from './services/masters-schedule.service';
import { MastersSearchService } from './services/masters-search.service';
import { MastersStatsService } from './services/masters-stats.service';
import { MastersTariffService } from './services/masters-tariff.service';

/** Тип callback для инвалидации кеша при обновлении мастера */
type InvalidateCacheFn = (
  masterId: string,
  slug?: string | null,
) => Promise<void>;

/**
 * Центральный координатор мастеров. Делегирует вызовы специализированным сервисам.
 * @see MastersSearchService — поиск и фильтрация
 * @see MastersProfileService — профили
 * @see MastersPhotosService — фото
 * @see MastersStatsService — статистика
 * @see MastersAvailabilityService — онлайн/доступность
 * @see MastersTariffService — тарифы
 */
@Injectable()
export class MastersService {
  private readonly logger = new Logger(MastersService.name);

  constructor(
    private readonly searchService: MastersSearchService,
    private readonly profileService: MastersProfileService,
    private readonly publicProfileService: MastersPublicProfileService,
    private readonly photosService: MastersPhotosService,
    private readonly statsService: MastersStatsService,
    private readonly tariffService: MastersTariffService,
    private readonly availabilityService: MastersAvailabilityService,
    private readonly notificationSettingsService: MastersNotificationSettingsService,
    private readonly scheduleService: MastersScheduleService,
    private readonly quickRepliesService: MastersQuickRepliesService,
    private readonly landingStatsService: MastersLandingStatsService,
  ) {}

  /** Callback для инвалидации кеша — используется методами, обновляющими данные мастера */
  private get onInvalidate(): InvalidateCacheFn {
    return (masterId, slug) => this.invalidateMasterCache(masterId, slug);
  }

  // ==================== ПОИСК И ФИЛЬТРАЦИЯ ====================

  async findAll(searchDto: SearchMastersDto): Promise<unknown> {
    return this.searchService.findAll(searchDto);
  }

  async getSearchFilters() {
    return this.searchService.getSearchFilters();
  }

  async getPopularMasters(limit: number = 10) {
    return this.searchService.getPopularMasters(limit);
  }

  async getNewMasters(limit: number = 10) {
    return this.searchService.getNewMasters(limit);
  }

  async getSuggestions(dto: SuggestQueryDto) {
    return this.searchService.getSuggestions(dto);
  }

  // ==================== ПРОФИЛИ ====================

  /** Публичный профиль мастера по slug или encodedId с трекингом просмотров */
  async findOne(
    slugOrId: string,
    req: RequestWithOptionalUser,
    incrementViews = false,
  ): Promise<unknown> {
    return this.publicProfileService.findOne(slugOrId, req, incrementViews);
  }

  async getProfile(userId: string) {
    return this.profileService.getProfile(userId);
  }

  async updateProfile(
    userId: string,
    updateDto: UpdateMasterDto,
    isVerified = true,
  ) {
    return this.profileService.updateProfile(userId, updateDto, isVerified);
  }

  async updateServices(
    userId: string,
    services: Array<{
      title: string;
      priceType: string;
      price?: number;
      currency?: string;
    }>,
  ) {
    return this.profileService.updateServices(userId, services);
  }

  async getNotificationSettings(userId: string) {
    return this.notificationSettingsService.getNotificationSettings(userId);
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationSettingsService.updateNotificationSettings(
      userId,
      dto,
    );
  }

  // ==================== РАСПИСАНИЕ ====================

  async getScheduleSettings(userId: string) {
    return this.scheduleService.getScheduleSettings(userId);
  }

  async updateScheduleSettings(userId: string, dto: UpdateScheduleSettingsDto) {
    return this.scheduleService.updateScheduleSettings(
      userId,
      dto,
      this.onInvalidate,
    );
  }

  // ==================== ЧАТ: ШАБЛОНЫ И АВТООТВЕТЧИК ====================

  async getQuickReplies(userId: string) {
    return this.quickRepliesService.getQuickReplies(userId);
  }

  async replaceQuickReplies(userId: string, dto: UpdateQuickRepliesDto) {
    return this.quickRepliesService.replaceQuickReplies(
      userId,
      dto,
      this.onInvalidate,
    );
  }

  async getAutoresponderSettings(userId: string) {
    return this.quickRepliesService.getAutoresponderSettings(userId);
  }

  async updateAutoresponderSettings(
    userId: string,
    dto: UpdateAutoresponderSettingsDto,
  ) {
    return this.quickRepliesService.updateAutoresponderSettings(
      userId,
      dto,
      this.onInvalidate,
    );
  }

  // ==================== ФОТОГРАФИИ ====================

  async getMasterPhotos(masterIdOrSlug: string, limit = 15) {
    const decodedId = decodeId(masterIdOrSlug);
    const identifier = decodedId || masterIdOrSlug;
    return this.photosService.getMasterPhotos(identifier, limit);
  }

  async getMyPhotos(userId: string) {
    return this.photosService.getMyPhotos(userId);
  }

  async removeMyPhoto(userId: string, fileId: string) {
    return this.photosService.removeMyPhoto(userId, fileId, this.onInvalidate);
  }

  async setMyAvatar(userId: string, fileId: string) {
    return this.photosService.setMyAvatar(userId, fileId, this.onInvalidate);
  }

  // ==================== СТАТИСТИКА ====================

  async getLandingStats() {
    return this.landingStatsService.getLandingStats();
  }

  async getStats(userId: string) {
    const master = await this.profileService.getProfile(userId);
    return this.statsService.getStats(master.id);
  }

  async getViewsHistory(userId: string, period: 'week' | 'month', limit = 12) {
    const master = await this.profileService.getProfile(userId);
    return this.statsService.getViewsHistory(master.id, period, limit);
  }

  // ==================== ОНЛАЙН СТАТУС ====================

  async updateOnlineStatus(userId: string, isOnline: boolean) {
    return this.availabilityService.updateOnlineStatus(
      userId,
      isOnline,
      this.onInvalidate,
    );
  }

  async updateAvailabilityStatus(
    userId: string,
    dto: UpdateAvailabilityStatusDto,
  ) {
    return this.availabilityService.updateAvailabilityStatus(
      userId,
      dto,
      this.onInvalidate,
    );
  }

  async getAvailabilityStatus(userId: string) {
    return this.availabilityService.getAvailabilityStatus(userId);
  }

  async updateLastActivity(userId: string) {
    return this.availabilityService.updateLastActivity(userId);
  }

  // ==================== ТАРИФЫ ====================

  async getTariff(userId: string) {
    return this.tariffService.getTariff(userId);
  }

  async updateTariff(masterId: string, tariffTypeStr: string, days: number) {
    return this.tariffService.updateTariff(
      masterId,
      tariffTypeStr,
      days,
      this.onInvalidate,
    );
  }

  /**
   * Продлить тариф на N дней (например, награда за реферала).
   * BASIC/истёкший → выдаёт VIP. VIP/PREMIUM → добавляет дни к expiry.
   */
  async extendTariffByDays(masterId: string, days: number) {
    return this.tariffService.extendTariffByDays(
      masterId,
      days,
      this.onInvalidate,
    );
  }

  /** Верифицированный мастер получает тариф бесплатно 1 кликом */
  async claimFreePlan(userId: string, tariffType: 'VIP' | 'PREMIUM') {
    return this.tariffService.claimFreePlan(
      userId,
      tariffType,
      this.onInvalidate,
    );
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  /** Инвалидация кеша мастера */
  private async invalidateMasterCache(masterId: string, slug?: string | null) {
    await this.profileService.invalidateMasterCache(
      masterId,
      slug,
      encodeId(masterId),
    );
  }
}
