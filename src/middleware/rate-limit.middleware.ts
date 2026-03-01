import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../modules/shared/redis/redis.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip;
    const key = `rate-limit:${ip}`;
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;

    const current = await this.redis.getClient().incr(key);

    if (current === 1) {
      await this.redis.getClient().expire(key, windowMs / 1000);
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

    if (current > maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    next();
  }
}
