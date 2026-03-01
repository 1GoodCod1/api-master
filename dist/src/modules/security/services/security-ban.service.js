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
var SecurityBanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityBanService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const audit_service_1 = require("../../audit/audit.service");
let SecurityBanService = SecurityBanService_1 = class SecurityBanService {
    prisma;
    auditService;
    logger = new common_1.Logger(SecurityBanService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async banUser(userId, reason, bannedBy) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.isBanned)
            return;
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: true,
                bannedAt: new Date(),
                bannedReason: reason,
            },
        });
        await this.auditService.log({
            userId: bannedBy === 'system' ? null : bannedBy,
            action: 'USER_BANNED',
            entityType: 'User',
            entityId: userId,
            newData: { reason, bannedBy },
        });
        this.logger.warn(`Пользователь ${userId} заблокирован. Причина: ${reason}. Кем: ${bannedBy}`);
    }
    async unbanUser(userId, unbannedBy) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: false,
                bannedAt: null,
                bannedReason: null,
                suspiciousScore: 0,
            },
        });
        await this.auditService.log({
            userId: unbannedBy,
            action: 'USER_UNBANNED',
            entityType: 'User',
            entityId: userId,
            newData: { unbannedBy },
        });
        this.logger.log(`Пользователь ${userId} разблокирован пользователем ${unbannedBy}`);
    }
    async isIpBlacklisted(ipAddress) {
        const blacklisted = await this.prisma.ipBlacklist.findFirst({
            where: {
                ipAddress,
                OR: [{ permanent: true }, { expiresAt: { gt: new Date() } }],
            },
        });
        return !!blacklisted;
    }
    async blacklistIp(ipAddress, reason, blockedBy, expiresAt) {
        await this.prisma.ipBlacklist.create({
            data: {
                ipAddress,
                reason,
                blockedBy,
                expiresAt,
                permanent: !expiresAt,
            },
        });
        await this.auditService.log({
            userId: blockedBy,
            action: 'IP_BLACKLISTED',
            entityType: 'IpBlacklist',
            entityId: ipAddress,
            newData: { reason, blockedBy, expiresAt },
        });
        this.logger.warn(`IP ${ipAddress} добавлен в черный список. Причина: ${reason}`);
    }
    async removeIpFromBlacklist(ipAddress) {
        await this.prisma.ipBlacklist.deleteMany({
            where: { ipAddress },
        });
        this.logger.log(`IP ${ipAddress} удален из черного списка`);
    }
};
exports.SecurityBanService = SecurityBanService;
exports.SecurityBanService = SecurityBanService = SecurityBanService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SecurityBanService);
//# sourceMappingURL=security-ban.service.js.map