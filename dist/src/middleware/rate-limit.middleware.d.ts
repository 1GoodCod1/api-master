import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../modules/shared/redis/redis.service';
export declare class RateLimitMiddleware implements NestMiddleware {
    private readonly redis;
    constructor(redis: RedisService);
    use(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
}
