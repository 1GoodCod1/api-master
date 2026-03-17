import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { join } from 'path';
import type { Response } from 'express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import type { RedisOptions } from 'ioredis';
import configuration from './config/configuration';
import { ActivityTrackerMiddleware } from './middleware/activity-tracker.middleware';

// Shared modules
import { PrismaModule } from './modules/shared/database/prisma.module';
import { RedisModule } from './modules/shared/redis/redis.module';
import { CacheModule } from './modules/shared/cache/cache.module';

// Feature modules
import { AuthModule } from './modules/auth/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MastersModule } from './modules/marketplace/masters/masters.module';
import { CategoriesModule } from './modules/marketplace/categories/categories.module';
import { CitiesModule } from './modules/marketplace/cities/cities.module';
import { LeadsModule } from './modules/marketplace/leads/leads.module';
import { ReviewsModule } from './modules/marketplace/reviews/reviews.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin/admin.module';
import { AnalyticsModule } from './modules/admin/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { TasksModule } from './modules/infrastructure/tasks/tasks.module';
import { FilesModule } from './modules/infrastructure/files/files.module';
import { WebSocketModule } from './modules/infrastructure/websocket/websocket.module';
import { FavoritesModule } from './modules/marketplace/favorites/favorites.module';
import { BookingsModule } from './modules/marketplace/bookings/bookings.module';
import { ExportModule } from './modules/admin/export/export.module';
import { ReportsModule } from './modules/admin/reports/reports.module';
import { SecurityModule } from './modules/auth/security/security.module';
import { PhoneVerificationModule } from './modules/auth/phone-verification/phone-verification.module';
import { RecommendationsModule } from './modules/engagement/recommendations/recommendations.module';
import { TariffsModule } from './modules/marketplace/tariffs/tariffs.module';
import { VerificationModule } from './modules/verification/verification.module';
import { CacheWarmingModule } from './modules/infrastructure/cache-warming/cache-warming.module';
import { EmailModule } from './modules/email/email.module';
import { ChatModule } from './modules/marketplace/chat/chat.module';
import { PromotionsModule } from './modules/marketplace/promotions/promotions.module';
import { WebPushModule } from './modules/notifications/web-push/web-push.module';
import { DigestModule } from './modules/notifications/digest/digest.module';
import { ReferralsModule } from './modules/engagement/referrals/referrals.module';
import { AppModule as AppRootModule } from './app/app.module';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    ActivityTrackerMiddleware,
  ],
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

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
        },
      },
    }),

    // Shared modules
    PrismaModule,
    RedisModule,
    CacheModule,
    EmailModule,

    // System modules
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('rateLimit.ttl', 900000),
            limit: configService.get<number>('rateLimit.limit', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const sentinels =
          configService.get<{ host: string; port: number }[]>(
            'redis.sentinels',
          );
        const name = configService.get<string>(
          'redis.sentinelName',
          'mymaster',
        );
        const password = configService.get<string>('redis.password', '');

        const redisOptions: RedisOptions = {
          password,
          connectTimeout: 10000,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            if (times > 10) return null;
            return Math.min(times * 50, 2000);
          },
        };

        if (sentinels && sentinels.length > 0) {
          redisOptions.sentinels = sentinels;
          redisOptions.name = name;
          redisOptions.sentinelPassword = password;
        } else {
          redisOptions.host = configService.get<string>(
            'redis.host',
            'localhost',
          );
          redisOptions.port = configService.get<number>('redis.port', 6379);
        }

        return {
          redis: redisOptions,
          defaultJobOptions: {
            removeOnComplete: true,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),

    // Monitoring
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),

    EventEmitterModule.forRoot(),
    TerminusModule,

    // Feature modules
    AppRootModule,
    AuthModule,
    UsersModule,
    MastersModule,
    CategoriesModule,
    CitiesModule,
    LeadsModule,
    ReviewsModule,
    PaymentsModule,
    AdminModule,
    AnalyticsModule,
    NotificationsModule,
    AuditModule,
    TasksModule,
    FilesModule,
    WebSocketModule,
    FavoritesModule,
    BookingsModule,
    ExportModule,
    ReportsModule,
    SecurityModule,
    PhoneVerificationModule,
    RecommendationsModule,
    TariffsModule,
    VerificationModule,
    CacheWarmingModule,
    ChatModule,
    PromotionsModule,
    WebPushModule,
    DigestModule,
    ReferralsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActivityTrackerMiddleware).forRoutes('*');
  }
}
