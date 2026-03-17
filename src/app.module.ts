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
import configuration from './config/configuration';
import { createBullOptions } from './config/bull.config';
import { ActivityTrackerMiddleware } from './middleware/activity-tracker.middleware';

// Shared modules
import { PrismaModule } from './modules/shared/database/prisma.module';
import { RedisModule } from './modules/shared/redis/redis.module';
import { CacheModule } from './modules/shared/cache/cache.module';

// Feature modules
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
import { CacheWarmingModule } from './modules/infrastructure/cache-warming/cache-warming.module';
import { EmailModule } from './modules/email/email.module';
import { ReferralsModule } from './modules/engagement/referrals/referrals.module';

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
      useFactory: createBullOptions,
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
    CacheWarmingModule,
    ReferralsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActivityTrackerMiddleware).forRoutes('*');
  }
}
