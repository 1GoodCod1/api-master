import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { join } from 'path';
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
import { ActivityTrackerMiddleware } from './middleware/activity-tracker.middleware';

// Shared modules
import { PrismaModule } from './modules/shared/database/prisma.module';
import { RedisModule } from './modules/shared/redis/redis.module';
import { CacheModule } from './modules/shared/cache/cache.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MastersModule } from './modules/masters/masters.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CitiesModule } from './modules/cities/cities.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { FilesModule } from './modules/files/files.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ExportModule } from './modules/export/export.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SecurityModule } from './modules/security/security.module';
import { PhoneVerificationModule } from './modules/phone-verification/phone-verification.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { VerificationModule } from './modules/verification/verification.module';
import { CacheWarmingModule } from './modules/cache-warming/cache-warming.module';
import { EmailModule } from './modules/email/email.module';
import { IdeasModule } from './modules/ideas/ideas.module';
import { ChatModule } from './modules/chat/chat.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
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
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password', ''),
          connectTimeout: 10000,
          lazyConnect: true,
          retryStrategy: (times: number) => {
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
    IdeasModule,
    ChatModule,
    PromotionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActivityTrackerMiddleware).forRoutes('*');
  }
}
