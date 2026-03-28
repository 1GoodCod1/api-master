import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { createBullOptions } from './config/bull.config';

// Общая инфраструктура
import { PrismaModule } from './modules/shared/database/prisma.module';
import { RedisModule } from './modules/shared/redis/redis.module';
import { CacheModule } from './modules/shared/cache/cache.module';
import { EmailModule } from './modules/email/email.module';

// Модули воркера (cron, Bull, прогрев кеша)
import { TasksModule } from './modules/infrastructure/tasks/tasks.module';
import { NotificationsModule } from './modules/notifications/notifications/notifications.module';
import { CacheWarmingModule } from './modules/infrastructure/cache-warming/cache-warming.module';
import { ExportModule } from './modules/export/export.module';

// Зависимости для перечисленных выше модулей
import { MastersModule } from './modules/marketplace/masters/masters.module';
import { CategoriesModule } from './modules/marketplace/categories/categories.module';
import { CitiesModule } from './modules/marketplace/cities/cities.module';
import { TariffsModule } from './modules/marketplace/tariffs/tariffs.module';
import { WebSocketModule } from './modules/infrastructure/websocket/websocket.module';
import { AuthModule } from './modules/auth/auth/auth.module';
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
    // Конфигурация
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Bull queue — тот же Redis, те же очереди
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createBullOptions,
      inject: [ConfigService],
    }),

    // Планировщик cron
    ScheduleModule.forRoot(),

    // Общая инфраструктура
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

    // === Модули воркера ===
    NotificationsModule, // Bull processors: sms, telegram
    TasksModule, // Cron: ежедневные, ежечасные задачи
    CacheWarmingModule, // Прогрев кеша при старте и по расписанию
    ExportModule, // Bull processor: export (csv, excel, pdf)
  ],
})
export class WorkerModule {}
