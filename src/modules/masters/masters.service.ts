import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { LeadStatus, VerificationStatus } from '../../common/constants';
import type { RequestWithOptionalUser } from '../../common/decorators/get-user.decorator';
import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { SearchMastersDto } from './dto/search-masters.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityEvent } from '../recommendations/events/activity.events';
import { MastersSearchService } from './services/masters-search.service';
import { MastersProfileService } from './services/masters-profile.service';
import { MastersPhotosService } from './services/masters-photos.service';
import { MastersStatsService } from './services/masters-stats.service';
import { MastersTariffService } from './services/masters-tariff.service';
import { decodeId } from '../shared/utils/id-encoder';
import { getEffectiveTariff } from '../../common/helpers/plans';
import { UpdateAvailabilityStatusDto } from './dto/update-availability-status.dto';
import { UpdateScheduleSettingsDto } from './dto/update-schedule-settings.dto';
import type { UpdateQuickRepliesDto } from './dto/update-quick-replies.dto';
import type { UpdateAutoresponderSettingsDto } from './dto/update-autoresponder-settings.dto';

/**
 * Главный сервис мастеров - координатор для специализированных сервисов.
 * Делегирует вызовы соответствующим сервисам, обрабатывая валидацию и права доступа.
 */
@Injectable()
export class MastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly searchService: MastersSearchService,
    private readonly profileService: MastersProfileService,
    private readonly photosService: MastersPhotosService,
    private readonly statsService: MastersStatsService,
    private readonly tariffService: MastersTariffService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== ПОИСК И ФИЛЬТРАЦИЯ ====================

  async findAll(searchDto: SearchMastersDto) {
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

  // ==================== ПРОФИЛИ ====================

  /**
   * Публичный профиль мастера по slug или encodedId
   */
  async findOne(
    slugOrId: string,
    req: RequestWithOptionalUser,
    incrementViews = false,
  ): Promise<unknown> {
    const decodedId = decodeId(slugOrId);
    const identifier = decodedId || slugOrId;

    const userId = req.user?.id;
    const reqWithSession = req as RequestWithOptionalUser & {
      sessionID?: string;
    };
    const sessionId =
      reqWithSession.sessionID ||
      (req.headers['x-session-id'] as string | undefined);
    const ipAddress =
      req.ip ||
      (req.headers['x-forwarded-for'] as string | undefined) ||
      req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const onViewIncrement = (
      masterId: string,
      uid?: string,
      sid?: string,
      ip?: string,
      ua?: string,
      catId?: string,
      cityId?: string,
    ) => this.handleViewIncrement(masterId, uid, sid, ip, ua, catId, cityId);
    return this.profileService.findOne(
      identifier,
      incrementViews,
      userId,
      sessionId,
      ipAddress,
      userAgent,
      undefined,
      undefined,
      onViewIncrement,
    );
  }

  async getProfile(userId: string) {
    return this.profileService.getProfile(userId);
  }

  async updateProfile(
    userId: string,
    updateDto: import('./dto/update-master.dto').UpdateMasterDto,
  ) {
    return this.profileService.updateProfile(userId, updateDto);
  }

  async getNotificationSettings(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: {
        telegramChatId: true,
        whatsappPhone: true,
      },
    });
    if (!master) throw new NotFoundException('Master profile not found');
    return master;
  }

  async updateNotificationSettings(
    userId: string,
    dto: import('./dto/update-notification-settings.dto').UpdateNotificationSettingsDto,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const data: {
      telegramChatId?: string | null;
      whatsappPhone?: string | null;
    } = {};

    if (dto.telegramChatId !== undefined)
      data.telegramChatId = dto.telegramChatId;
    if (dto.whatsappPhone !== undefined) data.whatsappPhone = dto.whatsappPhone;

    return this.prisma.master.update({
      where: { userId },
      data,
    });
  }

  // ==================== РАСПИСАНИЕ ====================

  async getScheduleSettings(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: {
        workStartHour: true,
        workEndHour: true,
        slotDurationMinutes: true,
      },
    });
    if (!master) throw new NotFoundException('Master profile not found');
    return master;
  }

  async updateScheduleSettings(userId: string, dto: UpdateScheduleSettingsDto) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, workStartHour: true, workEndHour: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const startHour = dto.workStartHour ?? master.workStartHour;
    const endHour = dto.workEndHour ?? master.workEndHour;

    if (startHour >= endHour) {
      throw new ForbiddenException(
        'Work start hour must be less than work end hour',
      );
    }

    const data: {
      workStartHour?: number;
      workEndHour?: number;
      slotDurationMinutes?: number;
    } = {};
    if (dto.workStartHour !== undefined) data.workStartHour = dto.workStartHour;
    if (dto.workEndHour !== undefined) data.workEndHour = dto.workEndHour;
    if (dto.slotDurationMinutes !== undefined)
      data.slotDurationMinutes = dto.slotDurationMinutes;

    const updated = await this.prisma.master.update({
      where: { userId },
      data,
      select: {
        workStartHour: true,
        workEndHour: true,
        slotDurationMinutes: true,
      },
    });

    await this.invalidateMasterCache(master.id, master.slug);

    return { success: true, ...updated };
  }

  // ==================== ЧАТ: ШАБЛОНЫ И АВТООТВЕТЧИК ====================

  async getQuickReplies(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const items = await this.prisma.quickReply.findMany({
      where: { masterId: master.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, text: true, order: true },
    });

    return { items };
  }

  async replaceQuickReplies(userId: string, dto: UpdateQuickRepliesDto) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const itemsWithOrder = dto.items.map((it, index) => ({
      text: it.text,
      order: it.order ?? index,
    }));

    await this.prisma.$transaction([
      this.prisma.quickReply.deleteMany({ where: { masterId: master.id } }),
      this.prisma.quickReply.createMany({
        data: itemsWithOrder.map((it) => ({
          masterId: master.id,
          text: it.text,
          order: it.order,
        })),
      }),
    ]);

    const updated = await this.prisma.quickReply.findMany({
      where: { masterId: master.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, text: true, order: true },
    });

    await this.invalidateMasterCache(master.id, master.slug);

    return { success: true, items: updated };
  }

  async getAutoresponderSettings(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: {
        autoresponderEnabled: true,
        autoresponderMessage: true,
        workStartHour: true,
        workEndHour: true,
      },
    });
    if (!master) throw new NotFoundException('Master profile not found');
    return master;
  }

  async updateAutoresponderSettings(
    userId: string,
    dto: UpdateAutoresponderSettingsDto,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const data: {
      autoresponderEnabled?: boolean;
      autoresponderMessage?: string | null;
    } = {};
    if (dto.enabled !== undefined) data.autoresponderEnabled = dto.enabled;
    if (dto.message !== undefined) data.autoresponderMessage = dto.message;

    const updated = await this.prisma.master.update({
      where: { userId },
      data,
      select: { autoresponderEnabled: true, autoresponderMessage: true },
    });

    await this.invalidateMasterCache(master.id, master.slug);

    return { success: true, ...updated };
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
    const onInvalidate = (masterId: string, slug: string | null) =>
      this.invalidateMasterCache(masterId, slug);
    return this.photosService.removeMyPhoto(userId, fileId, onInvalidate);
  }

  async setMyAvatar(userId: string, fileId: string) {
    const onInvalidate = (masterId: string, slug: string | null) =>
      this.invalidateMasterCache(masterId, slug);
    return this.photosService.setMyAvatar(userId, fileId, onInvalidate);
  }

  // ==================== СТАТИСТИКА ====================

  /**
   * Публичная статистика для лендинга (hero): верифицированные мастера, закрытые заявки, средний рейтинг.
   * Кешируется для снижения нагрузки — данные обновляются каждые 10 минут.
   */
  async getLandingStats(): Promise<{
    verifiedMastersCount: number;
    verifiedOnlineMastersCount: number;
    completedProjectsCount: number;
    averageRating: number;
    support24_7: true;
  }> {
    const cacheKey = 'cache:landing:stats';

    const cached = await this.cache.get<{
      verifiedMastersCount: number;
      verifiedOnlineMastersCount: number;
      completedProjectsCount: number;
      averageRating: number;
      support24_7: true;
    }>(cacheKey);

    if (cached) return cached;

    const verifiedWhere = {
      OR: [
        { user: { isVerified: true } },
        { verification: { status: VerificationStatus.APPROVED } },
      ],
    };
    const [
      verifiedMastersCount,
      verifiedOnlineMastersCount,
      completedProjectsCount,
      ratingAgg,
    ] = await Promise.all([
      this.prisma.master.count({ where: verifiedWhere }),
      this.prisma.master.count({
        where: {
          ...verifiedWhere,
          isOnline: true,
        },
      }),
      this.prisma.lead.count({ where: { status: LeadStatus.CLOSED } }),
      this.prisma.master.aggregate({
        _avg: { rating: true },
        where: { rating: { gt: 0 } },
      }),
    ]);
    const averageRating =
      ratingAgg._avg.rating != null
        ? Math.round(ratingAgg._avg.rating * 10) / 10
        : 4.9;

    const result = {
      verifiedMastersCount,
      verifiedOnlineMastersCount,
      completedProjectsCount,
      averageRating,
      support24_7: true as const,
    };

    // Cache for 10 minutes
    await this.cache.set(cacheKey, result, 600);

    return result;
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
    const master = await this.profileService.getProfile(userId);

    const updated = await this.prisma.master.update({
      where: { id: master.id },
      data: {
        isOnline,
        lastActivityAt: new Date(),
      },
      select: {
        id: true,
        isOnline: true,
        lastActivityAt: true,
      },
    });

    // Инвалидируем кеш профиля
    await this.invalidateMasterCache(master.id, master.slug);

    return {
      success: true,
      isOnline: updated.isOnline,
      lastActivityAt: updated.lastActivityAt,
    };
  }

  async updateAvailabilityStatus(
    userId: string,
    dto: UpdateAvailabilityStatusDto,
  ) {
    const master = await this.profileService.getProfile(userId);
    const isPremium = getEffectiveTariff(master) === 'PREMIUM';
    if (!isPremium) {
      throw new ForbiddenException(
        'Availability status (Available/Busy) and max leads limit are PREMIUM features.',
      );
    }

    const updateData: {
      availabilityStatus: UpdateAvailabilityStatusDto['availabilityStatus'];
      lastActivityAt: Date;
      maxActiveLeads?: number;
    } = {
      availabilityStatus: dto.availabilityStatus,
      lastActivityAt: new Date(),
    };

    if (dto.maxActiveLeads !== undefined) {
      updateData.maxActiveLeads = dto.maxActiveLeads;
    }

    // Если статус меняется на AVAILABLE и есть подписчики, отправим уведомления
    const needsNotification =
      dto.availabilityStatus === 'AVAILABLE' &&
      master.availabilityStatus !== 'AVAILABLE';

    const updated = await this.prisma.master.update({
      where: { id: master.id },
      data: updateData,
      select: {
        id: true,
        availabilityStatus: true,
        maxActiveLeads: true,
        currentActiveLeads: true,
        lastActivityAt: true,
      },
    });

    // Инвалидируем кеш профиля
    await this.invalidateMasterCache(master.id, master.slug);

    // Отправка уведомлений подписчикам
    if (needsNotification) {
      this.eventEmitter.emit('master.available', { masterId: master.id });
    }

    return {
      success: true,
      ...updated,
    };
  }

  async getAvailabilityStatus(userId: string) {
    const master = await this.profileService.getProfile(userId);

    const data = await this.prisma.master.findUnique({
      where: { id: master.id },
      select: {
        availabilityStatus: true,
        maxActiveLeads: true,
        currentActiveLeads: true,
        isOnline: true,
        lastActivityAt: true,
      },
    });

    if (!data) {
      throw new NotFoundException('Master availability data not found');
    }

    return {
      success: true,
      ...data,
      canAcceptLeads:
        data.availabilityStatus === 'AVAILABLE' &&
        data.currentActiveLeads < data.maxActiveLeads,
    };
  }

  async updateLastActivity(userId: string) {
    try {
      const master = await this.prisma.master.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (master) {
        await this.prisma.master.update({
          where: { id: master.id },
          data: { lastActivityAt: new Date() },
        });
      }
    } catch {
      // Игнорируем ошибки обновления активности
    }
  }

  // ==================== ТАРИФЫ ====================

  async getTariff(userId: string) {
    return this.tariffService.getTariff(userId);
  }

  async updateTariff(masterId: string, tariffTypeStr: string, days: number) {
    const onInvalidate = (mid: string, slug: string | null) =>
      this.invalidateMasterCache(mid, slug);
    return this.tariffService.updateTariff(
      masterId,
      tariffTypeStr,
      days,
      onInvalidate,
    );
  }

  /**
   * Верифицированный мастер получает любой тариф бесплатно 1 кликом (до настройки оплаты).
   */
  async claimFreePlan(userId: string, tariffType: 'VIP' | 'PREMIUM') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { masterProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'MASTER')
      throw new BadRequestException('Only masters can claim a free plan');
    if (!user.isVerified)
      throw new BadRequestException(
        'Verification required. Complete verification to claim a free plan.',
      );
    if (!user.masterProfile)
      throw new NotFoundException('Master profile not found');

    const DAYS_FREE = 30;
    const result = await this.updateTariff(
      user.masterProfile.id,
      tariffType,
      DAYS_FREE,
    );
    // Инвалидируем кеш пользователя, чтобы JWT и auth/me вернули новый тариф
    await Promise.all([
      this.cache.del(this.cache.keys.userProfile(userId)),
      this.cache.del(this.cache.keys.userMasterProfile(userId)),
    ]);
    return result;
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  /**
   * Обработка инкремента просмотров с отслеживанием активности.
   * Учитываются только клиентские просмотры:
   * - исключены просмотры самого себя и других мастеров;
   * - 1 запись на клиента в день (повторные просмотры не учитываются).
   */
  private async handleViewIncrement(
    masterId: string,
    userId?: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
    categoryId?: string,
    cityId?: string,
  ) {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    if (userId) {
      const [profileMaster, viewerMaster] = await Promise.all([
        this.prisma.master.findUnique({
          where: { id: masterId },
          select: { userId: true },
        }),
        this.prisma.master.findUnique({
          where: { userId },
          select: { id: true },
        }),
      ]);
      if (profileMaster?.userId === userId) return;
      if (viewerMaster) return;
    }

    const viewerIdent = userId
      ? { userId }
      : sessionId
        ? { sessionId }
        : ipAddress
          ? { ipAddress }
          : null;
    if (viewerIdent) {
      const alreadyViewedToday = await this.prisma.userActivity.findFirst({
        where: {
          masterId,
          action: 'view',
          createdAt: { gte: todayStart },
          ...viewerIdent,
        },
      });
      if (alreadyViewedToday) return;
    }

    await this.prisma.master.update({
      where: { id: masterId },
      data: { views: { increment: 1 } },
    });

    this.eventEmitter.emit(ActivityEvent.TRACKED, {
      userId,
      sessionId,
      action: 'view',
      masterId,
      categoryId,
      cityId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Инвалидация кеша мастера
   */
  private async invalidateMasterCache(masterId: string, slug?: string | null) {
    await this.profileService.invalidateMasterCache(masterId, slug, slug);
  }
}
