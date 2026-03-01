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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../shared/database/prisma.service");
const cache_service_1 = require("../../shared/cache/cache.service");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configService;
    prisma;
    cache;
    constructor(configService, prisma, cache) {
        const secret = configService.get('jwt.accessSecret') ?? '';
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
        this.configService = configService;
        this.prisma = prisma;
        this.cache = cache;
    }
    async validate(payload) {
        const userId = payload.sub;
        const cacheKey = this.cache.keys.userMasterProfile(userId);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            if (cached.isBanned) {
                throw new common_1.UnauthorizedException('Ваш аккаунт заблокирован');
            }
            if (!('phoneVerified' in cached) || !('isVerified' in cached)) {
                await this.cache.del(cacheKey);
            }
            else {
                return {
                    id: cached.id,
                    email: cached.email,
                    phone: cached.phone,
                    firstName: cached.firstName,
                    role: cached.role,
                    phoneVerified: cached.phoneVerified === true,
                    isVerified: cached.isVerified === true,
                    masterProfile: cached.masterProfile,
                };
            }
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { masterProfile: true },
        });
        if (!user || user.isBanned) {
            throw new common_1.UnauthorizedException(user?.isBanned ? 'Ваш аккаунт заблокирован' : 'Пользователь не найден');
        }
        const result = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.firstName,
            role: user.role,
            phoneVerified: user.phoneVerified ?? false,
            isVerified: user.isVerified ?? false,
            masterProfile: user.masterProfile,
            isBanned: user.isBanned,
        };
        await this.cache.set(cacheKey, result, this.cache.ttl.userProfile);
        return {
            id: result.id,
            email: result.email,
            phone: result.phone,
            firstName: result.firstName,
            role: result.role,
            phoneVerified: result.phoneVerified,
            isVerified: result.isVerified,
            masterProfile: result.masterProfile,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        cache_service_1.CacheService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map