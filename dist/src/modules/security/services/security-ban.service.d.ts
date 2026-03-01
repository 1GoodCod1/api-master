import { PrismaService } from '../../shared/database/prisma.service';
import { AuditService } from '../../audit/audit.service';
export declare class SecurityBanService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    banUser(userId: string, reason: string, bannedBy: string): Promise<void>;
    unbanUser(userId: string, unbannedBy: string): Promise<void>;
    isIpBlacklisted(ipAddress: string): Promise<boolean>;
    blacklistIp(ipAddress: string, reason: string, blockedBy: string, expiresAt?: Date): Promise<void>;
    removeIpFromBlacklist(ipAddress: string): Promise<void>;
}
