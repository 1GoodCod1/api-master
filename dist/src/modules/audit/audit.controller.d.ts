import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getLogs(userId?: string, action?: string, entityType?: string, startDate?: string, endDate?: string, page?: string | number, limit?: string | number): Promise<{
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
            oldData: import(".prisma/client/runtime/client").JsonValue | null;
            newData: import(".prisma/client/runtime/client").JsonValue | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getRecentStream(limit?: string | number): Promise<{
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
        byUser: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.AuditLogGroupByOutputType, "userId"[]> & {
            _count: number;
        })[];
    }>;
}
