import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/database/prisma.service';
import { EncryptionService } from '../shared/utils/encryption.service';
import { CacheService } from '../shared/cache/cache.service';
export declare class PhoneVerificationService {
    private readonly prisma;
    private readonly encryption;
    private readonly configService;
    private readonly cache;
    private twilioClient;
    constructor(prisma: PrismaService, encryption: EncryptionService, configService: ConfigService, cache: CacheService);
    sendVerificationCode(userId: string): Promise<{
        message: string;
        expiresAt: Date;
    }>;
    verifyCode(userId: string, code: string): Promise<{
        message: string;
    }>;
    private sendSMS;
    getVerificationStatus(userId: string): Promise<{
        phoneVerified: boolean;
        phoneVerifiedAt: Date | null;
    }>;
}
