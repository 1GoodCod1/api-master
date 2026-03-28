import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import configuration, { createBullOptions } from '../../config';

/**
 * BullBoardAppModule — отдельный процесс для UI мониторинга Bull-очередей.
 *
 * Подключается к тому же Redis и отображает все зарегистрированные очереди:
 *  - sms (отправка SMS через Twilio)
 *  - telegram (отправка сообщений в Telegram)
 *  - export (генерация CSV/Excel/PDF)
 *
 * Запускается как отдельный Docker-сервис на порту 3500.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createBullOptions,
      inject: [ConfigService],
    }),

    // UI-адаптер
    BullBoardModule.forRoot({
      route: '/',
      adapter: ExpressAdapter,
    }),

    // Регистрация очередей
    BullModule.registerQueue(
      { name: 'sms' },
      { name: 'telegram' },
      { name: 'export' },
    ),

    BullBoardModule.forFeature(
      { name: 'sms', adapter: BullAdapter },
      { name: 'telegram', adapter: BullAdapter },
      { name: 'export', adapter: BullAdapter },
    ),
  ],
})
export class BullBoardAppModule {}
