import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';
import configuration from './config/configuration';

// Shared infrastructure
import { PrismaModule } from './modules/shared/database/prisma.module';
import { RedisModule } from './modules/shared/redis/redis.module';
import { CacheModule } from './modules/shared/cache/cache.module';
import { EmailModule } from './modules/email/email.module';

// Worker modules (cron, Bull processors, cache warming)
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CacheWarmingModule } from './modules/cache-warming/cache-warming.module';

// Modules required by the above as dependencies
import { MastersModule } from './modules/masters/masters.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CitiesModule } from './modules/cities/cities.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

/**
 * WorkerModule — минимальный набор модулей для фонового процесса.
 *
 * НЕ включает:
 *  - HTTP-контроллеры (LeadsModule, ReviewsModule, PaymentsModule и т.д.)
 *  - Swagger / ServeStatic
 *  - Prometheus / TerminusModule
 *
 * Включает только то, что нужно для:
 *  1. Bull processors (SMS, Telegram) — через NotificationsModule
 *  2. Cron-задачи — через TasksModule
 *  3. Прогрев кеша — через CacheWarmingModule
 */
@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Bull queue — тот же Redis, те же очереди
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
            backoff: { type: 'exponential', delay: 1000 },
          },
        };
      },
      inject: [ConfigService],
    }),

    // Планировщик cron
    ScheduleModule.forRoot(),

    // Shared infrastructure
    PrismaModule,
    RedisModule,
    CacheModule,
    EmailModule,

    // Dependencies (требуются модулям ниже)
    AuthModule,
    UsersModule,
    CategoriesModule,
    CitiesModule,
    TariffsModule,
    MastersModule,
    WebSocketModule,

    // === Worker modules ===
    NotificationsModule, // Bull processors: sms, telegram
    TasksModule, // Cron: ежедневные, ежечасные задачи
    CacheWarmingModule, // Прогрев кеша при старте и по расписанию
  ],
})
export class WorkerModule {}
