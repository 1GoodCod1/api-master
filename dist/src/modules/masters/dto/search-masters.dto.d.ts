import { TariffType } from '@prisma/client';
export declare class SearchMastersDto {
    categoryId?: string;
    cityId?: string;
    search?: string;
    tariffType?: TariffType;
    isFeatured?: boolean;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    availableNow?: boolean;
    hasPromotion?: boolean;
    page?: number;
    cursor?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
