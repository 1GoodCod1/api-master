import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { CacheService } from '../shared/cache/cache.service';
import { getEffectiveTariff } from '../../common/helpers/plans';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { InAppNotificationService } from '../notifications/services/in-app-notification.service';

type ServiceItem = { title?: string | null; priceType?: string | null };

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly notifications: InAppNotificationService,
  ) {}

  /**
   * Услуги с фиксированной ценой (договорные игнорируются).
   */
  private async getFixedServiceTitles(masterId: string): Promise<string[]> {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { services: true },
    });
    const services = (master?.services as ServiceItem[] | null) ?? [];
    return services
      .filter(
        (s) =>
          s?.priceType === 'FIXED' &&
          typeof s?.title === 'string' &&
          String(s.title).trim(),
      )
      .map((s) => String(s.title).trim());
  }

  /**
   * Заголовки услуг, на которые уже действует активная акция (одна услуга — одна акция).
   */
  private async getServiceTitlesWithActivePromotion(
    masterId: string,
    excludePromotionId?: string,
  ): Promise<string[]> {
    const now = new Date();
    const list = await this.prisma.promotion.findMany({
      where: {
        masterId,
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
        serviceTitle: { not: null },
        ...(excludePromotionId ? { id: { not: excludePromotionId } } : {}),
      },
      select: { serviceTitle: true },
    });
    return list
      .map((p) => p.serviceTitle)
      .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
      .map((t) => t.trim());
  }

  /**
   * Проверить, что на данную услугу ещё нет активной акции (одна услуга — одна акция).
   */
  private async assertNoActivePromotionForService(
    masterId: string,
    serviceTitle: string,
    excludePromotionId?: string,
  ) {
    const now = new Date();
    const existing = await this.prisma.promotion.findFirst({
      where: {
        masterId,
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
        serviceTitle: serviceTitle.trim(),
        ...(excludePromotionId ? { id: { not: excludePromotionId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        'На эту услугу уже действует акция. Создайте акцию на другую услугу или дождитесь окончания текущей.',
      );
    }
  }

  /**
   * Акция только на услуги с фиксированной ценой; на договорные не распространяется.
   * «На все» можно создавать только если есть хотя бы одна услуга с фикс. ценой без своей акции.
   */
  private async assertCanCreateOrUpdatePromotion(
    masterId: string,
    serviceTitle: string | null,
    excludePromotionId?: string,
  ) {
    const fixedTitles = await this.getFixedServiceTitles(masterId);
    const takenTitles = await this.getServiceTitlesWithActivePromotion(
      masterId,
      excludePromotionId,
    );

    if (serviceTitle) {
      const title = serviceTitle.trim();
      if (!fixedTitles.includes(title)) {
        throw new BadRequestException(
          'Акцию можно применять только к услугам с фиксированной ценой. Этой услуги нет в списке или у неё договорная цена.',
        );
      }
      await this.assertNoActivePromotionForService(
        masterId,
        title,
        excludePromotionId,
      );
      return;
    }

    const fixedWithoutPromotion = fixedTitles.filter(
      (t) => !takenTitles.includes(t),
    );
    if (fixedWithoutPromotion.length === 0) {
      throw new ConflictException(
        'Нельзя применить акцию ко всем услугам: на все услуги с фиксированной ценой уже действуют акции. Создайте акцию на одну конкретную услугу или дождитесь окончания текущих.',
      );
    }
  }

  /**
   * Создать новую акцию (мастер).
   * Только PREMIUM. Проверки: только услуги с фикс. ценой; одна услуга — одна акция; «на все» только если есть куда применять.
   */
  async create(masterId: string, dto: CreatePromotionDto) {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { tariffType: true, tariffExpiresAt: true },
    });
    if (getEffectiveTariff(master) !== 'PREMIUM') {
      throw new ForbiddenException(
        'Service promotions are available for PREMIUM plan only.',
      );
    }
    const serviceTitle = dto.serviceTitle?.trim() || null;
    await this.assertCanCreateOrUpdatePromotion(masterId, serviceTitle);
    const promotion = await this.prisma.promotion.create({
      data: {
        masterId,
        title: dto.title,
        description: dto.description,
        discount: dto.discount,
        serviceTitle: dto.serviceTitle?.trim() || null,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        isActive: dto.isActive ?? true,
      },
      include: {
        master: {
          select: {
            user: { select: { firstName: true, lastName: true } },
            city: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
    });

    // Отправить уведомления клиентам (тем кто в избранном или писал)
    // В данном примере: всем кто держит в фаворитах
    const interestedClients = await this.prisma.favorite.findMany({
      where: { masterId },
      select: { userId: true },
    });

    const masterName = promotion.master.user.firstName || 'Мастер';

    // Массовая рассылка (в реальном приложении лучше через очередь Bull)
    for (const fav of interestedClients) {
      await this.notifications
        .notifyNewPromotion(fav.userId, {
          masterId,
          masterName,
          promotionId: promotion.id,
          discount: promotion.discount,
        })
        .catch((e) =>
          this.logger.error(`Failed to notify user ${fav.userId}`, e),
        );
    }

    await this.invalidatePromotionCache();
    return promotion;
  }

  /**
   * Получить акции текущего мастера
   */
  async findMyPromotions(masterId: string) {
    return this.prisma.promotion.findMany({
      where: { masterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Обновить акцию (только PREMIUM)
   */
  async update(id: string, masterId: string, dto: UpdatePromotionDto) {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { tariffType: true, tariffExpiresAt: true },
    });
    if (getEffectiveTariff(master) !== 'PREMIUM') {
      throw new ForbiddenException(
        'Service promotions are available for PREMIUM plan only.',
      );
    }
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException('Акция не найдена');
    if (promotion.masterId !== masterId)
      throw new ForbiddenException('Нет доступа');

    const newServiceTitle =
      dto.serviceTitle !== undefined
        ? dto.serviceTitle?.trim() || null
        : promotion.serviceTitle;
    await this.assertCanCreateOrUpdatePromotion(masterId, newServiceTitle, id);

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.serviceTitle !== undefined && {
          serviceTitle: dto.serviceTitle?.trim() || null,
        }),
        ...(dto.validFrom !== undefined && {
          validFrom: new Date(dto.validFrom),
        }),
        ...(dto.validUntil !== undefined && {
          validUntil: new Date(dto.validUntil),
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.invalidatePromotionCache();
    return updated;
  }

  /**
   * Удалить акцию (только PREMIUM)
   */
  async remove(id: string, masterId: string) {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { tariffType: true, tariffExpiresAt: true },
    });
    if (getEffectiveTariff(master) !== 'PREMIUM') {
      throw new ForbiddenException(
        'Service promotions are available for PREMIUM plan only.',
      );
    }
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException('Акция не найдена');
    if (promotion.masterId !== masterId)
      throw new ForbiddenException('Нет доступа');

    await this.prisma.promotion.delete({ where: { id } });
    await this.invalidatePromotionCache();
    return { deleted: true };
  }

  /**
   * Получить все активные акции (публичный эндпоинт для HomePage)
   */
  async findActivePromotions(limit = 10) {
    const cacheKey = `cache:promotions:active:limit:${limit}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        return this.prisma.promotion.findMany({
          where: {
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
            master: { user: { isVerified: true } },
          },
          include: {
            master: {
              select: {
                id: true,
                slug: true,
                rating: true,
                totalReviews: true,
                avatarFileId: true,
                user: { select: { firstName: true, lastName: true } },
                city: { select: { name: true } },
                category: { select: { name: true } },
                photos: {
                  select: { file: { select: { path: true } } },
                  take: 1,
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { discount: 'desc' },
          take: limit,
        });
      },
      300, // 5 min TTL
    );
  }

  /**
   * Получить все активные акции мастера (для страницы мастера: своя акция на услугу или единая «на все»).
   * Для неверифицированных мастеров возвращаем пустой массив.
   * Кэшируется на 5 мин; инвалидируется при create/update/remove через invalidatePromotionCache.
   */
  async findActivePromotionsForMaster(masterId: string) {
    const cacheKey = `cache:promotions:master:${masterId}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const master = await this.prisma.master.findUnique({
          where: { id: masterId },
          include: { user: { select: { isVerified: true } } },
        });
        if (!master || !(master.user as { isVerified?: boolean })?.isVerified) {
          return [];
        }

        const now = new Date();
        return this.prisma.promotion.findMany({
          where: {
            masterId,
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
          },
          orderBy: { discount: 'desc' },
        });
      },
      300, // 5 min TTL
    );
  }

  private async invalidatePromotionCache() {
    await this.cache.invalidate('cache:promotions:*');
  }
}
