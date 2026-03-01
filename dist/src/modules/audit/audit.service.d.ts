import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { RedisService } from '../shared/redis/redis.service';
interface AuditLogData {
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    oldData?: Prisma.InputJsonValue;
    newData?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    log(data: AuditLogData): Promise<{
        id: string;
        ipAddress: string | null;
        createdAt: Date;
        userId: string | null;
        userAgent: string | null;
        action: string;
        entityType: string | null;
        entityId: string | null;
        oldData: Prisma.JsonValue | null;
        newData: Prisma.JsonValue | null;
    } | undefined>;
    getLogs(filters?: {
        userId?: string;
        action?: string;
        entityType?: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        logs: ({
            user: {
                email: string;
                phone: string;
                role: import("@prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            ipAddress: string | null;
            createdAt: Date;
            userId: string | null;
            userAgent: string | null;
            action: string;
            entityType: string | null;
            entityId: string | null;
            oldData: Prisma.JsonValue | null;
            newData: Prisma.JsonValue | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getRecentStream(limit?: number): Promise<{
        items: Record<string, string>[];
    } | {
        items: {
            id: string;
            action: string;
            entity: string | null;
            entityId: string | null;
            actorId: string | null;
            ip: string | null;
            ua: string | null;
            createdAt: string;
            user: {
                email: string;
                role: import("@prisma/client").$Enums.UserRole;
            } | null;
        }[];
    }>;
    getStats(timeframe?: 'day' | 'week' | 'month'): Promise<{
        timeframe: "week" | "day" | "month";
        totalLogs: number;
        byAction: {
            action: string;
            count: number;
        }[];
        byUser: (Prisma.PickEnumerable<Prisma.AuditLogGroupByOutputType, "userId"[]> & {
            _count: number;
        })[];
    }>;
}
export {};
