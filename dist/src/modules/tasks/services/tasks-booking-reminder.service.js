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
var TasksBookingReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksBookingReminderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const in_app_notification_service_1 = require("../../notifications/services/in-app-notification.service");
let TasksBookingReminderService = TasksBookingReminderService_1 = class TasksBookingReminderService {
    prisma;
    inAppNotifications;
    logger = new common_1.Logger(TasksBookingReminderService_1.name);
    constructor(prisma, inAppNotifications) {
        this.prisma = prisma;
        this.inAppNotifications = inAppNotifications;
    }
    async sendBookingReminders() {
        const now = new Date();
        const twentyThreeHours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const twentyFiveHours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        const thirtyMinutes = new Date(now.getTime() + 30 * 60 * 1000);
        const ninetyMinutes = new Date(now.getTime() + 90 * 60 * 1000);
        await Promise.all([
            this.processReminders('24h', twentyThreeHours, twentyFiveHours),
            this.processReminders('1h', thirtyMinutes, ninetyMinutes),
        ]);
    }
    async processReminders(type, from, to) {
        try {
            const bookings = await this.prisma.booking.findMany({
                where: {
                    startTime: { gte: from, lte: to },
                    status: { in: ['CONFIRMED', 'PENDING'] },
                    reminders: {
                        none: { type },
                    },
                },
                include: {
                    master: {
                        include: {
                            user: {
                                select: { id: true, firstName: true, lastName: true },
                            },
                        },
                    },
                },
            });
            if (!bookings.length)
                return;
            this.logger.log(`Processing ${bookings.length} ${type} booking reminders`);
            for (const booking of bookings) {
                try {
                    const masterName = [
                        booking.master.user.firstName,
                        booking.master.user.lastName,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    const formattedTime = booking.startTime.toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                    const timeLabel = type === '24h' ? 'через 24 часа' : 'через 1 час';
                    await this.inAppNotifications.notify({
                        userId: booking.master.user.id,
                        category: 'BOOKING_REMINDER',
                        title: 'Напоминание о записи',
                        message: `Запись с ${booking.clientName || 'клиентом'} ${timeLabel} (${formattedTime})`,
                        metadata: {
                            bookingId: booking.id,
                            masterId: booking.masterId,
                            startTime: booking.startTime.toISOString(),
                            reminderType: type,
                        },
                        priority: type === '1h' ? 'high' : 'normal',
                    });
                    if (booking.clientId) {
                        await this.inAppNotifications.notify({
                            userId: booking.clientId,
                            category: 'BOOKING_REMINDER',
                            title: 'Напоминание о записи',
                            message: `Запись к ${masterName || 'мастеру'} ${timeLabel} (${formattedTime})`,
                            metadata: {
                                bookingId: booking.id,
                                masterId: booking.masterId,
                                masterName,
                                startTime: booking.startTime.toISOString(),
                                reminderType: type,
                            },
                        });
                    }
                    await this.prisma.bookingReminder.create({
                        data: {
                            bookingId: booking.id,
                            type,
                            sentAt: new Date(),
                        },
                    });
                }
                catch (error) {
                    this.logger.error(`Failed to send ${type} reminder for booking ${booking.id}: ${error}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Failed to process ${type} reminders: ${error}`);
        }
    }
};
exports.TasksBookingReminderService = TasksBookingReminderService;
exports.TasksBookingReminderService = TasksBookingReminderService = TasksBookingReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        in_app_notification_service_1.InAppNotificationService])
], TasksBookingReminderService);
//# sourceMappingURL=tasks-booking-reminder.service.js.map