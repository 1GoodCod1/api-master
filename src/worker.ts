import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';
import { WorkerModule } from './worker.module';

/**
 * Worker-процесс — отдельный NestJS-контекст без HTTP-сервера.
 * Запускает только:
 *  - Bull processors (SMS, Telegram очереди)
 *  - Cron-задачи (TasksModule)
 *  - Cache warming (CacheWarmingModule)
 *
 * Преимущества разделения:
 *  - Крэш воркера не убивает HTTP API и WebSocket
 *  - Независимое масштабирование: 1 API-pod + N worker-pods
 *  - Меньше памяти на каждый процесс
 *  - Возможность рестарта воркеров без downtime API
 */
async function bootstrapWorker() {
  const logger = new Logger('Worker');

  try {
    const app = await NestFactory.createApplicationContext(WorkerModule, {
      logger: WinstonModule.createLogger(winstonConfig),
      bufferLogs: true,
    });

    app.enableShutdownHooks();

    const configService = app.get(ConfigService);
    if (configService.get<string>('nodeEnv') === 'production') {
      logger.log('[PRODUCTION] Worker started with NODE_ENV=production');
    }
    logger.log(
      'Worker process started. Listening for Bull jobs and running cron tasks...',
    );

    const shutdown = async (signal: string) => {
      logger.log(`Received ${signal}, shutting down worker gracefully...`);
      await app.close();
      logger.log('Worker shut down cleanly.');
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    console.error('[WORKER ERROR] Failed to start worker:', error);
    process.exit(1);
  }
}

void bootstrapWorker();
