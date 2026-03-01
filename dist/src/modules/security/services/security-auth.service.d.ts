import { PrismaService } from '../../shared/database/prisma.service';
import { AuditService } from '../../audit/audit.service';
export declare class SecurityAuthService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    logLogin(userId: string, ipAddress: string | undefined, userAgent: string | undefined, success: boolean, failReason?: string): Promise<{
        failedAttempts: number;
    }>;
    getLoginHistory(userId: string, limit?: number): Promise<{
        id: string;
        ipAddress: string | null;
        deviceFingerprint: string | null;
        createdAt: Date;
        userId: string;
        userAgent: string | null;
        location: string | null;
        success: boolean;
        failReason: string | null;
    }[]>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
}
