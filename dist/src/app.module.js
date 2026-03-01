"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const bull_1 = require("@nestjs/bull");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
const event_emitter_1 = require("@nestjs/event-emitter");
const terminus_1 = require("@nestjs/terminus");
const serve_static_1 = require("@nestjs/serve-static");
const core_1 = require("@nestjs/core");
const configuration_1 = __importDefault(require("./config/configuration"));
const activity_tracker_middleware_1 = require("./middleware/activity-tracker.middleware");
const prisma_module_1 = require("./modules/shared/database/prisma.module");
const redis_module_1 = require("./modules/shared/redis/redis.module");
const cache_module_1 = require("./modules/shared/cache/cache.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const masters_module_1 = require("./modules/masters/masters.module");
const categories_module_1 = require("./modules/categories/categories.module");
const cities_module_1 = require("./modules/cities/cities.module");
const leads_module_1 = require("./modules/leads/leads.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const payments_module_1 = require("./modules/payments/payments.module");
const admin_module_1 = require("./modules/admin/admin.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const audit_module_1 = require("./modules/audit/audit.module");
const tasks_module_1 = require("./modules/tasks/tasks.module");
const files_module_1 = require("./modules/files/files.module");
const websocket_module_1 = require("./modules/websocket/websocket.module");
const favorites_module_1 = require("./modules/favorites/favorites.module");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const export_module_1 = require("./modules/export/export.module");
const reports_module_1 = require("./modules/reports/reports.module");
const security_module_1 = require("./modules/security/security.module");
const phone_verification_module_1 = require("./modules/phone-verification/phone-verification.module");
const recommendations_module_1 = require("./modules/recommendations/recommendations.module");
const tariffs_module_1 = require("./modules/tariffs/tariffs.module");
const verification_module_1 = require("./modules/verification/verification.module");
const cache_warming_module_1 = require("./modules/cache-warming/cache-warming.module");
const email_module_1 = require("./modules/email/email.module");
const ideas_module_1 = require("./modules/ideas/ideas.module");
const chat_module_1 = require("./modules/chat/chat.module");
const promotions_module_1 = require("./modules/promotions/promotions.module");
const app_module_1 = require("./app/app.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(activity_tracker_middleware_1.ActivityTrackerMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            activity_tracker_middleware_1.ActivityTrackerMiddleware,
        ],
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
                serveStaticOptions: {
                    fallthrough: true,
                },
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            cache_module_1.CacheModule,
            email_module_1.EmailModule,
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    throttlers: [
                        {
                            ttl: configService.get('rateLimit.ttl', 900000),
                            limit: configService.get('rateLimit.limit', 100),
                        },
                    ],
                }),
                inject: [config_1.ConfigService],
            }),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    redis: {
                        host: configService.get('redis.host', 'localhost'),
                        port: configService.get('redis.port', 6379),
                        password: configService.get('redis.password', ''),
                        connectTimeout: 10000,
                        lazyConnect: true,
                        retryStrategy: (times) => {
                            if (times > 10) {
                                return null;
                            }
                            return Math.min(times * 50, 2000);
                        },
                    },
                    defaultJobOptions: {
                        removeOnComplete: true,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            nestjs_prometheus_1.PrometheusModule.register({
                defaultMetrics: {
                    enabled: true,
                },
            }),
            event_emitter_1.EventEmitterModule.forRoot(),
            terminus_1.TerminusModule,
            app_module_1.AppModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            masters_module_1.MastersModule,
            categories_module_1.CategoriesModule,
            cities_module_1.CitiesModule,
            leads_module_1.LeadsModule,
            reviews_module_1.ReviewsModule,
            payments_module_1.PaymentsModule,
            admin_module_1.AdminModule,
            analytics_module_1.AnalyticsModule,
            notifications_module_1.NotificationsModule,
            audit_module_1.AuditModule,
            tasks_module_1.TasksModule,
            files_module_1.FilesModule,
            websocket_module_1.WebSocketModule,
            favorites_module_1.FavoritesModule,
            bookings_module_1.BookingsModule,
            export_module_1.ExportModule,
            reports_module_1.ReportsModule,
            security_module_1.SecurityModule,
            phone_verification_module_1.PhoneVerificationModule,
            recommendations_module_1.RecommendationsModule,
            tariffs_module_1.TariffsModule,
            verification_module_1.VerificationModule,
            cache_warming_module_1.CacheWarmingModule,
            ideas_module_1.IdeasModule,
            chat_module_1.ChatModule,
            promotions_module_1.PromotionsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map