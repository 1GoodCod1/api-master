"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../shared/database/prisma.service");
const token_service_1 = require("./token.service");
const cache_service_1 = require("../../shared/cache/cache.service");
const auth_lockout_service_1 = require("./auth-lockout.service");
let LoginService = class LoginService {
    prisma;
    tokenService;
    cache;
    lockout;
    constructor(prisma, tokenService, cache, lockout) {
        this.prisma = prisma;
        this.tokenService = tokenService;
        this.cache = cache;
        this.lockout = lockout;
    }
    async login(loginDto, ipAddress, userAgent) {
        const { email, password } = loginDto;
        await this.lockout.checkLocked(email, ipAddress);
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                masterProfile: true,
            },
        });
        if (ipAddress) {
            await this.checkIpBlacklist(ipAddress);
        }
        if (!user || !(await bcrypt.compare(password, user.password))) {
            if (user) {
                await this.lockout.recordFailed(email, ipAddress);
                await this.logLoginAttempt(user.id, false, ipAddress, userAgent, 'Invalid password');
            }
            else if (ipAddress) {
                await this.lockout.recordFailed(undefined, ipAddress);
            }
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.isBanned) {
            await this.logLoginAttempt(user.id, false, ipAddress, userAgent, 'Account banned');
            throw new common_1.UnauthorizedException('Account is banned');
        }
        await this.lockout.clearLockout(email, ipAddress);
        const accessToken = this.tokenService.generateAccessToken(user);
        const refreshToken = await this.tokenService.generateRefreshToken(user.id);
        await this.updateLoginMetadata(user.id, ipAddress, userAgent);
        await this.invalidateUserCache(user.id);
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
                phoneVerified: user.phoneVerified,
                masterProfile: user.masterProfile,
            },
        };
    }
    async logout(refreshToken) {
        await this.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
        return { message: 'Logged out successfully' };
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && (await bcrypt.compare(password, user.password))) {
            const { password: _pwd, ...result } = user;
            void _pwd;
            return result;
        }
        return null;
    }
    async checkIpBlacklist(ipAddress) {
        const blacklisted = await this.prisma.ipBlacklist.findFirst({
            where: {
                ipAddress,
                OR: [{ permanent: true }, { expiresAt: { gt: new Date() } }],
            },
        });
        if (blacklisted) {
            throw new common_1.ForbiddenException('Access denied from this IP address');
        }
    }
    async logLoginAttempt(userId, success, ipAddress, userAgent, failReason) {
        await this.prisma.loginHistory.create({
            data: {
                userId,
                ipAddress,
                userAgent,
                success,
                failReason,
            },
        });
    }
    async updateLoginMetadata(userId, ipAddress, userAgent) {
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: {
                    lastLoginAt: new Date(),
                    ipAddress,
                },
            }),
            this.prisma.loginHistory.create({
                data: {
                    userId,
                    ipAddress,
                    userAgent,
                    success: true,
                },
            }),
        ]);
    }
    async invalidateUserCache(userId) {
        await this.cache.del(this.cache.keys.userProfile(userId));
        await this.cache.del(this.cache.keys.userMasterProfile(userId));
    }
};
exports.LoginService = LoginService;
exports.LoginService = LoginService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        token_service_1.TokenService,
        cache_service_1.CacheService,
        auth_lockout_service_1.AuthLockoutService])
], LoginService);
//# sourceMappingURL=login.service.js.map