/** Внутренний скор мастера при агрегации сигналов в движке. */
export interface RecommendationScore {
  masterId: string;
  score: number;
  reasons: string[];
}

/** Сырые скоры для кэша Redis и последующей сборки ответа API. */
export interface RawRecommendationScore {
  masterId: string;
  score: number;
  reasons: string[];
}
