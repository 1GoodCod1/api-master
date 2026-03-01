"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const config_1 = require("@nestjs/config");
const notifications_service_1 = require("./notifications.service");
const sms_processor_1 = require("./proccessor/sms.processor");
const telegram_processor_1 = require("./proccessor/telegram.processor");
const notifications_controller_1 = require("./notifications.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const redis_module_1 = require("../shared/redis/redis.module");
const notifications_query_service_1 = require("./services/notifications-query.service");
const notifications_action_service_1 = require("./services/notifications-action.service");
const notifications_sender_service_1 = require("./services/notifications-sender.service");
const in_app_notification_service_1 = require("./services/in-app-notification.service");
const websocket_module_1 = require("../websocket/websocket.module");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.registerQueueAsync({
                name: 'sms',
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    redis: {
                        host: configService.get('redis.host'),
                        port: configService.get('redis.port'),
                        password: configService.get('redis.password'),
                        connectTimeout: 10000,
                        lazyConnect: true,
                        retryStrategy: (times) => {
                            if (times > 10)
                                return null;
                            return Math.min(times * 50, 2000);
                        },
                    },
                }),
                inject: [config_1.ConfigService],
            }, {
                name: 'telegram',
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    redis: {
                        host: configService.get('redis.host'),
                        port: configService.get('redis.port'),
                        password: configService.get('redis.password'),
                        connectTimeout: 10000,
                        lazyConnect: true,
                        retryStrategy: (times) => {
                            if (times > 10)
                                return null;
                            return Math.min(times * 50, 2000);
                        },
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            (0, common_1.forwardRef)(() => websocket_module_1.WebSocketModule),
        ],
        controllers: [notifications_controller_1.NotificationsController],
        providers: [
            notifications_service_1.NotificationsService,
            notifications_query_service_1.NotificationsQueryService,
            notifications_action_service_1.NotificationsActionService,
            notifications_sender_service_1.NotificationsSenderService,
            in_app_notification_service_1.InAppNotificationService,
            sms_processor_1.SmsProcessor,
            telegram_processor_1.TelegramProcessor,
        ],
        exports: [notifications_service_1.NotificationsService, in_app_notification_service_1.InAppNotificationService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map