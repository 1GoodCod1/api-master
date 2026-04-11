import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentStatus,
  SUBSCRIPTION_TARIFF_TYPES,
  TariffType,
} from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../../common/constants';
import { NotificationsOutboundFacade } from '../../../notifications/notifications/facades/notifications-outbound.facade';
import { NotificationsInAppFacade } from '../../../notifications/notifications/facades/notifications-in-app.facade';

@Injectable()
export class TasksTariffService {
  private readonly logger = new Logger(TasksTariffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsOutbound: NotificationsOutboundFacade,
    private readonly inAppNotifications: NotificationsInAppFacade,
  ) {}

  /**
   * Auto-boost система для PREMIUM тарифа
   * Пересчитывает приоритет мастеров на основе их активности
   */
  async autoBoostMasters() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const premiumMasters = await this.prisma.master.findMany({
      where: {
        tariffType: TariffType.PREMIUM,
        tariffExpiresAt: { gt: now },
      },
      include: {
        _count: {
          select: {
            leads: { where: { createdAt: { gte: sevenDaysAgo } } },
            reviews: { where: { createdAt: { gte: sevenDaysAgo } } },
          },
        },
      },
    });

    this.logger.log(`Auto-boosting ${premiumMasters.length} PREMIUM masters`);

    for (const master of premiumMasters) {
      const activityScore =
        master._count.leads * 0.3 +
        master._count.reviews * 0.2 +
        Math.min(master.views / 100, 1) * 0.1;

      if (activityScore > 0) {
        this.logger.debug(
          `Master ${master.id}: leads=${master._count.leads}, reviews=${master._count.reviews}, views=${master.views}, score=${activityScore.toFixed(2)}`,
        );
      }
    }

    const lowActivityMasters = premiumMasters.filter(
      (m) => m._count.leads === 0 && m._count.reviews === 0 && m.views < 10,
    );

