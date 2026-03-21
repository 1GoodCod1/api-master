import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

interface RecommendationScore {
  masterId: string;
  score: number;
  reasons: string[];
}

@Injectable()
export class RecommendationsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Основной алгоритм расчета скоринга для рекомендаций
   * @param userId ID пользователя
   * @param sessionId ID сессии
   * @param limit Количество рекомендуемых мастеров
   */
  async calculateScores(
    userId?: string,
    sessionId?: string,
    limit: number = 10,
  ) {
    const scores: Map<string, RecommendationScore> = new Map();

    const userDependent = userId
      ? Promise.all([
          this.scoreBasedOnViews(scores, userId, sessionId),
          this.scoreBasedOnPopularity(scores),
          this.scoreBasedOnFavorites(scores, userId),
          this.scoreBasedOnLeads(scores, userId),
          this.scoreBasedOnCategories(scores, userId, sessionId),
        ])
      : Promise.all([
          this.scoreBasedOnViews(scores, userId, sessionId),
          this.scoreBasedOnPopularity(scores),
          this.scoreBasedOnCategories(scores, userId, sessionId),
        ]);

    await userDependent;

    // Сортировка и выборка топ-N
    const sortedScores = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const masterIds = sortedScores.map((s) => s.masterId);
    if (!masterIds.length) return [];

    const masters = await this.prisma.master.findMany({
      where: { id: { in: masterIds }, user: { isBanned: false } },
      include: {
        category: true,
        city: true,
        user: { select: { id: true, isVerified: true } },
        photos: { take: 1, include: { file: true } },
      },
    });

    return masterIds
      .map((id) => {
        const master = masters.find((m) => m.id === id);
        const scoreData = scores.get(id);
        return master
          ? {
              ...master,
              recommendationScore: scoreData?.score,
              reasons: scoreData?.reasons,
            }
          : null;
      })
      .filter(Boolean);
  }

  /**
   * Найти похожих мастеров (в той же категории, с близким рейтингом)
   * @param masterId ID эталонного мастера
   * @param limit Максимальное количество похожих мастеров
   */
  async getSimilarMasters(masterId: string, limit: number = 5) {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { categoryId: true, rating: true },
    });
    if (!master) return [];

    return this.prisma.master.findMany({
      where: {
        id: { not: masterId },
        categoryId: master.categoryId,
        rating: { gte: master.rating - 0.5 },
        user: { isBanned: false },
      },
      orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
      take: limit,
      include: {
        category: true,
        city: true,
        user: { select: { id: true, isVerified: true } },
        photos: { take: 1, include: { file: true } },
      },
    });
  }

  private async scoreBasedOnViews(
    scores: Map<string, RecommendationScore>,
    userId?: string,
    sessionId?: string,
  ) {
    const or: any[] = [];
    if (userId) or.push({ userId });
    if (sessionId) or.push({ sessionId });
    if (!or.length) return;

    const views = await this.prisma.userActivity.findMany({
      where: { OR: or, action: 'view', masterId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (!views.length) return;

    const viewedIds = views.map((v) => v.masterId as string);
    const viewedMasters = await this.prisma.master.findMany({
      where: { id: { in: viewedIds } },
      select: { categoryId: true, cityId: true },
    });

    const categoryIds = [...new Set(viewedMasters.map((m) => m.categoryId))];
    const cityIds = [...new Set(viewedMasters.map((m) => m.cityId))];

    const similar = await this.prisma.master.findMany({
      where: {
        OR: [{ categoryId: { in: categoryIds } }, { cityId: { in: cityIds } }],
        id: { notIn: viewedIds },
      },
      take: 30,
      select: { id: true, categoryId: true, cityId: true },
    });

    for (const m of similar) {
      const s = this.getScore(scores, m.id);
      if (categoryIds.includes(m.categoryId)) {
        s.score += 15;
        s.reasons.push('similar_category');
      }
      if (cityIds.includes(m.cityId)) {
        s.score += 10;
        s.reasons.push('your_city');
      }
      scores.set(m.id, s);
    }
  }

  private async scoreBasedOnFavorites(
    scores: Map<string, RecommendationScore>,
    userId: string,
  ) {
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        master: { select: { id: true, categoryId: true, cityId: true } },
      },
      take: 10,
    });
    if (!favs.length) return;

    const catIds = [...new Set(favs.map((f) => f.master.categoryId))];
    const cityIds = [...new Set(favs.map((f) => f.master.cityId))];
    const favMasterIds = favs.map((f) => f.masterId);

    const similar = await this.prisma.master.findMany({
      where: {
        OR: [{ categoryId: { in: catIds } }, { cityId: { in: cityIds } }],
        id: { notIn: favMasterIds },
      },
      take: 20,
      select: { id: true, categoryId: true, cityId: true },
    });

    for (const m of similar) {
      const s = this.getScore(scores, m.id);
      if (catIds.includes(m.categoryId)) {
        s.score += 20;
        s.reasons.push('like_favorites');
      }
      if (cityIds.includes(m.cityId)) {
        s.score += 12;
        s.reasons.push('your_city');
      }
      scores.set(m.id, s);
    }
  }

  private async scoreBasedOnLeads(
    scores: Map<string, RecommendationScore>,
    userId: string,
  ) {
    const leads = await this.prisma.lead.findMany({
      where: { clientId: userId },
      include: {
        master: { select: { id: true, categoryId: true, cityId: true } },
      },
      take: 10,
    });
    if (!leads.length) return;

    const catIds = [...new Set(leads.map((l) => l.master.categoryId))];
    const cityIds = [...new Set(leads.map((l) => l.master.cityId))];
    const leadIds = leads.map((l) => l.masterId);

    const similar = await this.prisma.master.findMany({
      where: {
        OR: [{ categoryId: { in: catIds } }, { cityId: { in: cityIds } }],
        id: { notIn: leadIds },
      },
      take: 20,
      select: { id: true, categoryId: true, cityId: true },
    });

    for (const m of similar) {
      const s = this.getScore(scores, m.id);
      if (catIds.includes(m.categoryId)) {
        s.score += 25;
        s.reasons.push('similar_services');
      }
      if (cityIds.includes(m.cityId)) {
        s.score += 15;
        s.reasons.push('your_city');
      }
      scores.set(m.id, s);
    }
  }

  private async scoreBasedOnPopularity(
    scores: Map<string, RecommendationScore>,
  ) {
    const popular = await this.prisma.master.findMany({
      where: {
        rating: { gte: 4.5 },
        totalReviews: { gte: 10 },
        user: { isBanned: false },
      },
      orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
      take: 20,
      select: { id: true, rating: true, totalReviews: true },
    });

    for (const m of popular) {
      const s = this.getScore(scores, m.id);
      s.score += Math.min(m.rating * 2 + m.totalReviews * 0.1, 20);
      s.reasons.push('popular');
      scores.set(m.id, s);
    }
  }

  private async scoreBasedOnCategories(
    scores: Map<string, RecommendationScore>,
    userId?: string,
    sessionId?: string,
  ) {
    const or: any[] = [];
    if (userId) or.push({ userId });
    if (sessionId) or.push({ sessionId });
    if (!or.length) return;

    const acts = await this.prisma.userActivity.findMany({
      where: { OR: or, categoryId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (!acts.length) return;

    const freq = new Map<string, number>();
    for (const a of acts)
      if (a.categoryId)
        freq.set(a.categoryId, (freq.get(a.categoryId) || 0) + 1);

    const topCats = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    const masters = await this.prisma.master.findMany({
      where: { categoryId: { in: topCats } },
      orderBy: { rating: 'desc' },
      take: 15,
      select: { id: true },
    });

    for (const m of masters) {
      const s = this.getScore(scores, m.id);
      s.score += 8;
      s.reasons.push('interesting_category');
      scores.set(m.id, s);
    }
  }

  private getScore(
    scores: Map<string, RecommendationScore>,
    masterId: string,
  ): RecommendationScore {
    return scores.get(masterId) ?? { masterId, score: 0, reasons: [] };
  }
}
