import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { TariffType } from '@prisma/client';
export declare class TariffsQueryService {
    private readonly prisma;
    private readonly cache;
    private readonly logger;
    constructor(prisma: PrismaService, cache: CacheService);
    findAll(filters?: {
        isActive?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        type: import("@prisma/client").$Enums.TariffType;
        price: string;
        amount: Prisma.Decimal;
        days: number;
        stripePriceId: string | null;
        features: Prisma.JsonValue;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        type: import("@prisma/client").$Enums.TariffType;
        price: string;
        amount: Prisma.Decimal;
        days: number;
        stripePriceId: string | null;
        features: Prisma.JsonValue;
    }>;
    findByType(type: TariffType): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        type: import("@prisma/client").$Enums.TariffType;
        price: string;
        amount: Prisma.Decimal;
        days: number;
        stripePriceId: string | null;
        features: Prisma.JsonValue;
    }>;
    getActiveTariffs(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        type: import("@prisma/client").$Enums.TariffType;
        price: string;
        amount: Prisma.Decimal;
        days: number;
        stripePriceId: string | null;
        features: Prisma.JsonValue;
    }[]>;
}
