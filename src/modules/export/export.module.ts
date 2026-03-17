import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/database/prisma.module';
import { ExportService } from './export.service';
import { ExportQueueService } from './export-queue.service';
import { ExportController } from './export.controller';
import { ExportAccessService } from './services/export-access.service';
import { ExportLeadsService } from './services/export-leads.service';
import { ExportAnalyticsService } from './services/export-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [
    ExportAccessService,
    ExportLeadsService,
    ExportAnalyticsService,
    ExportService,
    ExportQueueService,
  ],
  exports: [ExportService, ExportQueueService],
})
export class ExportModule {}
