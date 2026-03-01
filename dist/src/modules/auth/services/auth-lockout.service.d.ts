import { RedisService } from '../../shared/redis/redis.service';
export declare class AuthLockoutService {
    private readonly redis;
    private readonly logger;
    constructor(redis: RedisService);
    private keyEmail;
    private keyIp;
    checkLocked(email: string, ipAddress?: string): Promise<void>;
    recordFailed(email: string | undefined, ipAddress?: string): Promise<void>;
    clearLockout(email: string, ipAddress?: string): Promise<void>;
}
