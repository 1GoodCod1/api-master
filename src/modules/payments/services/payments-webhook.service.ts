import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { InAppNotificationService } from '../../notifications/notifications/services/in-app-notification.service';
import { NotificationsService } from '../../notifications/notifications/notifications.service';
import { CacheService } from '../../shared/cache/cache.service';
import { TariffType } from '@prisma/client';
import { PaymentStatus } from '../../../common/constants';

@Injectable()
export class PaymentsWebhookService {
  private readonly logger = new Logger(PaymentsWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly notifications: NotificationsService,
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

    // Обработка платежей за тариф
    if (payment.tariffType) {
      await this.updateMasterTariff(
        payment.masterId,
        String(payment.tariffType),
        days,
      );

      // Уведомление мастера об успешной оплате тарифа (in-app + SMS/Telegram)
      try {
        const master = await this.prisma.master.findUnique({
          where: { id: payment.masterId },
          select: {
            userId: true,
            telegramChatId: true,
            whatsappPhone: true,
            user: { select: { phone: true } },
          },
        });
        if (master?.user?.phone) {
          await this.notifications.sendPaymentConfirmation(
            master.user.phone,
            {
              tariffType: String(payment.tariffType),
              amount: String(payment.amount),
            },
            {
              telegramChatId: master.telegramChatId ?? undefined,
              whatsappPhone: master.whatsappPhone ?? undefined,
            },
          );
        }
        if (master) {
          await this.inAppNotifications.notifyPaymentSuccess(master.userId, {
            paymentId: orderId,
            tariffType: String(payment.tariffType),
            amount: String(payment.amount),
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Не удалось отправить уведомление о платеже: ${msg}`);
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
        this.cache.invalidateMasterRelated(masterId),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Failed to invalidate caches after tariff change: ${msg}`,
      );
    }
  }
}
