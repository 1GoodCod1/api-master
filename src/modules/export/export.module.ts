import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/database/prisma.module';
import { ExportService } from './export.service';
import { ExportQueueService } from './export-queue.service';
import { ExportController } from './export.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [ExportService, ExportQueueService],
  exports: [ExportService, ExportQueueService],
})
export class ExportModule {}
