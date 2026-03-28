import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { Prisma } from '@prisma/client';
import { TariffType } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { PaymentsMiaService } from './payments-mia.service';
import { getEffectiveTariff } from '../../../common/helpers/plans';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-action.enum';
import { AuditEntityType } from '../../audit/audit-entity-type.enum';

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

      if (!master) throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
      if (!master.pendingUpgradeTo || !master.pendingUpgradeCreatedAt) {
        throw AppErrors.badRequest(AppErrorMessages.UPGRADE_NONE_PENDING);
      }

      // Лимит - 12 часов на подтверждение
      const hoursSinceCreation =
        (Date.now() - master.pendingUpgradeCreatedAt.getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceCreation > 12) {
        await this.resetPendingUpgrade(master.id);
        throw AppErrors.badRequest(AppErrorMessages.UPGRADE_EXPIRED);
      }

      if (getEffectiveTariff(master) !== TariffType.VIP) {
        await this.resetPendingUpgrade(master.id);
        throw AppErrors.badRequest(AppErrorMessages.UPGRADE_NOT_VIP);
      }

      // Создаём сессию оплаты через MIA для PREMIUM
      const result = await this.miaService.createTariffQrPayment(
        { masterId: master.id, tariffType: master.pendingUpgradeTo },
        userId,
      );

      // Сбрасываем флаг, так как сессия создана
      await this.resetPendingUpgrade(master.id);

      // Audit log: апгрейд подтверждён
      await this.auditService.log({
        userId: userId,
        action: AuditAction.TARIFF_UPGRADE_CONFIRMED,
        entityType: AuditEntityType.User,
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
      this.logger.error('confirmPendingUpgrade failed', err);
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
      if (!master) throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
      if (!master.pendingUpgradeTo)
        throw AppErrors.badRequest(AppErrorMessages.UPGRADE_NONE_PENDING);

      await this.resetPendingUpgrade(master.id);

      // Audit log: апгрейд отменён
      await this.auditService.log({
        userId: userId,
        action: AuditAction.TARIFF_UPGRADE_CANCELLED,
        entityType: AuditEntityType.User,
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
      this.logger.error('cancelPendingUpgrade failed', err);
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
      if (!master) throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
      if (master.tariffType === TariffType.BASIC || !master.tariffExpiresAt) {
        throw AppErrors.badRequest(AppErrorMessages.UPGRADE_NO_PAID_TO_CANCEL);
      }
      if (master.tariffExpiresAt.getTime() <= Date.now()) {
        throw AppErrors.badRequest(AppErrorMessages.UPGRADE_TARIFF_EXPIRED);
      }

      await this.prisma.master.update({
        where: { id: master.id },
        data: { tariffCancelAtPeriodEnd: true },
      });

      // Audit log: подписка отменена
      await this.auditService.log({
        userId: userId,
        action: AuditAction.SUBSCRIPTION_CANCELLED,
        entityType: AuditEntityType.Master,
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
      this.logger.error('cancelTariffAtPeriodEnd failed', err);
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
