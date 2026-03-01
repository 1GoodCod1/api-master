import { MastersService } from './masters.service';
export declare class SearchController {
    private readonly mastersService;
    constructor(mastersService: MastersService);
    searchMasters(categoryId?: string, cityId?: string, minRating?: number, minExperience?: number): Promise<{
        items: never[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor?: undefined;
        };
    } | {
        items: {
            effectiveTariffType: "BASIC" | "VIP" | "PREMIUM";
            tariffType: "BASIC" | "VIP" | "PREMIUM";
            avatarUrl: string | null;
            latitude: number | null;
            longitude: number | null;
            services: string | number | boolean | import(".prisma/client/runtime/client").JsonObject | import(".prisma/client/runtime/client").JsonArray | null;
            user?: {
                phone?: string | null;
                email?: string | null;
                [key: string]: unknown;
            };
            tariffExpiresAt?: Date | string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            nextCursor: number | null;
        };
    }>;
}
