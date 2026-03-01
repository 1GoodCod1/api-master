import { PrismaService } from '../../shared/database/prisma.service';
export declare class MastersSearchSqlService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRankedMasterIds(params: {
        categoryId?: string;
        cityId?: string;
        tariffType?: 'BASIC' | 'VIP' | 'PREMIUM';
        isFeatured?: boolean;
        minRating?: number;
        minPrice?: number;
        maxPrice?: number;
        availableNow?: boolean;
        hasPromotion?: boolean;
        search?: string;
        skip: number;
        take: number;
        sortBy: string;
        sortOrder: string;
    }): Promise<string[]>;
    private buildTariffRankSql;
    private buildSortSql;
}
