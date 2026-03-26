import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { PaymentsMiaService } from './payments-mia.service';
import { getEffectiveTariff } from '../../../common/helpers/plans';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class PaymentsUpgradeService {
  private readonly logger = new Logger(PaymentsUpgradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly miaService: PaymentsMiaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Подтверждение отложенного апгрейда (Переход VIP -> PREMIUM)
   * @param userId ID пользователя-мастера
   */
  async confirmPendingUpgrade(userId: string) {
    try {
      const master = await this.prisma.master.findUnique({
        where: { userId },
      });

      if (!master) throw new NotFoundException('Master not found');
      if (!master.pendingUpgradeTo || !master.pendingUpgradeCreatedAt) {
        throw new BadRequestException('No pending upgrade found');
      }

      // Лимит - 12 часов на подтверждение
      const hoursSinceCreation =
        (Date.now() - master.pendingUpgradeCreatedAt.getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceCreation > 12) {
        await this.resetPendingUpgrade(master.id);
        throw new BadRequestException(
          'Pending upgrade has expired. Please try again.',
        );
      }

      if (getEffectiveTariff(master) !== 'VIP') {
        await this.resetPendingUpgrade(master.id);
        throw new BadRequestException(
          'Current tariff is not VIP. Cannot upgrade to PREMIUM.',
        );
      }

      // Создаём сессию оплаты через MIA для PREMIUM
      const result = await this.miaService.createTariffQrPayment(
        { masterId: master.id, tariffType: master.pendingUpgradeTo },
        userId,
      );

      // Сбрасываем флаг, так как сессия создана
      await this.resetPendingUpgrade(master.id);

      // Audit log upgrade confirmed
      await this.auditService.log({
        userId: userId,
        action: 'TARIFF_UPGRADE_CONFIRMED',
        entityType: 'User',
        entityId: userId,
        newData: {
          tariffType: master.pendingUpgradeTo,
        } satisfies Prisma.InputJsonValue,
      });

      return result;
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('Ошибка confirmPendingUpgrade', err);
      throw err;
    }
  }

  /**
   * Отмена отложенного апгрейда
   * @param userId ID пользователя
   */
  async cancelPendingUpgrade(userId: string) {
    try {
      const master = await this.prisma.master.findUnique({ where: { userId } });
      if (!master) throw new NotFoundException('Master not found');
      if (!master.pendingUpgradeTo)
        throw new BadRequestException('No pending upgrade found');

      await this.resetPendingUpgrade(master.id);

      // Audit log upgrade cancelled
      await this.auditService.log({
        userId: userId,
        action: 'TARIFF_UPGRADE_CANCELLED',
        entityType: 'User',
        entityId: userId,
      });

      return { message: 'Pending upgrade cancelled' };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('Ошибка cancelPendingUpgrade', err);
      throw err;
    }
  }

  /**
   * Отмена подписки в конце периода: тариф остаётся активным до tariffExpiresAt, затем не продлевается.
   */
  async cancelTariffAtPeriodEnd(userId: string) {
    try {
      const master = await this.prisma.master.findUnique({
        where: { userId },
        select: {
          id: true,
          tariffType: true,
          tariffExpiresAt: true,
        },
      });
      if (!master) throw new NotFoundException('Master not found');
      if (master.tariffType === 'BASIC' || !master.tariffExpiresAt) {
        throw new BadRequestException('No active paid tariff to cancel.');
      }
      if (master.tariffExpiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Tariff already expired.');
      }

      await this.prisma.master.update({
        where: { id: master.id },
        data: { tariffCancelAtPeriodEnd: true },
      });

      // Audit log subscription cancelled
      await this.auditService.log({
        userId: userId,
        action: 'SUBSCRIPTION_CANCELLED',
        entityType: 'Master',
        entityId: master.id,
        newData: {
          tariffExpiresAt: master.tariffExpiresAt.toISOString(),
        } satisfies Prisma.InputJsonValue,
      });

      return {
        message: 'Subscription will cancel at period end.',
        tariffExpiresAt: master.tariffExpiresAt,
      };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('Ошибка cancelTariffAtPeriodEnd', err);
      throw err;
    }
  }

  private async resetPendingUpgrade(masterId: string) {
    await this.prisma.master.update({
      where: { id: masterId },
      data: { pendingUpgradeTo: null, pendingUpgradeCreatedAt: null },
    });
  }
}
