import { Module, type ExecutionContext } from '@nestjs/common';
import { join } from 'path';
import type { Response } from 'express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { BullModule } from '@nestjs/bull';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { CustomPrometheusController } from './app/prometheus.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import configuration, { API_GLOBAL_PREFIX, createBullOptions } from './config';
import {
  ActivityTrackerInterceptor,
  AuditInterceptor,
} from './common/interceptors';
import { AppThrottlerGuard, CookieOriginGuard } from './common/guards';
import {
  AUTH_LOGIN_THROTTLE_LIMIT,
  AUTH_LOGIN_THROTTLE_TTL_MS,
  AUTH_THROTTLER_NAME,
  CONTROLLER_PATH,
} from './common/constants';

// Общие модули
import { PrismaModule } from './modules/shared/database/prisma.module';
import { RedisModule } from './modules/shared/redis/redis.module';
import { RedisService } from './modules/shared/redis/redis.service';
import { CacheModule } from './modules/shared/cache/cache.module';
import { NotificationEventsModule } from './modules/notifications/events';

// Функциональные модули
import { AppModule as AppRootModule } from './app/app.module';
import { AuthGroupModule } from './modules/auth/auth-group.module';
import { UsersModule } from './modules/users/users.module';
import { MarketplaceGroupModule } from './modules/marketplace/marketplace-group.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminGroupModule } from './modules/admin/admin-group.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ExportModule } from './modules/export/export.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsGroupModule } from './modules/notifications/notifications-group.module';
import { AuditModule } from './modules/audit/audit.module';
import { TasksModule } from './modules/infrastructure/tasks/tasks.module';
import { FilesModule } from './modules/infrastructure/files/files.module';
import { WebSocketModule } from './modules/infrastructure/websocket/websocket.module';
import { RecommendationsModule } from './modules/engagement/recommendations/recommendations.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ConsentModule } from './modules/consent/consent.module';
import { CacheWarmingModule } from './modules/infrastructure/cache-warming/cache-warming.module';
import { WebVitalsModule } from './modules/infrastructure/web-vitals/web-vitals.module';
import { EmailModule } from './modules/email/email.module';
import { ReferralsModule } from './modules/engagement/referrals/referrals.module';
import { ComplianceModule } from './modules/compliance/compliance.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CookieOriginGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityTrackerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  imports: [
    // Конфигурация
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Локальная отдача файлов только в dev/staging (в проде файлы в B2)
    ...(process.env.NODE_ENV === 'production'
      ? []
      : [
          ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
            serveStaticOptions: {
              fallthrough: true,
              setHeaders: (res: Response) => {
                res.setHeader(
                  'Cache-Control',
                  'public, max-age=86400, stale-while-revalidate=3600',
                );
                res.setHeader('X-Content-Type-Options', 'nosniff');
              },
            },
          }),
        ]),

    // Общие модули
    PrismaModule,
    RedisModule,
    CacheModule,
    EmailModule,
    NotificationEventsModule,

    // Системные модули
    ScheduleModule.forRoot(),

    // Ограничение частоты запросов (Redis в проде — общие лимиты между подами)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      useFactory: (configService: ConfigService, redis: RedisService) => {
        const ttl = configService.get<number>('rateLimit.ttl', 900000);
        const limit = configService.get<number>('rateLimit.limit', 100);
        const useRedis = configService.get<boolean>(
          'rateLimit.useRedisStorage',
          false,
        );
        /** Только этот маршрут должен учитывать бакет `auth` (см. ThrottlerGuard — иначе лимит 5/15мин на весь API). */
        const authLoginPath = `/${API_GLOBAL_PREFIX}/${CONTROLLER_PATH.auth}/login`;
        return {
          throttlers: [
            { name: 'default', ttl, limit },
            {
              name: AUTH_THROTTLER_NAME,
              ttl: AUTH_LOGIN_THROTTLE_TTL_MS,
              limit: AUTH_LOGIN_THROTTLE_LIMIT,
              skipIf: (context: ExecutionContext) => {
                const req = context
                  .switchToHttp()
                  .getRequest<{ path?: string; method?: string }>();
                const path = req.path ?? '';
                return !(req.method === 'POST' && path === authLoginPath);
              },
            },
          ],
          ...(useRedis
            ? { storage: new ThrottlerStorageRedisService(redis.getClient()) }
            : {}),
        };
      },
      inject: [ConfigService, RedisService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createBullOptions,
      inject: [ConfigService],
    }),

    // Мониторинг
    PrometheusModule.register({
      controller: CustomPrometheusController,
      defaultMetrics: {
        enabled: true,
      },
    }),

    EventEmitterModule.forRoot(),

    // Функциональные модули
    AppRootModule,
    AuthGroupModule,
    UsersModule,
    MarketplaceGroupModule,
    PaymentsModule,
    AdminGroupModule,
    AnalyticsModule,
    ExportModule,
    ReportsModule,
    NotificationsGroupModule,
    AuditModule,
    TasksModule,
    FilesModule,
    WebSocketModule,
    RecommendationsModule,
    VerificationModule,
    ConsentModule,
    CacheWarmingModule,
    WebVitalsModule,
    ReferralsModule,
    ComplianceModule,
  ],
})
export class AppModule {}
