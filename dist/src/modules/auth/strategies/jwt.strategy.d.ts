import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    private readonly prisma;
    private readonly cache;
    constructor(configService: ConfigService, prisma: PrismaService, cache: CacheService);
    validate(payload: {
        sub: string;
        [key: string]: unknown;
    }): Promise<{
        id: string;
        email: string;
        phone: string | null;
        firstName: string | null | undefined;
        role: string;
        phoneVerified: boolean;
        isVerified: boolean;
        masterProfile: unknown;
    }>;
}
export {};
