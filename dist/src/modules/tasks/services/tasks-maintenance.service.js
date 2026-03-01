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
var TasksMaintenanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksMaintenanceService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const redis_service_1 = require("../../shared/redis/redis.service");
const notifications_service_1 = require("../../notifications/notifications.service");
let TasksMaintenanceService = TasksMaintenanceService_1 = class TasksMaintenanceService {
    prisma;
    redis;
    notifications;
    logger = new common_1.Logger(TasksMaintenanceService_1.name);
    constructor(prisma, redis, notifications) {
        this.prisma = prisma;
        this.redis = redis;
        this.notifications = notifications;
    }
    async cleanOldLeads() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const result = await this.prisma.lead.deleteMany({
            where: {
                status: constants_1.LeadStatus.CLOSED,
                updatedAt: { lt: thirtyDaysAgo },
            },
        });
        this.logger.log(`Cleaned ${result.count} old leads`);
    }
    async syncRedisCounters() {
        const redis = this.redis.getClient();
        const keys = await redis.keys('master:*:views');
        for (const key of keys) {
            const viewsStr = await redis.get(key);
            const views = viewsStr ? parseInt(viewsStr, 10) : 0;
            const masterId = key.split(':')[1];
            if (views > 0 && masterId) {
                await this.prisma.master.update({
                    where: { id: masterId },
                    data: { views: { increment: views } },
                });
                await redis.set(key, '0');
            }
        }
        this.logger.log(`Synced ${keys.length} view counters`);
    }
    async checkSystemHealth() {
        const redis = this.redis.getClient();
        const [redisPing, queueStats] = await Promise.all([
            redis.ping(),
            this.getQueueStats(redis),
        ]);
        if (redisPing !== 'PONG') {
            this.logger.error('Redis health check failed');
            await this.notifications.sendTelegram('🚨 Redis health check failed!');
        }
        for (const [queue, stats] of Object.entries(queueStats)) {
            if (stats.waiting > 100) {
                this.logger.warn(`Queue ${queue} has backlog: ${stats.waiting} jobs`);
            }
        }
    }
    async updateMasterRatings() {
        const masters = await this.prisma.master.findMany({ select: { id: true } });
        for (const master of masters) {
            const reviews = await this.prisma.review.aggregate({
                where: { masterId: master.id, status: constants_1.ReviewStatus.VISIBLE },
                _avg: { rating: true },
                _count: true,
            });
            if (reviews._avg.rating !== null) {
                await this.prisma.master.update({
                    where: { id: master.id },
                    data: {
                        rating: reviews._avg.rating,
                        totalReviews: reviews._count,
                    },
                });
            }
        }
        this.logger.log(`Updated ratings for ${masters.length} masters`);
    }
    async cleanupExpiredTokens() {
        const now = new Date();
        const deletedRefreshTokens = await this.prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: now } },
        });
        const deletedPasswordResetTokens = await this.prisma.passwordResetToken.deleteMany({
            where: {
                OR: [{ expiresAt: { lt: now } }, { used: true }],
                createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
        });
        if (deletedRefreshTokens.count > 0 ||
            deletedPasswordResetTokens.count > 0) {
            this.logger.log(`Cleaned up ${deletedRefreshTokens.count} expired refresh tokens and ${deletedPasswordResetTokens.count} expired password reset tokens`);
        }
    }
    async getQueueStats(redis) {
        const queues = ['sms', 'telegram'];
        const stats = {};
        for (const queue of queues) {
            const [waiting, active, completed, failed] = await Promise.all([
                redis.llen(`bull:${queue}:wait`),
                redis.llen(`bull:${queue}:active`),
                redis.zcard(`bull:${queue}:completed`),
                redis.zcard(`bull:${queue}:failed`),
            ]);
            stats[queue] = {
                waiting: Number(waiting) || 0,
                active: Number(active) || 0,
                completed: Number(completed) || 0,
                failed: Number(failed) || 0,
            };
        }
        return stats;
    }
};
exports.TasksMaintenanceService = TasksMaintenanceService;
exports.TasksMaintenanceService = TasksMaintenanceService = TasksMaintenanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        notifications_service_1.NotificationsService])
], TasksMaintenanceService);
//# sourceMappingURL=tasks-maintenance.service.js.map