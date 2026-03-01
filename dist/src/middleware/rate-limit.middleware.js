"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitMiddleware = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../modules/shared/redis/redis.service");
let RateLimitMiddleware = class RateLimitMiddleware {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async use(req, res, next) {
        const ip = req.ip;
        const key = `rate-limit:${ip}`;
        const windowMs = 15 * 60 * 1000;
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
};
exports.RateLimitMiddleware = RateLimitMiddleware;
exports.RateLimitMiddleware = RateLimitMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RateLimitMiddleware);
//# sourceMappingURL=rate-limit.middleware.js.map