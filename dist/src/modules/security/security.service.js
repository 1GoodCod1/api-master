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
var SecurityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const security_suspicious_service_1 = require("./services/security-suspicious.service");
const security_ban_service_1 = require("./services/security-ban.service");
const security_auth_service_1 = require("./services/security-auth.service");
let SecurityService = SecurityService_1 = class SecurityService {
    suspiciousService;
    banService;
    authService;
    logger = new common_1.Logger(SecurityService_1.name);
    constructor(suspiciousService, banService, authService) {
        this.suspiciousService = suspiciousService;
        this.banService = banService;
        this.authService = authService;
    }
    async checkSuspiciousAccounts() {
        const usersToBlock = await this.suspiciousService.checkSuspiciousAccounts();
        for (const user of usersToBlock) {
            await this.banService.banUser(user.id, 'Автоматическая блокировка: высокий рейтинг подозрительности', 'system');
        }
        if (usersToBlock.length > 0) {
            this.logger.log(`Автоматическая проверка завершена. Заблокировано пользователей: ${usersToBlock.length}`);
        }
    }
    async increaseSuspiciousScore(userId, points, reason) {
        return this.suspiciousService.increaseSuspiciousScore(userId, points, reason);
    }
    async banUser(userId, reason, bannedBy) {
        return this.banService.banUser(userId, reason, bannedBy);
    }
    async unbanUser(userId, unbannedBy) {
        return this.banService.unbanUser(userId, unbannedBy);
    }
    async isIpBlacklisted(ipAddress) {
        return this.banService.isIpBlacklisted(ipAddress);
    }
    async blacklistIp(ipAddress, reason, blockedBy, expiresAt) {
        return this.banService.blacklistIp(ipAddress, reason, blockedBy, expiresAt);
    }
    async removeIpFromBlacklist(ipAddress) {
        return this.banService.removeIpFromBlacklist(ipAddress);
    }
    async logLogin(userId, ipAddress, userAgent, success, failReason) {
        const result = await this.authService.logLogin(userId, ipAddress, userAgent, success, failReason);
        if (!success && result.failedAttempts >= 5) {
            await this.suspiciousService.increaseSuspiciousScore(userId, 20, 'Множественные неудачные попытки входа');
            this.logger.warn(`Пользователь ${userId} совершил ${result.failedAttempts} неудачных попыток входа`);
        }
    }
    async getLoginHistory(userId, limit = 10) {
        return this.authService.getLoginHistory(userId, limit);
    }
    async changePassword(userId, currentPassword, newPassword) {
        return this.authService.changePassword(userId, currentPassword, newPassword);
    }
};
exports.SecurityService = SecurityService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SecurityService.prototype, "checkSuspiciousAccounts", null);
exports.SecurityService = SecurityService = SecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [security_suspicious_service_1.SecuritySuspiciousService,
        security_ban_service_1.SecurityBanService,
        security_auth_service_1.SecurityAuthService])
], SecurityService);
//# sourceMappingURL=security.service.js.map