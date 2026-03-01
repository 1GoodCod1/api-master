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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/database/prisma.service");
const cache_service_1 = require("../shared/cache/cache.service");
const token_service_1 = require("./services/token.service");
const registration_service_1 = require("./services/registration.service");
const password_reset_service_1 = require("./services/password-reset.service");
const login_service_1 = require("./services/login.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    cache;
    tokenService;
    registrationService;
    passwordResetService;
    loginService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, cache, tokenService, registrationService, passwordResetService, loginService) {
        this.prisma = prisma;
        this.cache = cache;
        this.tokenService = tokenService;
        this.registrationService = registrationService;
        this.passwordResetService = passwordResetService;
        this.loginService = loginService;
    }
    async register(registerDto) {
        return this.registrationService.register(registerDto);
    }
    async getRegistrationOptions() {
        return this.registrationService.getRegistrationOptions();
    }
    getEarlyBirdStatus() {
        return {
            isActive: false,
            remainingSlots: 0,
            totalSlots: 0,
        };
    }
    async login(loginDto, ipAddress, userAgent) {
        return this.loginService.login(loginDto, ipAddress, userAgent);
    }
    async logout(refreshToken) {
        return this.loginService.logout(refreshToken);
    }
    async validateUser(email, password) {
        return this.loginService.validateUser(email, password);
    }
    async refreshTokens(refreshToken) {
        return this.tokenService.refreshTokens(refreshToken);
    }
    async cleanupExpiredTokens() {
        return this.tokenService.cleanupExpiredTokens();
    }
    async getProfile(userId) {
        const cacheKey = this.cache.keys.userProfile(userId);
        return this.cache.getOrSet(cacheKey, async () => {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    role: true,
                    isVerified: true,
                    phoneVerified: true,
                    isBanned: true,
                    lastLoginAt: true,
                    createdAt: true,
                    updatedAt: true,
                    avatarFile: {
                        select: {
                            id: true,
                            path: true,
                            filename: true,
                        },
                    },
                    masterProfile: {
                        select: {
                            id: true,
                            tariffType: true,
                            tariffExpiresAt: true,
                            lifetimePremium: true,
                            avatarFile: {
                                select: {
                                    id: true,
                                    path: true,
                                    filename: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            return {
                user,
            };
        }, this.cache.ttl.userProfile);
    }
    async invalidateUserCache(userId) {
        await this.cache.del(this.cache.keys.userProfile(userId));
        await this.cache.del(this.cache.keys.userMasterProfile(userId));
    }
    async forgotPassword(forgotPasswordDto) {
        return this.passwordResetService.forgotPassword(forgotPasswordDto);
    }
    async resetPassword(resetPasswordDto) {
        return this.passwordResetService.resetPassword(resetPasswordDto);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cache_service_1.CacheService,
        token_service_1.TokenService,
        registration_service_1.RegistrationService,
        password_reset_service_1.PasswordResetService,
        login_service_1.LoginService])
], AuthService);
//# sourceMappingURL=auth.service.js.map