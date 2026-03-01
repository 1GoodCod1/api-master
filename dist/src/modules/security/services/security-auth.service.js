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
var SecurityAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityAuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../shared/database/prisma.service");
const audit_service_1 = require("../../audit/audit.service");
let SecurityAuthService = SecurityAuthService_1 = class SecurityAuthService {
    prisma;
    auditService;
    logger = new common_1.Logger(SecurityAuthService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async logLogin(userId, ipAddress, userAgent, success, failReason) {
        await this.prisma.loginHistory.create({
            data: {
                userId,
                ipAddress,
                userAgent,
                success,
                failReason,
            },
        });
        if (!success) {
            const failedAttempts = await this.prisma.loginHistory.count({
                where: {
                    userId,
                    success: false,
                    createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
                },
            });
            return { failedAttempts };
        }
        return { failedAttempts: 0 };
    }
    async getLoginHistory(userId, limit = 10) {
        return this.prisma.loginHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('Пользователь не найден');
        if (!user.password)
            throw new common_1.BadRequestException('Пароль для этого аккаунта не задан');
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid)
            throw new common_1.UnauthorizedException('Текущий пароль указан неверно');
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword)
            throw new common_1.BadRequestException('Новый пароль должен отличаться от текущего');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        await this.auditService.log({
            userId,
            action: 'CHANGE_PASSWORD',
            entityType: 'User',
            entityId: userId,
        });
        this.logger.log(`Пароль пользователя ${userId} изменен`);
        return { message: 'Пароль успешно изменен' };
    }
};
exports.SecurityAuthService = SecurityAuthService;
exports.SecurityAuthService = SecurityAuthService = SecurityAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SecurityAuthService);
//# sourceMappingURL=security-auth.service.js.map