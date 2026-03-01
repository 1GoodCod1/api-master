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
var SecuritySuspiciousService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecuritySuspiciousService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const audit_service_1 = require("../../audit/audit.service");
let SecuritySuspiciousService = SecuritySuspiciousService_1 = class SecuritySuspiciousService {
    prisma;
    auditService;
    logger = new common_1.Logger(SecuritySuspiciousService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async checkSuspiciousAccounts() {
        this.logger.log('Запуск проверки подозрительных аккаунтов...');
        try {
            const suspiciousLeads = await this.prisma.lead.groupBy({
                by: ['clientId'],
                where: {
                    clientId: { not: null },
                    spamScore: { gte: 20 },
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
                _count: { id: true },
                having: { id: { _count: { gte: 3 } } },
            });
            for (const suspicious of suspiciousLeads) {
                if (suspicious.clientId) {
                    await this.increaseSuspiciousScore(suspicious.clientId, 30, 'Множественные спам-лиды');
                }
            }
            const reportsCount = await this.prisma.report.groupBy({
                by: ['clientId'],
                where: {
                    status: constants_1.ReportStatus.PENDING,
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
                _count: { id: true },
                having: { id: { _count: { gte: 3 } } },
            });
            for (const report of reportsCount) {
                await this.increaseSuspiciousScore(report.clientId, 40, 'Множественные жалобы на пользователя');
            }
            const masterReports = await this.prisma.report.groupBy({
                by: ['masterId'],
                where: {
                    status: constants_1.ReportStatus.PENDING,
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
                _count: { id: true },
                having: { id: { _count: { gte: 5 } } },
            });
            for (const report of masterReports) {
                const master = await this.prisma.master.findUnique({
                    where: { id: report.masterId },
                });
                if (master) {
                    await this.increaseSuspiciousScore(master.userId, 50, 'Множественные жалобы на профиль мастера');
                }
            }
            const usersToBlock = await this.prisma.user.findMany({
                where: { suspiciousScore: { gte: 100 }, isBanned: false },
            });
            return usersToBlock;
        }
        catch (error) {
            this.logger.error('Ошибка при проверке подозрительных аккаунтов:', error);
            return [];
        }
    }
    async increaseSuspiciousScore(userId, points, reason) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.isBanned)
            return;
        const newScore = user.suspiciousScore + points;
        await this.prisma.user.update({
            where: { id: userId },
            data: { suspiciousScore: newScore },
        });
        await this.auditService.log({
            userId,
            action: 'SUSPICIOUS_SCORE_INCREASED',
            entityType: 'User',
            entityId: userId,
            oldData: { suspiciousScore: user.suspiciousScore },
            newData: { suspiciousScore: newScore, reason },
        });
        this.logger.warn(`Рейтинг подозрительности пользователя ${userId} увеличен на ${points}. Причина: ${reason}. Новое значение: ${newScore}`);
    }
};
exports.SecuritySuspiciousService = SecuritySuspiciousService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SecuritySuspiciousService.prototype, "checkSuspiciousAccounts", null);
exports.SecuritySuspiciousService = SecuritySuspiciousService = SecuritySuspiciousService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SecuritySuspiciousService);
//# sourceMappingURL=security-suspicious.service.js.map