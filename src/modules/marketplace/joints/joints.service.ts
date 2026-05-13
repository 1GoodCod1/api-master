import { Injectable } from '@nestjs/common';
import { JointsTransactionType, TariffType } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';

export const JOINTS_BY_TARIFF: Record<TariffType, number> = {
  [TariffType.BASIC]: 20,
  [TariffType.VIP]: 100,
  [TariffType.PREMIUM]: 200,
};

@Injectable()
export class JointsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(masterId: string): Promise<number> {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { jointsBalance: true },
    });
    return master?.jointsBalance ?? 0;
  }

  async getMyBalance(user: JwtUser): Promise<{ balance: number }> {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { jointsBalance: true },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);
    return { balance: master.jointsBalance };
  }

  async getTransactions(user: JwtUser, page = 1, limit = 20) {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);

    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.jointsTransaction.findMany({
        where: { masterId: master.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.jointsTransaction.count({ where: { masterId: master.id } }),
    ]);

    return { items, total, page, limit };
  }

  async creditSubscription(
    masterId: string,
    tariffType: TariffType,
  ): Promise<void> {
    const amount = JOINTS_BY_TARIFF[tariffType];

    await this.prisma.$transaction([
      this.prisma.master.update({
        where: { id: masterId },
        data: { jointsBalance: { increment: amount } },
      }),
      this.prisma.jointsTransaction.create({
        data: {
          masterId,
          amount,
          type: JointsTransactionType.SUBSCRIPTION_CREDIT,
          description: `Monthly joints from ${tariffType} subscription`,
        },
      }),
    ]);
  }

  async spendJoints(
    masterId: string,
    amount: number,
    _description: string,
    _applicationId: string | undefined,
  ): Promise<void> {
    if (amount <= 0)
      throw AppErrors.badRequest(AppErrorMessages.JOINTS_AMOUNT_INVALID);

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { jointsBalance: true },
    });

    if (!master || master.jointsBalance < amount)
      throw AppErrors.badRequest(AppErrorMessages.JOINTS_INSUFFICIENT);

    await this.prisma.master.update({
      where: { id: masterId },
      data: { jointsBalance: { decrement: amount } },
    });
  }

  async recordApplicationId(
    masterId: string,
    applicationId: string,
    amount: number,
  ): Promise<void> {
    await this.prisma.jointsTransaction.create({
      data: {
        masterId,
        amount: -amount,
        type: JointsTransactionType.APPLICATION_SPEND,
        description: `Spent on job application`,
        applicationId,
      },
    });
  }

  async purchaseJoints(
    user: JwtUser,
    amount: number,
  ): Promise<{ message: string }> {
    const master = await this.prisma.master.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!master) throw AppErrors.forbidden(AppErrorMessages.MASTER_NOT_FOUND);
    if (amount <= 0)
      throw AppErrors.badRequest(AppErrorMessages.JOINTS_AMOUNT_INVALID);

    await this.prisma.$transaction([
      this.prisma.master.update({
        where: { id: master.id },
        data: { jointsBalance: { increment: amount } },
      }),
      this.prisma.jointsTransaction.create({
        data: {
          masterId: master.id,
          amount,
          type: JointsTransactionType.PURCHASE,
          description: `Purchased ${amount} joints`,
        },
      }),
    ]);

    return { message: `${amount} joints credited to your balance` };
  }

  async creditSubscriptionForUser(userId: string): Promise<void> {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, tariffType: true },
    });
    if (!master) return;
    await this.creditSubscription(master.id, master.tariffType);
  }
}
