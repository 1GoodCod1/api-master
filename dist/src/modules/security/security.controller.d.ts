import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { SecurityService } from './security.service';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class SecurityController {
    private readonly securityService;
    constructor(securityService: SecurityService);
    getMyLoginHistory(req: RequestWithUser): Promise<{
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
    changePassword(changePasswordDto: ChangePasswordDto, req: RequestWithUser): Promise<{
        message: string;
    }>;
    banUser(userId: string, body: {
        reason: string;
    }, req: RequestWithUser): Promise<{
        success: boolean;
        message: string;
    }>;
    unbanUser(userId: string, req: RequestWithUser): Promise<{
        success: boolean;
        message: string;
    }>;
    blacklistIp(body: {
        ipAddress: string;
        reason: string;
        expiresAt?: Date;
    }, req: RequestWithUser): Promise<{
        success: boolean;
        message: string;
    }>;
    removeIpFromBlacklist(ipAddress: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
