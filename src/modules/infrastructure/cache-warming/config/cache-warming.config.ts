/**
 * Конфигурация лимитов для предзагрузки кеша.
 * Значения соответствуют использованию на разных страницах/секциях.
 */
export const CACHE_WARMING_LIMITS = {
  /** Only warm limits actually used: Landing (10), catalog (20) */
  popularMasters: [10, 20] as const,
  newMasters: [10, 20] as const,
  /** Landing sidebar (6), admin catalog (50) */
  promotions: [6, 50] as const,
  topMastersPerCategory: 5,
  topMastersPerCity: 5,
  topMastersCategoryCityCombinations: 3,
  topMastersLimit: 10,
} as const;

/** Параметры сортировки для топ мастеров (по рейтингу, по убыванию) */
export const CACHE_WARMING_TOP_MASTERS_SORT = {
  sortBy: 'rating' as const,
  sortOrder: 'desc' as const,
} as const;
