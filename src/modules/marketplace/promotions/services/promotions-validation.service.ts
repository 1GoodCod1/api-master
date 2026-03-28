import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { PromotionServiceItem } from '../types';

/**
 * Сервис валидации и проверки правил для акций.
 * Отвечает за: фиксированные услуги, уникальность акции на услугу, «на все» только при наличии свободных услуг.
 */
@Injectable()
export class PromotionsValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Услуги с фиксированной ценой (договорные игнорируются).
   */
  async getFixedServiceTitles(masterId: string): Promise<string[]> {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { services: true },
    });
    const services = (master?.services as PromotionServiceItem[] | null) ?? [];
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
  async getServiceTitlesWithActivePromotion(
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
  async assertNoActivePromotionForService(
    masterId: string,
    serviceTitle: string,
    excludePromotionId?: string,
  ): Promise<void> {
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
      throw AppErrors.conflict(AppErrorMessages.PROMOTION_CONFLICT_SERVICE);
    }
  }

  /**
   * Акция только на услуги с фиксированной ценой; на договорные не распространяется.
   * «На все» можно создавать только если есть хотя бы одна услуга с фикс. ценой без своей акции.
   */
  async assertCanCreateOrUpdatePromotion(
    masterId: string,
    serviceTitle: string | null,
    excludePromotionId?: string,
  ): Promise<void> {
    const fixedTitles = await this.getFixedServiceTitles(masterId);
    const takenTitles = await this.getServiceTitlesWithActivePromotion(
      masterId,
      excludePromotionId,
    );

    if (serviceTitle) {
      const title = serviceTitle.trim();
      if (!fixedTitles.includes(title)) {
        throw AppErrors.badRequest(AppErrorMessages.PROMOTION_FIXED_PRICE_ONLY);
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
      throw AppErrors.conflict(AppErrorMessages.PROMOTION_CONFLICT_ALL);
    }
  }
}
