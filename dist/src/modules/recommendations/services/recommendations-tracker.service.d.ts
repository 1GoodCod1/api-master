import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
export declare class RecommendationsTrackerService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    trackActivity(data: {
        userId?: string;
        sessionId?: string;
        action: string;
        masterId?: string;
        categoryId?: string;
        cityId?: string;
        searchQuery?: string;
        metadata?: Prisma.InputJsonValue;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        id: string;
        ipAddress: string | null;
        createdAt: Date;
        userId: string | null;
        cityId: string | null;
        categoryId: string | null;
        metadata: Prisma.JsonValue | null;
        masterId: string | null;
        userAgent: string | null;
        action: string;
        sessionId: string | null;
        searchQuery: string | null;
    }>;
}
