import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { PaymentsMiaService } from './payments-mia.service';
import { getEffectiveTariff } from '../../../common/helpers/plans';

@Injectable()
export class PaymentsUpgradeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly miaService: PaymentsMiaService,
  ) {}

  /**
   * Подтверждение отложенного апгрейда (Переход VIP -> PREMIUM)
   * @param userId ID пользователя-мастера
   */
  async confirmPendingUpgrade(userId: string) {
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

    // Создаем сессию оплаты через MIA для PREMIUM
    const result = await this.miaService.createTariffQrPayment(
      { masterId: master.id, tariffType: master.pendingUpgradeTo },
      userId,
    );

    // Сбрасываем флаг, так как сессия создана
    await this.resetPendingUpgrade(master.id);

    return result;
  }

  /**
   * Отмена отложенного апгрейда
   * @param userId ID пользователя
   */
  async cancelPendingUpgrade(userId: string) {
    const master = await this.prisma.master.findUnique({ where: { userId } });
    if (!master) throw new NotFoundException('Master not found');
    if (!master.pendingUpgradeTo)
      throw new BadRequestException('No pending upgrade found');

    await this.resetPendingUpgrade(master.id);
    return { message: 'Pending upgrade cancelled' };
  }

  /**
   * Отмена подписки в конце периода: тариф остаётся активным до tariffExpiresAt, затем не продлевается.
   */
  async cancelTariffAtPeriodEnd(userId: string) {
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
    return {
      message: 'Subscription will cancel at period end.',
      tariffExpiresAt: master.tariffExpiresAt,
    };
  }

  private async resetPendingUpgrade(masterId: string) {
    await this.prisma.master.update({
      where: { id: masterId },
      data: { pendingUpgradeTo: null, pendingUpgradeCreatedAt: null },
    });
  }
}
