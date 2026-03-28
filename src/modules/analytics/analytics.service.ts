import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TariffType } from '../../common/constants';
import { PrismaService } from '../shared/database/prisma.service';
import { AnalyticsMasterService } from './services/analytics-master.service';
import { AnalyticsBusinessService } from './services/analytics-business.service';
import { AnalyticsSystemService } from './services/analytics-system.service';
import {
  MasterAnalyticsResponse,
  BusinessAnalyticsResponse,
  SystemAnalyticsResponse,
  AdvancedAnalyticsResponse,
} from '../shared/types/analytics.types';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { isPremiumTariff, isVipOrPremiumTariff } from '../../common/constants';
import { AppErrors, AppErrorMessages } from '../../common/errors';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masterAnalytics: AnalyticsMasterService,
    private readonly businessAnalytics: AnalyticsBusinessService,
    private readonly systemAnalytics: AnalyticsSystemService,
  ) {}

  /**
   * Получение аналитики для пользователя (мастер или админ)
   */
  async getAnalyticsForUser(
    user: JwtUser,
    masterId: string,
    requestedDays: number = 7,
  ): Promise<MasterAnalyticsResponse> {
    if (user.role !== UserRole.ADMIN && user.masterProfile?.id !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.ANALYTICS_OWN_ONLY);
    }

    const master = await this.getMasterTariff(masterId);
    if (!master) {
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }

    let days = requestedDays;
    if (user.role !== UserRole.ADMIN) {
      const isPremium = this.isTariffActive(
        master.tariffType,
        master.tariffExpiresAt,
      );
      const maxDays = isPremium ? 30 : 14;
      days = Math.min(requestedDays, maxDays);
    }

    return this.masterAnalytics.getMasterAnalytics(masterId, days);
  }

  /**
   * Получение личной аналитики мастера с учетом тарифа
   */
  async getMyAnalytics(
    user: JwtUser,
    requestedDays?: number,
  ): Promise<MasterAnalyticsResponse | AdvancedAnalyticsResponse> {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }

    const master = await this.getMasterTariff(masterId);
    if (!master) {
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }

    const isActive = this.isTariffActive(
      master.tariffType,
      master.tariffExpiresAt,
    );
    const isPremium = isActive && isPremiumTariff(master.tariffType);
    const maxDays = isPremium ? 30 : 14;
    const days = requestedDays ? Math.min(requestedDays, maxDays) : maxDays;

    if (isPremium) {
      return this.masterAnalytics.getAdvancedMasterAnalytics(masterId, days);
    } else {
      return this.masterAnalytics.getMasterAnalytics(masterId, days);
    }
  }

  /**
   * Получение расширенной аналитики (только для PREMIUM)
   */
  async getMyAdvancedAnalytics(
    user: JwtUser,
    requestedDays: number = 30,
  ): Promise<AdvancedAnalyticsResponse> {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    }

    const days = Math.min(requestedDays, 30);
    return this.masterAnalytics.getAdvancedMasterAnalytics(masterId, days);
  }

  /**
   * Делегирование бизнес-аналитики
   */
  async getBusinessAnalytics(
    days: number = 30,
  ): Promise<BusinessAnalyticsResponse> {
    return this.businessAnalytics.getBusinessAnalytics(days);
  }

  /**
   * Делегирование системной аналитики
   */
  async getSystemAnalytics(): Promise<SystemAnalyticsResponse> {
    return this.systemAnalytics.getSystemAnalytics();
  }

  // Вспомогательные методы
  private async getMasterTariff(masterId: string) {
    return this.prisma.master.findUnique({
      where: { id: masterId },
      select: { tariffType: true, tariffExpiresAt: true },
    });
  }

  private isTariffActive(
    tariffType: TariffType,
    expiresAt: Date | null,
  ): boolean {
    return !!(
      isVipOrPremiumTariff(tariffType) &&
      expiresAt &&
      new Date(expiresAt) > new Date()
    );
  }

  // Для обратной совместимости, если где-то вызывается напрямую
  async getMasterAnalytics(masterId: string, days: number = 7) {
    return this.masterAnalytics.getMasterAnalytics(masterId, days);
  }
}
