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
var TasksAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const redis_service_1 = require("../../shared/redis/redis.service");
const notifications_service_1 = require("../../notifications/notifications.service");
let TasksAnalyticsService = TasksAnalyticsService_1 = class TasksAnalyticsService {
    prisma;
    redis;
    notifications;
    logger = new common_1.Logger(TasksAnalyticsService_1.name);
    constructor(prisma, redis, notifications) {
        this.prisma = prisma;
        this.redis = redis;
        this.notifications = notifications;
    }
    async aggregateAnalytics() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const masters = await this.prisma.master.findMany({
            select: { id: true, userId: true },
        });
        for (const master of masters) {
            const [leads, reviews, payments, views] = await Promise.all([
                this.prisma.lead.count({
                    where: {
                        masterId: master.id,
                        createdAt: {
                            gte: yesterday,
                            lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
                        },
                    },
                }),
                this.prisma.review.count({
                    where: {
                        masterId: master.id,
                        createdAt: {
                            gte: yesterday,
                            lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
                        },
                        status: constants_1.ReviewStatus.VISIBLE,
                    },
                }),
                this.prisma.payment.aggregate({
                    where: {
                        masterId: master.id,
                        createdAt: {
                            gte: yesterday,
                            lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
                        },
                        status: constants_1.PaymentStatus.SUCCESS,
                    },
                    _sum: { amount: true },
                }),
                this.prisma.userActivity.count({
                    where: {
                        masterId: master.id,
                        action: 'view',
                        createdAt: {
                            gte: yesterday,
                            lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
                        },
                        ...(master.userId && {
                            OR: [{ userId: null }, { userId: { not: master.userId } }],
                        }),
                    },
                }),
            ]);
            await this.prisma.masterAnalytics.upsert({
                where: {
                    masterId_date: { masterId: master.id, date: yesterday },
                },
                update: {
                    leadsCount: leads,
                    viewsCount: views,
                    reviewsCount: reviews,
                    revenue: payments._sum.amount || 0,
                },
                create: {
                    masterId: master.id,
                    date: yesterday,
                    leadsCount: leads,
                    viewsCount: views,
                    reviewsCount: reviews,
                    revenue: payments._sum.amount || 0,
                },
            });
        }
        const [totalUsers, totalMasters, totalLeads, totalReviews, totalRevenue, activeUsers, redisKeys,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.master.count(),
            this.prisma.lead.count({
                where: {
                    createdAt: {
                        gte: yesterday,
                        lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
            }),
            this.prisma.review.count({
                where: {
                    createdAt: {
                        gte: yesterday,
                        lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
            }),
            this.prisma.payment.aggregate({
                where: {
                    createdAt: {
                        gte: yesterday,
                        lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
                    },
                    status: constants_1.PaymentStatus.SUCCESS,
                },
                _sum: { amount: true },
            }),
            this.prisma.user.count({
                where: {
                    lastLoginAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
            this.redis.getClient().dbsize(),
        ]);
        await this.prisma.systemAnalytics.create({
            data: {
                date: yesterday,
                totalUsers,
                totalMasters,
                totalLeads,
                totalReviews,
                totalRevenue: totalRevenue._sum.amount || 0,
                activeUsers,
                redisKeys,
            },
        });
        this.logger.log('Analytics aggregated for yesterday');
    }
    async sendDailyReports() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const stats = await this.prisma.systemAnalytics.findFirst({
            where: { date: { gte: yesterday } },
            orderBy: { date: 'desc' },
        });
        if (stats) {
            const message = `📊 Ежедневный отчет:\n` +
                `Пользователи: +${stats.totalUsers}\n` +
                `Мастера: +${stats.totalMasters}\n` +
                `Заявки: ${stats.totalLeads}\n` +
                `Отзывы: ${stats.totalReviews}\n`;
            await this.notifications.sendTelegram(message);
        }
    }
};
exports.TasksAnalyticsService = TasksAnalyticsService;
exports.TasksAnalyticsService = TasksAnalyticsService = TasksAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        notifications_service_1.NotificationsService])
], TasksAnalyticsService);
//# sourceMappingURL=tasks-analytics.service.js.map