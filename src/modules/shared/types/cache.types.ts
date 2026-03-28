export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

/**
 * Explicit key-builder shape so `cache.keys.*` resolves for type-aware ESLint
 * (untyped object literals with `this` methods can infer an error/circular type).
 */
export interface CacheKeyBuilders {
  searchMasters: (params: {
    categoryId?: string | null;
    cityId?: string | null;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    search?: string | null;
    tariffType?: string | null;
    minRating?: number | null;
    isFeatured?: boolean | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    availableNow?: boolean | null;
    hasPromotion?: boolean | null;
  }) => string;
  masterFull: (idOrSlug: string) => string;
  masterStats: (id: string) => string;
  masterReviews: (
    id: string,
    page: number,
    limit: number,
    status?: string,
  ) => string;
  /** Reviews written by a client (user id), for client dashboard / my-reviews */
  clientWrittenReviews: (
    userId: string,
    page: number,
    limit: number,
    status?: string,
  ) => string;
  categoriesAll: () => string;
  categoryWithStats: (id: string) => string;
  citiesAll: () => string;
  cityWithStats: (id: string) => string;
  tariffsAll: () => string;
  tariffById: (id: string) => string;
  tariffByType: (type: string) => string;
  masterLeads: (
    masterId: string,
    status: string | null,
    page: number,
  ) => string;
  userProfile: (id: string) => string;
  userMasterProfile: (id: string) => string;
  analytics: (masterId: string, period: string, type: string) => string;
  topMasters: (
    categoryId: string | null,
    cityId: string | null,
    limit: number,
  ) => string;
  popularMasters: (limit: number) => string;
  newMasters: (limit: number) => string;
  searchSuggest: (q: string, cityId: string | null) => string;
  searchFilters: () => string;
}
