import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportQueueService } from './export-queue.service';
import { ExportController } from './export.controller';

@Module({
  controllers: [ExportController],
  providers: [ExportService, ExportQueueService],
  exports: [ExportService, ExportQueueService],
})
export class ExportModule { }
