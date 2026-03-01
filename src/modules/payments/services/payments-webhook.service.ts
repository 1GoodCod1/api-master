import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { InAppNotificationService } from '../../notifications/services/in-app-notification.service';
import { CacheService } from '../../shared/cache/cache.service';
import { TariffType } from '@prisma/client';
import { PaymentStatus } from '../../../common/constants';

@Injectable()
export class PaymentsWebhookService {
  private readonly logger = new Logger(PaymentsWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Завершение оплаты по MIA callback (orderId = payment.id)
   * Обрабатывает как тарифы, так и пины.
   */
  async completeMiaTariffPayment(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: orderId },
    });
    if (!payment || payment.status !== PaymentStatus.PENDING) return;
    const meta =
      (payment.metadata as {
        provider?: string;
        days?: number;
        type?: string;
        pinType?: string;
        categoryId?: string | null;
        cityId?: string | null;
        paymentType?: string;
        photoPackage?: number;
      }) || {};
    if (meta.provider !== 'MIA') return;

    await this.prisma.payment.update({
      where: { id: orderId },
      data: { status: PaymentStatus.SUCCESS, paidAt: new Date() },
    });

    const days = meta.days ?? 30;

    // Handle tariff payments
    if (payment.tariffType) {
      await this.updateMasterTariff(
        payment.masterId,
        String(payment.tariffType),
        days,
      );

      // Notify master about successful tariff payment
      try {
        const master = await this.prisma.master.findUnique({
          where: { id: payment.masterId },
          select: { userId: true },
        });
        if (master) {
          await this.inAppNotifications.notifyPaymentSuccess(master.userId, {
            paymentId: orderId,
            tariffType: String(payment.tariffType),
            amount: String(payment.amount),
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Failed to send in-app payment notification: ${msg}`);
      }
    }
  }

  /**
   * Обновление тарифа мастера
   */
  private async updateMasterTariff(
    masterId: string,
    tariffTypeStr: string,
    days: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    let tariffType: TariffType;
    switch (tariffTypeStr) {
      case 'VIP':
        tariffType = TariffType.VIP;
        break;
      case 'PREMIUM':
        tariffType = TariffType.PREMIUM;
        break;
      default:
        tariffType = TariffType.BASIC;
    }

    const master = await this.prisma.master.update({
      where: { id: masterId },
      data: {
        tariffType,
        tariffExpiresAt: expiresAt,
        isFeatured: tariffType !== TariffType.BASIC,
        tariffCancelAtPeriodEnd: false,
        pendingUpgradeTo: null,
        pendingUpgradeCreatedAt: null,
      },
      select: { userId: true },
    });

    await this.invalidateCachesForTariffChange(masterId, master.userId);
  }

  /**
   * Инвалидация кэшей при изменении тарифа.
   * Без этого PlansGuard и JWT strategy продолжают возвращать старые данные из кэша.
   */
  private async invalidateCachesForTariffChange(
    masterId: string,
    userId: string,
  ): Promise<void> {
    try {
      await Promise.all([
        this.cache.del(this.cache.keys.userMasterProfile(userId)),
        this.cache.del(this.cache.keys.userProfile(userId)),
        this.cache.invalidate(`cache:master:${masterId}:*`),
        this.cache.invalidate('cache:search:masters:*'),
        this.cache.invalidate('cache:masters:top:*'),
        this.cache.invalidate('cache:masters:popular:*'),
        this.cache.invalidate('cache:masters:new:*'),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Failed to invalidate caches after tariff change: ${msg}`,
      );
    }
  }
}
