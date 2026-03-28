import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Payment, Prisma, TariffType, UserRole } from '@prisma/client';
import { PaymentStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../shared/constants/sort-order.constants';
import { CacheService } from '../../../shared/cache/cache.service';
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';

export type InvalidateMasterCacheFn = (
  masterId: string,
  slug?: string | null,
) => Promise<void>;

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

  private static readonly DAYS_FREE_PLAN = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

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
            orderBy: { createdAt: SORT_DESC },
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

  /**
   * Верифицированный мастер получает любой тариф бесплатно 1 кликом (до настройки оплаты).
   */
  async claimFreePlan(
    userId: string,
    tariffType: 'VIP' | 'PREMIUM',
    onInvalidate?: InvalidateMasterCacheFn,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { masterProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.MASTER)
      throw new BadRequestException('Only masters can claim a free plan');
    if (!user.isVerified)
      throw new BadRequestException(
        'Verification required. Complete verification to claim a free plan.',
      );
    if (!user.masterProfile)
      throw new NotFoundException('Master profile not found');

    const result = await this.updateTariff(
      user.masterProfile.id,
      tariffType,
      MastersTariffService.DAYS_FREE_PLAN,
      onInvalidate,
    );

    await Promise.all([
      this.cache.del(this.cache.keys.userProfile(userId)),
      this.cache.del(this.cache.keys.userMasterProfile(userId)),
    ]);

    // Audit log
    await this.auditService.log({
      userId: userId,
      action: AuditAction.FREE_PLAN_CLAIMED,
      entityType: AuditEntityType.User,
      entityId: userId,
      newData: {
        tariffType,
        days: MastersTariffService.DAYS_FREE_PLAN,
      } satisfies Prisma.InputJsonValue,
    });

    return result;
  }
}
