import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import type {
  ExportJobData,
  ExportJobResult,
} from '../../shared/types/export.types';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { ExportService } from '../export.service';
import { StorageService } from '../../infrastructure/files/services/storage.service';

const EXPORT_PREFIX = 'exports/';
const FILE_MAX_AGE_MS = 15 * 60 * 1000; // 15 минут
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // каждые 10 минут

@Processor('export')
export class ExportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportProcessor.name);
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly exportService: ExportService,
    private readonly storageService: StorageService,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => {
      void this.cleanupOldFiles();
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  @Process('generate')
  async handleExport(job: Job<ExportJobData>): Promise<ExportJobResult> {
    const { type, masterId, userId, userRole, locale } = job.data;
    this.logger.debug(
      `Обработка export job ${job.id}: ${type} для master ${masterId}`,
    );

    const user: JwtUser = {
      id: userId,
      role: userRole as UserRole,
      phoneVerified: true,
      isVerified: true,
    };

    const date = new Date().toISOString().split('T')[0];
    let buffer: Buffer;
    let contentType: string;
    let filename: string;
    let ext: string;

    if (type === 'csv') {
      buffer = await this.exportService.exportLeadsToBuffer(
        masterId,
        user,
        'csv',
      );
      contentType = 'text/csv; charset=utf-8';
      filename = `leads_${date}.csv`;
      ext = 'csv';
    } else if (type === 'excel') {
      buffer = await this.exportService.exportLeadsToBuffer(
        masterId,
        user,
        'excel',
      );
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `leads_${date}.xlsx`;
      ext = 'xlsx';
    } else {
      const lang = locale?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
      buffer = await this.exportService.exportAnalyticsToBuffer(
        masterId,
        user,
        lang,
      );
      contentType = 'application/pdf';
      filename = `analytics_${date}.pdf`;
      ext = 'pdf';
    }

    const key = `${EXPORT_PREFIX}${String(job.id)}.${ext}`;
    const storagePath = await this.storageService.uploadBuffer(
      key,
      buffer,
      contentType,
    );

    this.logger.log(
      `Export job ${job.id} завершён: ${storagePath} (${buffer.length} bytes)`,
    );

    return { filePath: storagePath, contentType, filename };
  }

  @OnQueueFailed()
  onFailed(job: Job<ExportJobData>, error: Error) {
    this.logger.error(
      `Export job ${job.id} провалился: ${error.message}`,
      error.stack,
    );
  }

  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await this.storageService.listFiles(EXPORT_PREFIX);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        if (now - file.lastModified.getTime() > FILE_MAX_AGE_MS) {
          await this.storageService.deleteByKey(file.key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`Cleanup: removed ${cleaned} stale export file(s)`);
      }
    } catch {
      // хранилище может быть недоступно
    }
  }
}
