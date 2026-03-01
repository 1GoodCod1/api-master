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
var TasksActivityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksActivityService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../../../common/constants");
const prisma_service_1 = require("../../shared/database/prisma.service");
const redis_service_1 = require("../../shared/redis/redis.service");
const notifications_service_1 = require("../../notifications/notifications.service");
let TasksActivityService = TasksActivityService_1 = class TasksActivityService {
    prisma;
    redis;
    notifications;
    logger = new common_1.Logger(TasksActivityService_1.name);
    INACTIVITY_THRESHOLD_DAYS = 30;
    WARNING_THRESHOLD_DAYS = 25;
    RATING_PENALTY = 0.5;
    constructor(prisma, redis, notifications) {
        this.prisma = prisma;
        this.redis = redis;
        this.notifications = notifications;
    }
    async checkInactiveMasters() {
        this.logger.log('Начало проверки неактивных мастеров...');
        try {
            const inactiveThreshold = new Date();
            inactiveThreshold.setDate(inactiveThreshold.getDate() - this.INACTIVITY_THRESHOLD_DAYS);
            const warningThreshold = new Date();
            warningThreshold.setDate(warningThreshold.getDate() - this.WARNING_THRESHOLD_DAYS);
            const inactiveMasters = await this.prisma.master.findMany({
                where: {
                    lastActivityAt: {
                        lt: inactiveThreshold,
                    },
                    isOnline: true,
                    user: {
                        isBanned: false,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            });
            this.logger.log(`Найдено ${inactiveMasters.length} неактивных мастеров`);
            for (const master of inactiveMasters) {
                await this.deactivateInactiveMaster(master);
            }
            const mastersForWarning = await this.prisma.master.findMany({
                where: {
                    lastActivityAt: {
                        lt: warningThreshold,
                        gte: inactiveThreshold,
                    },
                    isOnline: true,
                    user: {
                        isBanned: false,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            });
            this.logger.log(`Найдено ${mastersForWarning.length} мастеров для предупреждения`);
            for (const master of mastersForWarning) {
                await this.sendInactivityWarning(master);
            }
            this.logger.log('Проверка неактивных мастеров завершена');
        }
        catch (error) {
            this.logger.error('Ошибка при проверке неактивных мастеров:', error);
            throw error;
        }
    }
    async deactivateInactiveMaster(master) {
        try {
            const cacheKey = `master:inactive:${master.id}`;
            const alreadyProcessed = await this.redis.get(cacheKey);
            if (alreadyProcessed) {
                return;
            }
            const newRating = Math.max(0, master.rating - this.RATING_PENALTY);
            await this.prisma.master.update({
                where: { id: master.id },
                data: {
                    rating: newRating,
                    isOnline: false,
                },
            });
            await this.sendDeactivationNotification(master);
            await this.redis.set(cacheKey, '1', 60 * 60 * 24 * 7);
            this.logger.log(`Мастер ${master.id} деактивирован: рейтинг снижен с ${master.rating} до ${newRating}`);
            await this.updateRedisCounters(master.id, 'deactivated');
        }
        catch (error) {
            this.logger.error(`Ошибка при деактивации мастера ${master.id}:`, error);
        }
    }
    async sendInactivityWarning(master) {
        try {
            const cacheKey = `master:warning:${master.id}`;
            const alreadyWarned = await this.redis.get(cacheKey);
            if (alreadyWarned) {
                return;
            }
            const daysRemaining = this.INACTIVITY_THRESHOLD_DAYS - this.WARNING_THRESHOLD_DAYS;
            await this.notifications.sendSMS(master.user.phone, `Внимание! Ваш профиль на MasterHub не обновлялся ${this.WARNING_THRESHOLD_DAYS} дней. ` +
                `Через ${daysRemaining} дней ваш рейтинг будет снижен на ${this.RATING_PENALTY}, и профиль скрыт. ` +
                `Зайдите в личный кабинет для сохранения активности.`);
            await this.notifications.saveNotification({
                userId: master.user.id,
                type: 'SMS',
                recipient: master.user.phone,
                status: constants_1.NotificationStatus.SENT,
                title: 'Предупреждение о неактивности профиля',
                message: `Ваш профиль не обновлялся ${this.WARNING_THRESHOLD_DAYS} дней. ` +
                    `Через ${daysRemaining} дней ваш профиль будет скрыт. Войдите в личный кабинет для сохранения активности.`,
                metadata: {
                    type: 'inactivity_warning',
                    thresholdDays: this.WARNING_THRESHOLD_DAYS,
                    daysRemaining,
                },
            });
            await this.redis.set(cacheKey, '1', 60 * 60 * 24 * 7);
            this.logger.log(`Предупреждение отправлено мастеру ${master.id}`);
        }
        catch (error) {
            this.logger.error(`Ошибка при отправке предупреждения мастеру ${master.id}:`, error);
        }
    }
    async sendDeactivationNotification(master) {
        try {
            await this.notifications.sendSMS(master.user.phone, `Ваш профиль на MasterHub был деактивирован из-за отсутствия активности более ${this.INACTIVITY_THRESHOLD_DAYS} дней. ` +
                `Рейтинг снижен на ${this.RATING_PENALTY}. Войдите в личный кабинет для повторной активации.`);
            await this.notifications.saveNotification({
                userId: master.user.id,
                type: 'SMS',
                recipient: master.user.phone,
                status: constants_1.NotificationStatus.SENT,
                title: 'Ваш профиль деактивирован',
                message: `Ваш профиль был автоматически деактивирован из-за отсутствия активности более ${this.INACTIVITY_THRESHOLD_DAYS} дней. ` +
                    `Рейтинг снижен на ${this.RATING_PENALTY}. Войдите в личный кабинет для повторной активации.`,
                metadata: {
                    type: 'profile_deactivated',
                    thresholdDays: this.INACTIVITY_THRESHOLD_DAYS,
                    ratingPenalty: this.RATING_PENALTY,
                    oldRating: master.rating,
                    newRating: Math.max(0, master.rating - this.RATING_PENALTY),
                },
            });
            this.logger.log(`Уведомление о деактивации отправлено мастеру ${master.id}`);
        }
        catch (error) {
            this.logger.error(`Ошибка при отправке уведомления о деактивации мастеру ${master.id}:`, error);
        }
    }
    async updateRedisCounters(masterId, action) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const counterKey = `stats:inactive:${action}:${today}`;
            await this.redis.incr(counterKey);
            await this.redis.expire(counterKey, 60 * 60 * 24 * 90);
        }
        catch (error) {
            this.logger.error('Ошибка при обновлении счетчиков Redis:', error);
        }
    }
    async reactivateMaster(masterId) {
        try {
            const master = await this.prisma.master.findUnique({
                where: { id: masterId },
                select: { isOnline: true },
            });
            if (master && !master.isOnline) {
                await this.prisma.master.update({
                    where: { id: masterId },
                    data: {
                        isOnline: true,
                    },
                });
                await this.redis.del(`master:inactive:${masterId}`);
                await this.redis.del(`master:warning:${masterId}`);
                this.logger.log(`Мастер ${masterId} реактивирован`);
            }
        }
        catch (error) {
            this.logger.error(`Ошибка при реактивации мастера ${masterId}:`, error);
        }
    }
    async getInactivityStats() {
        try {
            const inactiveThreshold = new Date();
            inactiveThreshold.setDate(inactiveThreshold.getDate() - this.INACTIVITY_THRESHOLD_DAYS);
            const [totalInactive, totalDeactivated] = await Promise.all([
                this.prisma.master.count({
                    where: {
                        lastActivityAt: {
                            lt: inactiveThreshold,
                        },
                        user: {
                            isBanned: false,
                        },
                    },
                }),
                this.prisma.master.count({
                    where: {
                        lastActivityAt: {
                            lt: inactiveThreshold,
                        },
                        isOnline: false,
                        user: {
                            isBanned: false,
                        },
                    },
                }),
            ]);
            return {
                totalInactive,
                totalDeactivated,
                thresholdDays: this.INACTIVITY_THRESHOLD_DAYS,
                ratingPenalty: this.RATING_PENALTY,
            };
        }
        catch (error) {
            this.logger.error('Ошибка при получении статистики:', error);
            throw error;
        }
    }
};
exports.TasksActivityService = TasksActivityService;
exports.TasksActivityService = TasksActivityService = TasksActivityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        notifications_service_1.NotificationsService])
], TasksActivityService);
//# sourceMappingURL=tasks-activity.service.js.map