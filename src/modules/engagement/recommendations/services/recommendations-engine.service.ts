import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  RECOMMENDATIONS_RAW_SCORE_POOL,
  RECOMMENDATIONS_VIEW_DECAY_BASE,
  SORT_DESC,
} from '../../../../common/constants';
import {
  isMasterPresentationReady,
  pickDiverseMasters,
} from './recommendations-presentation.util';
import type {
  MasterWithRecommendationMeta,
  RawRecommendationScore,
  RecommendationScore,
} from '../types';

@Injectable()
export class RecommendationsEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Пул кандидатов (без фильтра качества / диверсификации) — для кэша Redis.
   * @param explicitCityId город с клиента (геолокация / выбор в UI), UUID из таблицы cities
   */
  async buildRawScores(
    userId?: string,
    sessionId?: string,
    maxCandidates?: number,
    explicitCityId?: string,
  ): Promise<RawRecommendationScore[]> {
    const pool = maxCandidates ?? RECOMMENDATIONS_RAW_SCORE_POOL;
    const scores: Map<string, RecommendationScore> = new Map();
    const resolvedExplicit = await this.resolveExplicitCityId(explicitCityId);

    const citySignal = resolvedExplicit
      ? this.scoreBasedOnExplicitClientCity(scores, resolvedExplicit)
      : this.scoreBasedOnPreferredCity(scores, userId, sessionId);

    const userDependent = userId
      ? Promise.all([
          this.scoreBasedOnViews(scores, userId, sessionId),
          this.scoreBasedOnPopularity(scores),
          this.scoreBasedOnFavorites(scores, userId),
          this.scoreBasedOnLeads(scores, userId),
          this.scoreBasedOnCategories(scores, userId, sessionId),
          citySignal,
        ])
      : Promise.all([
          this.scoreBasedOnViews(scores, userId, sessionId),
          this.scoreBasedOnPopularity(scores),
          this.scoreBasedOnCategories(scores, userId, sessionId),
          citySignal,
        ]);

    await userDependent;

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, pool)
      .map(({ masterId, score, reasons }) => ({
        masterId,
        score,
        reasons: [...new Set(reasons)],
      }));
  }

  /**
   * Сборка финального списка: исключения, качество (фото/аватар), диверсификация по категориям.
   */
  async materializeFromRawScores(
    raw: RawRecommendationScore[],
    limit: number,
    excludeIds: Set<string>,
  ): Promise<MasterWithRecommendationMeta[]> {
    if (!raw.length || limit <= 0) return [];

    const maxPerCategory = limit <= 6 ? 2 : 3;
    const masterIds = raw.map((r) => r.masterId);
    const scoreById = new Map(raw.map((r) => [r.masterId, r]));

    const masters = await this.prisma.master.findMany({
      where: {
        id: { in: masterIds },
        user: { isBanned: false },
      },
      include: {
        category: true,
        city: true,
        user: { select: { id: true, isVerified: true } },
        photos: { take: 1, include: { file: true } },
      },
    });

    const byId = new Map(masters.map((m) => [m.id, m]));

    const ordered: MasterWithRecommendationMeta[] = [];
    for (const id of masterIds) {
      const m = byId.get(id);
      if (!m) continue;
      const r = scoreById.get(id);
      if (!isMasterPresentationReady(m)) continue;
      ordered.push({
        ...m,
        recommendationScore: r?.score,
        reasons: r?.reasons,
      });
    }

    const picked = pickDiverseMasters(
      ordered,
      limit,
      maxPerCategory,
      excludeIds,
    );
    return picked;
  }

  /**
   * Похожие мастера: та же категория, близкий рейтинг; только с фото или аватаром.
   */
  async getSimilarMasters(masterId: string, limit: number = 5) {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { categoryId: true, rating: true },
    });
    if (!master) return [];

    const rows = await this.prisma.master.findMany({
      where: {
        id: { not: masterId },
        categoryId: master.categoryId,
        rating: { gte: master.rating - 0.5 },
        user: { isBanned: false },
        OR: [{ photos: { some: {} } }, { avatarFileId: { not: null } }],
      },
      orderBy: [{ rating: SORT_DESC }, { totalReviews: SORT_DESC }],
      take: limit,
      include: {
        category: true,
        city: true,
        user: { select: { id: true, isVerified: true } },
        photos: { take: 1, include: { file: true } },
      },
    });

    return rows;
  }

  /** Город, переданный с клиента (согласие на город / гео) — сильнее, чем вывод из активности. */
  private async scoreBasedOnExplicitClientCity(
    scores: Map<string, RecommendationScore>,
    cityId: string,
  ) {
    const inCity = await this.prisma.master.findMany({
      where: { cityId, user: { isBanned: false } },
      orderBy: { rating: SORT_DESC },
      take: 35,
      select: { id: true },
    });

    for (const m of inCity) {
      const s = this.getScore(scores, m.id);
      s.score += 16;
      s.reasons.push('geo_city');
      scores.set(m.id, s);
    }
  }

  private async resolveExplicitCityId(
    cityId?: string,
  ): Promise<string | undefined> {
    const trimmed = cityId?.trim();
    if (!trimmed) return undefined;
    const row = await this.prisma.city.findUnique({
      where: { id: trimmed },
      select: { id: true },
    });
    return row?.id;
  }

  private async scoreBasedOnPreferredCity(
    scores: Map<string, RecommendationScore>,
    userId?: string,
    sessionId?: string,
  ) {
    const or: { userId?: string; sessionId?: string }[] = [];
    if (userId) or.push({ userId });
    if (sessionId) or.push({ sessionId });
    if (!or.length) return;

    const row = await this.prisma.userActivity.findFirst({
      where: { OR: or, cityId: { not: null } },
      orderBy: { createdAt: SORT_DESC },
      select: { cityId: true },
    });
    if (!row?.cityId) return;

    const inCity = await this.prisma.master.findMany({
      where: { cityId: row.cityId, user: { isBanned: false } },
      orderBy: { rating: SORT_DESC },
      take: 25,
      select: { id: true },
    });

    for (const m of inCity) {
      const s = this.getScore(scores, m.id);
      s.score += 6;
      s.reasons.push('preferred_city');
      scores.set(m.id, s);
    }
  }

  private async scoreBasedOnViews(
    scores: Map<string, RecommendationScore>,
    userId?: string,
    sessionId?: string,
  ) {
    const or: { userId?: string; sessionId?: string }[] = [];
    if (userId) or.push({ userId });
    if (sessionId) or.push({ sessionId });
    if (!or.length) return;

    const views = await this.prisma.userActivity.findMany({
      where: { OR: or, action: 'view', masterId: { not: null } },
      orderBy: { createdAt: SORT_DESC },
      take: 20,
    });
    if (!views.length) return;

    const viewedIds = views.map((v) => v.masterId as string);
    const viewedMasters = await this.prisma.master.findMany({
      where: { id: { in: viewedIds } },
      select: { id: true, categoryId: true, cityId: true },
    });
    const vmById = new Map(viewedMasters.map((m) => [m.id, m]));

    const categoryWeights = new Map<string, number>();
    const cityWeights = new Map<string, number>();
    for (let i = 0; i < views.length; i++) {
      const decay = Math.pow(RECOMMENDATIONS_VIEW_DECAY_BASE, i);
      const vm = vmById.get(views[i].masterId as string);
      if (!vm) continue;
      categoryWeights.set(
        vm.categoryId,
        (categoryWeights.get(vm.categoryId) ?? 0) + decay,
      );
      cityWeights.set(vm.cityId, (cityWeights.get(vm.cityId) ?? 0) + decay);
    }

    const maxCat = Math.max(...categoryWeights.values(), 1e-6);
    const maxCity = Math.max(...cityWeights.values(), 1e-6);

    const similar = await this.prisma.master.findMany({
      where: {
        OR: [
          { categoryId: { in: [...categoryWeights.keys()] } },
          { cityId: { in: [...cityWeights.keys()] } },
        ],
        id: { notIn: viewedIds },
      },
      take: 30,
      select: { id: true, categoryId: true, cityId: true },
    });

    for (const m of similar) {
      const s = this.getScore(scores, m.id);
      const cw = categoryWeights.get(m.categoryId);
      if (cw != null && cw > 0) {
        s.score += 15 * (cw / maxCat);
        s.reasons.push('similar_category');
      }
      const yw = cityWeights.get(m.cityId);
      if (yw != null && yw > 0) {
        s.score += 10 * (yw / maxCity);
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
      orderBy: [{ rating: SORT_DESC }, { totalReviews: SORT_DESC }],
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
    const or: { userId?: string; sessionId?: string }[] = [];
    if (userId) or.push({ userId });
    if (sessionId) or.push({ sessionId });
    if (!or.length) return;

    const acts = await this.prisma.userActivity.findMany({
      where: { OR: or, categoryId: { not: null } },
      orderBy: { createdAt: SORT_DESC },
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
      orderBy: { rating: SORT_DESC },
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