    if (lowActivityMasters.length > 0) {
      this.logger.warn(
        `${lowActivityMasters.length} PREMIUM masters have low activity. Consider sending engagement tips.`,
      );
    }
  }

  /**
   * Проверка и обработка истекающих тарифов
   */
  async checkExpiredTariffs() {
    const now = new Date();
    const expiredMasters = await this.prisma.master.findMany({
      where: {
        tariffExpiresAt: { lt: now },
        tariffType: { not: TariffType.BASIC },
      },
      include: { user: true },
    });

    for (const master of expiredMasters) {
      await this.prisma.master.update({
        where: { id: master.id },
        data: {
          tariffType: TariffType.BASIC,
          tariffExpiresAt: null,
          tariffCancelAtPeriodEnd: false,
          isFeatured: false,
        },
      });

      const smsEnabled =
        (master as { notifyTariffSms?: boolean }).notifyTariffSms !== false;
      if (smsEnabled && master.user.phone) {
        await this.notificationsOutbound.sendSMS(
          master.user.phone,
          `Ваш тариф истек. Текущий тариф: BASIC. Для продления посетите личный кабинет.`,
          { userId: master.userId },
        );
      }

      const inAppEnabled =
        (master as { notifyTariffInApp?: boolean }).notifyTariffInApp !== false;
      if (inAppEnabled) {
        await this.inAppNotifications
          .notifySubscriptionExpired(master.userId, {
            tariffType: master.tariffType,
            masterId: master.id,
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(
              `Failed to send in-app subscription expired: ${msg}`,
            );
          });
      }
    }

    this.logger.log(`Checked ${expiredMasters.length} expired tariffs`);
  }

  /**
   * Проверка таймаутов pending upgrade (12 часов)
   */
  async checkPendingUpgradeTimeouts() {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const expiredPendingUpgrades = await this.prisma.master.findMany({
      where: {
        pendingUpgradeTo: { not: null },
        pendingUpgradeCreatedAt: { lte: twelveHoursAgo },
      },
      include: { user: true },
    });

    for (const master of expiredPendingUpgrades) {
      const lastPayment = await this.prisma.payment.findFirst({
        where: { masterId: master.id, status: PaymentStatus.SUCCESS },
        orderBy: { createdAt: SORT_DESC },
      });

      const newTariffType = lastPayment ? master.tariffType : TariffType.BASIC;

      await this.prisma.master.update({
        where: { id: master.id },
        data: {
          pendingUpgradeTo: null,
          pendingUpgradeCreatedAt: null,
          tariffType: newTariffType,
          isFeatured: newTariffType !== TariffType.BASIC,
          ...(newTariffType === TariffType.BASIC && !lastPayment
            ? { tariffExpiresAt: null }
            : {}),
        },
      });

      const message = lastPayment
        ? `Ваш запрос на обновление до PREMIUM истек (12 часов). Вы остаетесь на текущем тарифе ${master.tariffType}.`
        : `Ваш запрос на обновление до PREMIUM истек (12 часов). Тариф изменен на BASIC.`;

      if (
        (master as { notifyTariffSms?: boolean }).notifyTariffSms !== false &&
        master.user.phone
      ) {
        await this.notificationsOutbound.sendSMS(master.user.phone, message, {
          userId: master.userId,
        });
      }
      if (
        (master as { notifyTariffInApp?: boolean }).notifyTariffInApp !== false
      ) {
        await this.inAppNotifications
          .notifySubscriptionExpired(master.userId, {
            tariffType: master.tariffType,
            masterId: master.id,
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to send in-app upgrade timeout: ${msg}`);
          });
      }
    }

    if (expiredPendingUpgrades.length > 0) {
      this.logger.log(
        `Cancelled ${expiredPendingUpgrades.length} expired pending upgrades`,
      );
    }
  }

  /**
   * Отправка уведомлений за 2 дня до истечения тарифа
   */
  async sendTariffExpirationReminders() {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mastersToNotify = await this.prisma.master.findMany({
      where: {
        tariffType: { in: [...SUBSCRIPTION_TARIFF_TYPES] },
        tariffExpiresAt: {
          gte: new Date(twoDaysFromNow.getTime() - 60 * 60 * 1000),
          lte: new Date(twoDaysFromNow.getTime() + 60 * 60 * 1000),
        },
      },
      include: { user: true },
    });

    for (const master of mastersToNotify) {
      const recentNotifications = await this.prisma.notification.findMany({
        where: {
          userId: master.userId,
          type: 'SMS',
          message: { contains: 'истекает' },
          createdAt: { gte: oneDayAgo },
        },
        take: 1,
      });

      if (recentNotifications.length > 0) continue;

      const daysUntilExpiry = Math.ceil(
        (master.tariffExpiresAt!.getTime() - now.getTime()) /
          (24 * 60 * 60 * 1000),
      );

      const message = `Ваш тариф ${master.tariffType} истекает через ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'день' : 'дня'}. Обновите тариф в личном кабинете.`;

      const smsEnabled =
        (master as { notifyTariffSms?: boolean }).notifyTariffSms !== false;
      if (smsEnabled && master.user.phone) {
        await this.notificationsOutbound.sendSMS(master.user.phone, message, {
          userId: master.userId,
          metadata: {
            masterId: master.id,
            tariffType: master.tariffType,
            expiresAt: master.tariffExpiresAt,
            daysUntilExpiry,
          },
        });
      }
      if (master.telegramChatId) {
        await this.notificationsOutbound.sendTelegram(`⏰ ${message}`, {
          chatId: master.telegramChatId,
        });
      }
      if (master.whatsappPhone) {
        await this.notificationsOutbound.sendWhatsApp(
          master.whatsappPhone,
          `⏰ ${message}`,
        );
      }

      const inAppEnabled =
        (master as { notifyTariffInApp?: boolean }).notifyTariffInApp !== false;
      if (inAppEnabled) {
        await this.inAppNotifications
          .notifySubscriptionExpiring(master.userId, {
            daysLeft: daysUntilExpiry,
            tariffType: master.tariffType,
            expiresAt: master.tariffExpiresAt!,
            masterId: master.id,
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to send in-app expiring: ${msg}`);
          });
      }
    }

    if (mastersToNotify.length > 0) {
      this.logger.log(
        `Sent expiration reminders to ${mastersToNotify.length} masters`,
      );
    }
  }
}
