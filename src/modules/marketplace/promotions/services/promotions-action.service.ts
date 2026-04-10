import { Injectable, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { NotificationEventEmitter } from '../../../notifications/events';
import { TariffType } from '../../../../common/constants';
import { getEffectiveTariff } from '../../../../common/helpers/plans';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { PromotionsValidationService } from './promotions-validation.service';

/**
 * Сервис мутаций акций.
 * Отвечает за: создание, обновление, удаление; проверка тарифа PREMIUM; уведомления; инвалидация кэша.
 */
@Injectable()
export class PromotionsActionService {
  private readonly logger = new Logger(PromotionsActionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly notificationEvents: NotificationEventEmitter,
    private readonly validationService: PromotionsValidationService,
  ) {}

  /**
   * Создать новую акцию (мастер).
   * Только PREMIUM. Проверки: только услуги с фикс. ценой; одна услуга — одна акция; «на все» только если есть куда применять.
   */
  async create(masterId: string, dto: CreatePromotionDto) {
    await this.assertPremiumTariff(masterId);

    const serviceTitle = dto.serviceTitle?.trim() || null;
    await this.validationService.assertCanCreateOrUpdatePromotion(
      masterId,
      serviceTitle,
    );

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

    await this.notifyInterestedClients(promotion, masterId);
    await this.invalidatePromotionCache();
    return promotion;
  }

  /**
   * Обновить акцию (только PREMIUM)
   */
  async update(id: string, masterId: string, dto: UpdatePromotionDto) {
    await this.assertPremiumTariff(masterId);

    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion)
      throw AppErrors.notFound(AppErrorMessages.PROMOTION_NOT_FOUND);
    if (promotion.masterId !== masterId)
      throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);

    const newServiceTitle =
      dto.serviceTitle !== undefined
        ? dto.serviceTitle?.trim() || null
        : promotion.serviceTitle;
    await this.validationService.assertCanCreateOrUpdatePromotion(
      masterId,
      newServiceTitle,
      id,
    );

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
    await this.assertPremiumTariff(masterId);

    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion)
      throw AppErrors.notFound(AppErrorMessages.PROMOTION_NOT_FOUND);
    if (promotion.masterId !== masterId)
      throw AppErrors.forbidden(AppErrorMessages.ACCESS_DENIED);

    await this.prisma.promotion.delete({ where: { id } });
    await this.invalidatePromotionCache();
    return { deleted: true };
  }

  private async assertPremiumTariff(masterId: string): Promise<void> {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { tariffType: true, tariffExpiresAt: true },
    });
    if (getEffectiveTariff(master) !== TariffType.PREMIUM) {
      throw AppErrors.forbidden(AppErrorMessages.PROMOTION_PREMIUM_ONLY);
    }
  }

  private async notifyInterestedClients(
    promotion: {
      id: string;
      discount: number;
      master: { user: { firstName?: string | null } };
    },
    masterId: string,
  ): Promise<void> {
    const interestedClients = await this.prisma.favorite.findMany({
      where: { masterId },
      select: { userId: true },
    });

    const masterName = promotion.master.user.firstName || 'Мастер';

    for (const fav of interestedClients) {
      this.notificationEvents.notifyNewPromotion(fav.userId, {
        masterId,
        masterName,
        promotionId: promotion.id,
        discount: promotion.discount,
      });
    }
  }

  private async invalidatePromotionCache(): Promise<void> {
    await this.cache.invalidate(this.cache.patterns.promotions());
  }
}
