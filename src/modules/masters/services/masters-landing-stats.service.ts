import { Injectable } from '@nestjs/common';
import { LeadStatus, VerificationStatus } from '../../../common/constants';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';

@Injectable()
export class MastersLandingStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Публичная статистика для лендинга (hero): верифицированные мастера, закрытые заявки, средний рейтинг.
   * Кешируется для снижения нагрузки — данные обновляются каждые 10 минут.
   */
  async getLandingStats(): Promise<{
    verifiedMastersCount: number;
    verifiedOnlineMastersCount: number;
    completedProjectsCount: number;
    averageRating: number;
    support24_7: true;
  }> {
    const cacheKey = 'cache:landing:stats';

    const cached = await this.cache.get<{
      verifiedMastersCount: number;
      verifiedOnlineMastersCount: number;
      completedProjectsCount: number;
      averageRating: number;
      support24_7: true;
    }>(cacheKey);

    if (cached) return cached;

    const verifiedWhere = {
      OR: [
        { user: { isVerified: true } },
        { verification: { status: VerificationStatus.APPROVED } },
      ],
    };
    const [
      verifiedMastersCount,
      verifiedOnlineMastersCount,
      completedProjectsCount,
      ratingAgg,
    ] = await Promise.all([
      this.prisma.master.count({ where: verifiedWhere }),
      this.prisma.master.count({
        where: {
          ...verifiedWhere,
          isOnline: true,
        },
      }),
      this.prisma.lead.count({ where: { status: LeadStatus.CLOSED } }),
      this.prisma.master.aggregate({
        _avg: { rating: true },
        where: { rating: { gt: 0 } },
      }),
    ]);
    const averageRating =
      ratingAgg._avg.rating != null
        ? Math.round(ratingAgg._avg.rating * 10) / 10
        : 4.9;

    const result = {
      verifiedMastersCount,
      verifiedOnlineMastersCount,
      completedProjectsCount,
      averageRating,
      support24_7: true as const,
    };

    await this.cache.set(cacheKey, result, 600);

    return result;
  }
}
