/**
 * Конфигурация лимитов для предзагрузки кеша.
 * Значения соответствуют использованию на разных страницах/секциях.
 */
export const CACHE_WARMING_LIMITS = {
  popularMasters: [3, 5, 10, 20, 50] as const,
  newMasters: [10, 20] as const,
  promotions: [6, 50, 100] as const,
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
