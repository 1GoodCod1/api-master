import { PrismaService } from '../../shared/database/prisma.service';
export declare class AdminAuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getRecentActivity(limit?: number): Promise<({
        user: {
            email: string;
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
    })[]>;
}
