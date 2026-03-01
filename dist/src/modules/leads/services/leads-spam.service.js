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
exports.LeadsSpamService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../shared/redis/redis.service");
const recaptcha_service_1 = require("../../shared/utils/recaptcha.service");
let LeadsSpamService = class LeadsSpamService {
    redis;
    recaptchaService;
    constructor(redis, recaptchaService) {
        this.redis = redis;
        this.recaptchaService = recaptchaService;
    }
    async checkProtection(dto, ipAddress) {
        const { clientPhone, masterId, recaptchaToken } = dto;
        if (recaptchaToken && this.recaptchaService.isConfigured()) {
            await this.recaptchaService.verifyToken(recaptchaToken, 'create_lead');
        }
        const redis = this.redis.getClient();
        const recentLeadKey = `lead:${clientPhone}:${masterId}`;
        const recentLead = await redis.get(recentLeadKey);
        if (recentLead) {
            throw new common_1.BadRequestException('You have already sent a lead to this master recently. Please wait 5 minutes.');
        }
        const rateLimitKey = `lead:rate:${clientPhone}`;
        const leadCount = await redis.incr(rateLimitKey);
        if (leadCount === 1)
            await redis.expire(rateLimitKey, 3600);
        if (leadCount > 5) {
            throw new common_1.BadRequestException('Too many leads from this phone number. Maximum 5 leads per hour.');
        }
        if (ipAddress) {
            const ipRateLimitKey = `lead:rate:ip:${ipAddress}`;
            const ipLeadCount = await redis.incr(ipRateLimitKey);
            if (ipLeadCount === 1)
                await redis.expire(ipRateLimitKey, 3600);
            if (ipLeadCount > 10) {
                throw new common_1.BadRequestException('Too many leads from this IP address. Please try again later.');
            }
        }
        await redis.setex(recentLeadKey, 300, '1');
    }
    calculateSpamScore(dto) {
        let score = 0;
        const message = dto.message.toLowerCase();
        const spamKeywords = ['casino', 'gamble', 'viagra', 'lottery', 'credit'];
        spamKeywords.forEach((keyword) => {
            if (message.includes(keyword))
                score += 10;
        });
        if (message.length < 5)
            score += 5;
        if (message.length > 500)
            score += 5;
        const phonePattern = /^(\+373|0)\d{8}$/;
        if (!dto.clientPhone || !phonePattern.test(dto.clientPhone)) {
            score += 10;
        }
        return score;
    }
};
exports.LeadsSpamService = LeadsSpamService;
exports.LeadsSpamService = LeadsSpamService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        recaptcha_service_1.RecaptchaService])
], LeadsSpamService);
//# sourceMappingURL=leads-spam.service.js.map