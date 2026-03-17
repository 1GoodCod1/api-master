import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

type ServiceItem = { title?: string | null; priceType?: string | null };

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
      throw new ConflictException(
        'На эту услугу уже действует акция. Создайте акцию на другую услугу или дождитесь окончания текущей.',
      );
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
}
