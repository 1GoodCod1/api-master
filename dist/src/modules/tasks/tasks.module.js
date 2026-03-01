"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksModule = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const tasks_service_1 = require("./tasks.service");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const notifications_module_1 = require("../notifications/notifications.module");
const tasks_tariff_service_1 = require("./services/tasks-tariff.service");
const tasks_analytics_service_1 = require("./services/tasks-analytics.service");
const tasks_maintenance_service_1 = require("./services/tasks-maintenance.service");
const tasks_activity_service_1 = require("./services/tasks-activity.service");
const tasks_booking_reminder_service_1 = require("./services/tasks-booking-reminder.service");
let TasksModule = class TasksModule {
};
exports.TasksModule = TasksModule;
exports.TasksModule = TasksModule = __decorate([
    (0, common_1.Module)({
        imports: [schedule_1.ScheduleModule, prisma_module_1.PrismaModule, redis_module_1.RedisModule, notifications_module_1.NotificationsModule],
        providers: [
            tasks_service_1.TasksService,
            tasks_tariff_service_1.TasksTariffService,
            tasks_analytics_service_1.TasksAnalyticsService,
            tasks_maintenance_service_1.TasksMaintenanceService,
            tasks_activity_service_1.TasksActivityService,
            tasks_booking_reminder_service_1.TasksBookingReminderService,
        ],
        exports: [tasks_service_1.TasksService, tasks_activity_service_1.TasksActivityService],
    })
], TasksModule);
//# sourceMappingURL=tasks.module.js.map