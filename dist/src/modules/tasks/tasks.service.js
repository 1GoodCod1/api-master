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
var TasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const tasks_tariff_service_1 = require("./services/tasks-tariff.service");
const tasks_analytics_service_1 = require("./services/tasks-analytics.service");
const tasks_maintenance_service_1 = require("./services/tasks-maintenance.service");
const tasks_activity_service_1 = require("./services/tasks-activity.service");
const tasks_booking_reminder_service_1 = require("./services/tasks-booking-reminder.service");
let TasksService = TasksService_1 = class TasksService {
    tariffTasks;
    analyticsTasks;
    maintenanceTasks;
    activityTasks;
    bookingReminderTasks;
    logger = new common_1.Logger(TasksService_1.name);
    constructor(tariffTasks, analyticsTasks, maintenanceTasks, activityTasks, bookingReminderTasks) {
        this.tariffTasks = tariffTasks;
        this.analyticsTasks = analyticsTasks;
        this.maintenanceTasks = maintenanceTasks;
        this.activityTasks = activityTasks;
        this.bookingReminderTasks = bookingReminderTasks;
    }
    async handleDailyTasks() {
        this.logger.log('Запуск ежедневных задач...');
        await Promise.all([
            this.maintenanceTasks.cleanOldLeads(),
            this.tariffTasks.checkExpiredTariffs(),
            this.analyticsTasks.aggregateAnalytics(),
            this.analyticsTasks.sendDailyReports(),
            this.maintenanceTasks.cleanupExpiredTokens(),
            this.activityTasks.checkInactiveMasters(),
        ]);
        this.logger.log('Ежедневные задачи завершены');
    }
    async handleHourlyTasks() {
        this.logger.log('Запуск ежечасных задач...');
        await Promise.all([
            this.maintenanceTasks.syncRedisCounters(),
            this.maintenanceTasks.checkSystemHealth(),
            this.tariffTasks.checkPendingUpgradeTimeouts(),
            this.tariffTasks.sendTariffExpirationReminders(),
            this.bookingReminderTasks.sendBookingReminders(),
        ]);
    }
    async handleHalfHourTasks() {
        await Promise.all([
            this.maintenanceTasks.updateMasterRatings(),
            this.tariffTasks.autoBoostMasters(),
        ]);
    }
};
exports.TasksService = TasksService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "handleDailyTasks", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "handleHourlyTasks", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "handleHalfHourTasks", null);
exports.TasksService = TasksService = TasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tasks_tariff_service_1.TasksTariffService,
        tasks_analytics_service_1.TasksAnalyticsService,
        tasks_maintenance_service_1.TasksMaintenanceService,
        tasks_activity_service_1.TasksActivityService,
        tasks_booking_reminder_service_1.TasksBookingReminderService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map