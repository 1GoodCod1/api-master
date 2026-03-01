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
var AuthLockoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthLockoutService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../shared/redis/redis.service");
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_TTL_SEC = 15 * 60;
const WINDOW_TTL_SEC = 15 * 60;
let AuthLockoutService = AuthLockoutService_1 = class AuthLockoutService {
    redis;
    logger = new common_1.Logger(AuthLockoutService_1.name);
    constructor(redis) {
        this.redis = redis;
    }
    keyEmail(email) {
        const normalized = String(email || '')
            .toLowerCase()
            .trim();
        return `auth:lockout:email:${normalized}`;
    }
    keyIp(ip) {
        return `auth:lockout:ip:${String(ip || '').trim()}`;
    }
    async checkLocked(email, ipAddress) {
        const emailKey = this.keyEmail(email);
        const raw = await this.redis.getClient().get(emailKey);
        const count = raw !== null ? parseInt(raw, 10) || 0 : 0;
        if (count >= LOCKOUT_THRESHOLD) {
            this.logger.warn(`Login locked for email (${count} failed attempts)`);
            throw new common_1.ForbiddenException(`Слишком много неудачных попыток входа. Попробуйте через ${Math.ceil(LOCKOUT_TTL_SEC / 60)} минут.`);
        }
        if (ipAddress) {
            const ipKey = this.keyIp(ipAddress);
            const ipRaw = await this.redis.getClient().get(ipKey);
            const ipCount = ipRaw !== null ? parseInt(ipRaw, 10) || 0 : 0;
            if (ipCount >= LOCKOUT_THRESHOLD * 2) {
                this.logger.warn(`Login locked for IP (${ipCount} failed attempts)`);
                throw new common_1.ForbiddenException(`Слишком много неудачных попыток с этого IP. Попробуйте через ${Math.ceil(LOCKOUT_TTL_SEC / 60)} минут.`);
            }
        }
    }
    async recordFailed(email, ipAddress) {
        const client = this.redis.getClient();
        if (email) {
            const emailKey = this.keyEmail(email);
            const count = await client.incr(emailKey);
            if (count === 1) {
                await this.redis.expire(emailKey, WINDOW_TTL_SEC);
            }
            this.logger.debug(`Failed login attempt ${count}/${LOCKOUT_THRESHOLD} for ${email}`);
        }
        if (ipAddress) {
            const ipKey = this.keyIp(ipAddress);
            const ipCount = await client.incr(ipKey);
            if (ipCount === 1) {
                await this.redis.expire(ipKey, WINDOW_TTL_SEC);
            }
        }
    }
    async clearLockout(email, ipAddress) {
        await this.redis.del(this.keyEmail(email));
        if (ipAddress) {
            await this.redis.del(this.keyIp(ipAddress));
        }
    }
};
exports.AuthLockoutService = AuthLockoutService;
exports.AuthLockoutService = AuthLockoutService = AuthLockoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], AuthLockoutService);
//# sourceMappingURL=auth-lockout.service.js.map