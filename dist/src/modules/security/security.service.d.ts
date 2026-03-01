import { SecuritySuspiciousService } from './services/security-suspicious.service';
import { SecurityBanService } from './services/security-ban.service';
import { SecurityAuthService } from './services/security-auth.service';
export declare class SecurityService {
    private readonly suspiciousService;
    private readonly banService;
    private readonly authService;
    private readonly logger;
    constructor(suspiciousService: SecuritySuspiciousService, banService: SecurityBanService, authService: SecurityAuthService);
    checkSuspiciousAccounts(): Promise<void>;
    increaseSuspiciousScore(userId: string, points: number, reason: string): Promise<void>;
    banUser(userId: string, reason: string, bannedBy: string): Promise<void>;
    unbanUser(userId: string, unbannedBy: string): Promise<void>;
    isIpBlacklisted(ipAddress: string): Promise<boolean>;
    blacklistIp(ipAddress: string, reason: string, blockedBy: string, expiresAt?: Date): Promise<void>;
    removeIpFromBlacklist(ipAddress: string): Promise<void>;
    logLogin(userId: string, ipAddress: string | undefined, userAgent: string | undefined, success: boolean, failReason?: string): Promise<void>;
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
