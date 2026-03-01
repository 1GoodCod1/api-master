import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { CreateTariffDto } from '../dto/create-tariff.dto';
import { UpdateTariffDto } from '../dto/update-tariff.dto';
import { Decimal } from '@prisma/client-runtime-utils';
export declare class TariffsActionService {
    private readonly prisma;
    private readonly cache;
    constructor(prisma: PrismaService, cache: CacheService);
    create(dto: CreateTariffDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        type: import("@prisma/client").$Enums.TariffType;
        price: string;
        amount: Decimal;
        days: number;
        stripePriceId: string | null;
        features: import(".prisma/client/runtime/client").JsonValue;
    }>;
    update(id: string, dto: UpdateTariffDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        type: import("@prisma/client").$Enums.TariffType;
        price: string;
        amount: Decimal;
        days: number;
        stripePriceId: string | null;
        features: import(".prisma/client/runtime/client").JsonValue;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isActive: boolean;
        sortOrder: number;
        type: import("@prisma/client").$Enums.TariffType;
        price: string;
        amount: Decimal;
        days: number;
        stripePriceId: string | null;
        features: import(".prisma/client/runtime/client").JsonValue;
    }>;
    private invalidateCache;
}
