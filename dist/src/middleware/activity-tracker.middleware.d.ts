import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../modules/shared/database/prisma.service';
import { RedisService } from '../modules/shared/redis/redis.service';
export declare class ActivityTrackerMiddleware implements NestMiddleware {
    private readonly prisma;
    private readonly redis;
    constructor(prisma: PrismaService, redis: RedisService);
    use(req: Request, res: Response, next: NextFunction): void;
    private updateLastActivity;
}
