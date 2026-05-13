import { Injectable } from '@nestjs/common';
import { JointsTransactionType, Prisma, TariffType } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';

type PrismaTx = Prisma.TransactionClient | PrismaService;

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

  /**
   * Атомарно списывает joints. Безопасно при параллельных вызовах:
   * single-statement update с условием jointsBalance >= amount.
   * Можно передать tx — тогда работает в существующей транзакции.
   */
  async spendJoints(
    masterId: string,
    amount: number,
    _description: string,
    _applicationId: string | undefined,
    tx?: PrismaTx,
  ): Promise<void> {
    if (amount <= 0)
      throw AppErrors.badRequest(AppErrorMessages.JOINTS_AMOUNT_INVALID);

    const client = tx ?? this.prisma;
    const res = await client.master.updateMany({
      where: { id: masterId, jointsBalance: { gte: amount } },
      data: { jointsBalance: { decrement: amount } },
    });

    if (res.count === 0) {
      throw AppErrors.badRequest(AppErrorMessages.JOINTS_INSUFFICIENT);
    }
  }

  async recordApplicationId(
    masterId: string,
    applicationId: string,
    amount: number,
    tx?: PrismaTx,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.jointsTransaction.create({
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
