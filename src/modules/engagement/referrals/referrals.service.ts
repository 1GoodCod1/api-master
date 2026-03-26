import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { Prisma, ReferralStatus } from '@prisma/client';
import { MastersService } from '../../marketplace/masters/masters.service';
import { InAppNotificationService } from '../../notifications/notifications/services/in-app-notification.service';
import { AppSettingsService } from '../../app-settings/app-settings.service';

const REFERRAL_REWARD_DAYS = 7;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mastersService: MastersService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly appSettings: AppSettingsService,
  ) {}

  /**
   * Generate a referral code for a user (auto-called on registration)
   */
  async generateCode(userId: string): Promise<string> {
    const existing = await this.prisma.referralCode.findUnique({
      where: { userId },
    });
    if (existing) return existing.code;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });

    const prefix = (user?.firstName ?? 'USER')
      .replace(/[^a-zA-Zа-яА-Я0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = Math.floor(100000 + Math.random() * 900000);
      const code = `${prefix}${suffix}`;

      try {
        const referralCode = await this.prisma.referralCode.create({
          data: { userId, code },
        });
        return referralCode.code;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException(
      'Failed to generate unique referral code',
    );
  }

  /**
   * Get referral info for current user
   */
  async getMyReferralInfo(userId: string) {
    const enabled = await this.appSettings.isReferralsEnabled();
    if (!enabled) {
      return {
        code: '',
        usageCount: 0,
        referrals: [],
        stats: { total: 0, pending: 0, qualified: 0, rewarded: 0 },
      };
    }
    let referralCode = await this.prisma.referralCode.findUnique({
      where: { userId },
      include: {
        referrals: {
          include: {
            referredUser: {
              select: { firstName: true, lastName: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!referralCode) {
      await this.generateCode(userId);
      referralCode = await this.prisma.referralCode.findUnique({
        where: { userId },
        include: {
          referrals: {
            include: {
              referredUser: {
                select: { firstName: true, lastName: true, createdAt: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    return {
      code: referralCode?.code ?? '',
      usageCount: referralCode?.usageCount ?? 0,
      referrals: (referralCode?.referrals ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        rewardGranted: r.rewardGranted,
        createdAt: r.createdAt,
        referredUser: r.referredUser,
      })),
      stats: {
        total: referralCode?.referrals?.length ?? 0,
        pending:
          referralCode?.referrals?.filter(
            (r) => r.status === ReferralStatus.PENDING,
          ).length ?? 0,
        qualified:
          referralCode?.referrals?.filter(
            (r) => r.status === ReferralStatus.QUALIFIED,
          ).length ?? 0,
        rewarded:
          referralCode?.referrals?.filter(
            (r) => r.status === ReferralStatus.REWARDED,
          ).length ?? 0,
      },
    };
  }

  /**
   * Apply referral code during registration
   */
  async applyReferralCode(referredUserId: string, code: string) {
    const enabled = await this.appSettings.isReferralsEnabled();
    if (!enabled) {
      throw new BadRequestException('Реферальная программа отключена');
    }
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code },
    });

    if (!referralCode) {
      throw new BadRequestException('Реферальный код не найден');
    }

    if (!referralCode.isActive) {
      throw new BadRequestException('Реферальный код неактивен');
    }

    if (referralCode.userId === referredUserId) {
      throw new BadRequestException('Нельзя использовать свой собственный код');
    }

    // Проверка, был ли уже реферал
    const existingReferral = await this.prisma.referral.findUnique({
      where: { referredUserId },
    });
    if (existingReferral) {
      this.logger.warn(`User ${referredUserId} already has a referral`);
      return existingReferral;
    }

    const referral = await this.prisma.referral.create({
      data: {
        referralCodeId: referralCode.id,
        referredUserId,
        status: ReferralStatus.PENDING,
      },
    });

    // Увеличиваем счётчик использования
    await this.prisma.referralCode.update({
      where: { id: referralCode.id },
      data: { usageCount: { increment: 1 } },
    });

    this.logger.log(
      `Referral applied: code=${code}, referredUser=${referredUserId}`,
    );

    return referral;
  }

  /**
   * Called when a referred user closes their first lead — qualify and grant reward
   */
  async qualifyReferral(referredUserId: string) {
    const enabled = await this.appSettings.isReferralsEnabled();
    if (!enabled) return;
    const referral = await this.prisma.referral.findUnique({
      where: { referredUserId },
      include: {
        referralCode: {
          include: {
            user: {
              select: {
                id: true,
                role: true,
                firstName: true,
                masterProfile: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (referral?.status !== ReferralStatus.PENDING) return;

    const referrer = referral.referralCode.user;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.REWARDED,
        rewardGranted: true,
        rewardGrantedAt: new Date(),
      },
    });

    this.logger.log(
      `Referral qualified and rewarded for user ${referredUserId}`,
    );

    try {
      if (referrer.role === 'MASTER' && referrer.masterProfile) {
        await this.mastersService.extendTariffByDays(
          referrer.masterProfile.id,
          REFERRAL_REWARD_DAYS,
        );
        this.logger.log(
          `Granted ${REFERRAL_REWARD_DAYS} days tariff extension to master ${referrer.masterProfile.id}`,
        );
      }

      await this.inAppNotifications.notify({
        userId: referrer.id,
        category: 'NEW_PROMOTION',
        title: 'Реферальный бонус',
        message: `Ваш приглашённый друг закрыл сделку! Вам начислен бонус${referrer.role === 'MASTER' ? `: +${REFERRAL_REWARD_DAYS} дней тарифа` : ''}. Спасибо за приглашение!`,
        metadata: { type: 'referral_reward', referredUserId },
      });
    } catch (err) {
      this.logger.error(
        `Failed to grant referral reward for ${referredUserId}:`,
        err,
      );
    }
  }

  /**
   * Validate a referral code (public endpoint for registration form)
   */
  async validateCode(code: string) {
    const enabled = await this.appSettings.isReferralsEnabled();
    if (!enabled) return { valid: false };
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code },
      select: {
        code: true,
        isActive: true,
        user: {
          select: { firstName: true },
        },
      },
    });

    if (!referralCode?.isActive) {
      return { valid: false };
    }

    return {
      valid: true,
      referrerName: referralCode.user.firstName ?? undefined,
    };
  }
}
