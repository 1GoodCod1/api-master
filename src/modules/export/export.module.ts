import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../shared/database/prisma.module';
import { FilesModule } from '../infrastructure/files/files.module';
import { ExportService } from './export.service';
import { ExportQueueService } from './export-queue.service';
import { ExportController } from './export.controller';
import { ExportAccessService } from './services/export-access.service';
import { ExportLeadsService } from './services/export-leads.service';
import { ExportAnalyticsService } from './services/export-analytics.service';
import { ExportProcessor } from './processor/export.processor';

@Module({
  imports: [
    PrismaModule,
    FilesModule,
    BullModule.registerQueueAsync({
      name: 'export',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          connectTimeout: 10000,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            if (times > 10) return null;
            return Math.min(times * 50, 2000);
          },
        },
        defaultJobOptions: {
          removeOnComplete: { age: 600 }, // 10 минут — время на скачивание
          removeOnFail: { age: 600 },
          attempts: 2,
          backoff: { type: 'exponential' as const, delay: 2000 },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ExportController],
  providers: [
    ExportAccessService,
    ExportLeadsService,
    ExportAnalyticsService,
    ExportService,
    ExportQueueService,
    ExportProcessor,
  ],
  exports: [ExportService, ExportQueueService],
})
export class ExportModule {}
