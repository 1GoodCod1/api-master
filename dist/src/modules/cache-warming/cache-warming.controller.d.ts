import { CacheWarmingService } from './cache-warming.service';
export declare class CacheWarmingController {
    private readonly cacheWarmingService;
    constructor(cacheWarmingService: CacheWarmingService);
    warmCache(): Promise<{
        message: string;
        success: boolean;
    }>;
}
