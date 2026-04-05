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
import { createBullOptions } from '../../config/bull.config';

@Module({
  imports: [
    PrismaModule,
    FilesModule,
    BullModule.registerQueueAsync({
      name: 'export',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const bullOptions = createBullOptions(configService);
        return {
          redis: bullOptions.redis,
          defaultJobOptions: {
            removeOnComplete: { age: 600 }, // 10 минут — время на скачивание
            removeOnFail: { age: 600 },
            attempts: 2,
            backoff: { type: 'exponential' as const, delay: 2000 },
          },
        };
      },
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
