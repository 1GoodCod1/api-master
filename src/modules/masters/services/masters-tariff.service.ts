import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Payment, TariffType } from '@prisma/client';
import { PaymentStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';

export type GetTariffResult = {
  tariffType: TariffType;
  tariffExpiresAt: Date | null;
  tariffCancelAtPeriodEnd: boolean;
  isExpired: boolean;
  pendingUpgrade: {
    to: TariffType;
    createdAt: Date;
    expiresAt: Date;
    hoursRemaining: number;
  } | null;
  lastPayment: Payment | null;
};

@Injectable()
export class MastersTariffService {
  private readonly logger = new Logger(MastersTariffService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTariff(userId: string): Promise<GetTariffResult> {
    try {
      const master = await this.prisma.master.findUnique({
        where: { userId },
        select: {
          tariffType: true,
          tariffExpiresAt: true,
          tariffCancelAtPeriodEnd: true,
          pendingUpgradeTo: true,
          pendingUpgradeCreatedAt: true,
          payments: {
            where: { status: PaymentStatus.SUCCESS },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!master) {
        throw new NotFoundException('Master not found');
      }

      const isExpired =
        master.tariffExpiresAt && master.tariffExpiresAt < new Date();

      // Проверяем таймаут pending upgrade (12 часов)
      let pendingUpgrade: GetTariffResult['pendingUpgrade'] = null;
      if (master.pendingUpgradeTo && master.pendingUpgradeCreatedAt) {
        const hoursSinceCreation =
          (Date.now() - master.pendingUpgradeCreatedAt.getTime()) /
          (1000 * 60 * 60);
        if (hoursSinceCreation <= 12) {
          pendingUpgrade = {
            to: master.pendingUpgradeTo,
            createdAt: master.pendingUpgradeCreatedAt,
            expiresAt: new Date(
              master.pendingUpgradeCreatedAt.getTime() + 12 * 60 * 60 * 1000,
            ),
            hoursRemaining: Math.max(0, 12 - hoursSinceCreation),
          };
        }
      }

      const tariffCancelAtPeriodEnd: boolean = Boolean(
        master.tariffCancelAtPeriodEnd,
      );
      const isExpiredResult: boolean = Boolean(isExpired);
      // Prisma select with relation returns Payment[]; type is not narrowed by ESLint
      const payments = master.payments;
      const lastPayment: Payment | null = payments.at(0) ?? null;

      return {
        tariffType: master.tariffType,
        tariffExpiresAt: master.tariffExpiresAt,
        tariffCancelAtPeriodEnd,
        isExpired: isExpiredResult,
        pendingUpgrade,
        lastPayment,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('getTariff failed', err);
      throw err;
    }
  }

  async updateTariff(
    masterId: string,
    tariffTypeStr: string,
    days: number,
    onCacheInvalidate?: (
      masterId: string,
      slug: string | null,
    ) => Promise<void>,
  ) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      // Конвертируем строку в enum TariffType
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
          isFeatured:
            tariffType === TariffType.VIP || tariffType === TariffType.PREMIUM,
        },
      });

      // Инвалидируем кеш (тариф влияет на поиск и сортировку)
      if (onCacheInvalidate) {
        await onCacheInvalidate(masterId, master.slug);
      }

      return master;
    } catch (err) {
      this.logger.error('updateTariff failed', err);
      throw err;
    }
  }

  /**
   * Extend current tariff by days. For BASIC: grants days of VIP. For VIP/PREMIUM: adds days to expiry.
   */
  async extendTariffByDays(
    masterId: string,
    days: number,
    onCacheInvalidate?: (
      masterId: string,
      slug: string | null,
    ) => Promise<void>,
  ) {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        select: {
          tariffType: true,
          tariffExpiresAt: true,
          slug: true,
        },
      });

      if (!master) {
        throw new NotFoundException('Master not found');
      }

      const now = new Date();
      const isExpired = !master.tariffExpiresAt || master.tariffExpiresAt < now;

      let newTariffType = master.tariffType;
      let newExpiresAt: Date;

      if (master.tariffType === 'BASIC' || isExpired) {
        newTariffType = TariffType.VIP;
        newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
      } else {
        const base = master.tariffExpiresAt!;
        newExpiresAt = new Date(base);
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
      }

      const updated = await this.prisma.master.update({
        where: { id: masterId },
        data: {
          tariffType: newTariffType,
          tariffExpiresAt: newExpiresAt,
          isFeatured:
            newTariffType === TariffType.VIP ||
            newTariffType === TariffType.PREMIUM,
        },
      });

      if (onCacheInvalidate) {
        await onCacheInvalidate(masterId, updated.slug);
      }

      return updated;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error('extendTariffByDays failed', err);
      throw err;
    }
  }
}
