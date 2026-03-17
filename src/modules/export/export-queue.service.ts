import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { stat } from 'fs/promises';
import type { Response } from 'express';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ExportService } from './export.service';

export type ExportJobType = 'csv' | 'excel' | 'pdf';

export interface ExportJob {
  id: string;
  type: ExportJobType;
  masterId: string;
  userId: string;
  /** Локаль PDF-отчёта (en|ru), используется при type = 'pdf' */
  locale?: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  error?: string;
  /** Сериализованное содержимое файла в Buffer, доступно при status = 'done' (CSV/Excel) */
  result?: Buffer;
  /** Путь к временному файлу PDF — стриминг для экономии памяти */
  resultPath?: string;
  contentType?: string;
  filename?: string;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Лёгкая in-process очередь экспорта.
 *
 * ЗАЧЕМ: Генерация Excel/PDF — CPU-bound (500ms–5s, пик 200–400MB).
 * Синхронное выполнение в обработчике блокирует event loop Node.js для всех запросов.
 *
 * КАК РАБОТАЕТ:
 * 1. Клиент POST /export/queue → сразу получает jobId (HTTP 202)
 * 2. Экспорт выполняется вне запроса (microtask queue, тот же процесс)
 * 3. Клиент опрашивает GET /export/status/:jobId до status = 'done'
 * 4. Клиент загружает GET /export/download/:jobId для получения файла
 * 5. Задача удаляется из памяти через 10 минут после завершения
 *
 * ПРОДАКШН: заменить на @nestjs/bull + Bull с Redis для:
 * - Распределения задач между процессами (несколько API pods)
 * - Сохранения при перезапуске
 * - Повторов при ошибках
 * - Истории и мониторинга (Bull Board UI)
 */
const SHUTDOWN_WAIT_MS = 30_000;
const VALID_EXPORT_TYPES: ExportJobType[] = ['csv', 'excel', 'pdf'];

export interface ExportJobStatusDto {
  jobId: string;
  status: ExportJob['status'];
  error: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  filename: string | null;
}

export interface EnqueueResultDto {
  jobId: string;
  status: ExportJob['status'];
  message: string;
}

@Injectable()
export class ExportQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ExportQueueService.name);
  private readonly jobs = new Map<string, ExportJob>();
  private readonly cleanupTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly runningJobPromises = new Set<Promise<void>>();
  private readonly MAX_CONCURRENT = 3;
  private running = 0;
  private pending: Array<() => void> = [];

  constructor(private readonly exportService: ExportService) {}

  async onModuleDestroy() {
    for (const id of this.cleanupTimeouts.keys()) {
      const t = this.cleanupTimeouts.get(id);
      if (t) clearTimeout(t);
    }
    this.cleanupTimeouts.clear();
    // Не резолвить pending — иначе запустятся новые задачи при завершении
    this.pending = [];

    if (this.runningJobPromises.size > 0) {
      this.logger.log(
        `Waiting up to ${SHUTDOWN_WAIT_MS / 1000}s for ${this.runningJobPromises.size} export job(s) to complete`,
      );
      await Promise.race([
        Promise.all([...this.runningJobPromises]),
        new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_WAIT_MS)),
      ]);
    }
    for (const job of this.jobs.values()) {
      this.cleanupJob(job);
    }
    this.jobs.clear();
  }

  private cleanupJob(job: ExportJob): void {
    if (job.resultPath) {
      fs.unlink(job.resultPath, () => {
        // игнорировать ошибки (файл может быть уже удалён)
      });
    }
  }

  /**
   * Валидация типа, постановка в очередь, возврат DTO для HTTP-ответа.
   */
  enqueueExport(
    type: string,
    masterId: string,
    user: JwtUser,
    locale?: string,
  ): EnqueueResultDto {
    const validatedType = this.validateExportType(type);
    const job = this.enqueue(validatedType, masterId, user, locale);
    return {
      jobId: job.id,
      status: job.status,
      message: 'Export started. Poll /export/status/:jobId for progress.',
    };
  }

  /**
   * Поставить задачу экспорта в очередь и вернуть её ID.
   * Фактическая работа выполняется вне запроса.
   * @param locale — язык PDF-отчёта (en|ru), используется при type = 'pdf'
   */
  enqueue(
    type: ExportJobType,
    masterId: string,
    user: JwtUser,
    locale?: string,
  ): ExportJob {
    const job: ExportJob = {
      id: randomUUID(),
      type,
      masterId,
      userId: user.id,
      locale:
        type === 'pdf'
          ? locale?.toLowerCase().startsWith('ru')
            ? 'ru'
            : 'en'
          : undefined,
      status: 'queued',
      queuedAt: new Date(),
    };

    this.jobs.set(job.id, job);

    const promise = this.runJob(job, user);
    this.runningJobPromises.add(promise);
    promise
      .catch((err) =>
        this.logger.error(`Export job ${job.id} unhandled error`, err),
      )
      .finally(() => this.runningJobPromises.delete(promise));

    // Автоочистка через 10 минут для предотвращения утечки памяти
    const timeoutId = setTimeout(
      () => {
        this.cleanupJob(job);
        this.jobs.delete(job.id);
        this.cleanupTimeouts.delete(job.id);
      },
      10 * 60 * 1000,
    );
    this.cleanupTimeouts.set(job.id, timeoutId);

    this.logger.log(
      `Export job enqueued: ${job.id} (${type}, master=${masterId})`,
    );
    return job;
  }

  getJob(id: string): ExportJob | null {
    return this.jobs.get(id) ?? null;
  }

  validateExportType(type: string): ExportJobType {
    if (!VALID_EXPORT_TYPES.includes(type as ExportJobType)) {
      throw new BadRequestException(
        `Invalid export type. Use: ${VALID_EXPORT_TYPES.join(', ')}`,
      );
    }
    return type as ExportJobType;
  }

  getJobStatus(jobId: string): ExportJobStatusDto {
    const job = this.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found or expired');
    }
    return {
      jobId: job.id,
      status: job.status,
      error: job.error ?? null,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt ?? null,
      completedAt: job.completedAt ?? null,
      filename: job.filename ?? null,
    };
  }

  getJobForDownload(
    jobId: string,
    userId: string,
    userRole: string,
  ): ExportJob {
    const job = this.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found or expired');
    }
    if (job.userId !== userId && userRole !== 'ADMIN') {
      throw new NotFoundException('Job not found');
    }
    if (job.status !== 'done' || (!job.result && !job.resultPath)) {
      throw new BadRequestException(
        `Export not ready yet. Status: ${job.status}`,
      );
    }
    return job;
  }

  async streamJobToResponse(job: ExportJob, res: Response): Promise<void> {
    res.setHeader('Content-Type', job.contentType!);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${job.filename}"`,
    );
    if (job.resultPath) {
      const stats = await stat(job.resultPath);
      res.setHeader('Content-Length', stats.size);
      const stream = fs.createReadStream(job.resultPath);
      stream.on('error', (err) => {
        this.logger.error('Export file stream error', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to read export file' });
        }
        stream.destroy();
      });
      stream.pipe(res);
    } else {
      res.setHeader('Content-Length', job.result!.length);
      res.end(job.result);
    }
  }

  private async runJob(job: ExportJob, user: JwtUser): Promise<void> {
    // Ограничение: ждать, если достигнут MAX_CONCURRENT
    if (this.running >= this.MAX_CONCURRENT) {
      await new Promise<void>((resolve) => this.pending.push(resolve));
    }

    this.running++;
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const output = await this.generate(job, user);
      job.result = output.data;
      job.resultPath = output.filePath;
      job.contentType = output.contentType;
      job.filename = output.filename;
      job.status = 'done';
      job.completedAt = new Date();
      const ms = job.completedAt.getTime() - (job.startedAt?.getTime() ?? 0);
      this.logger.log(`Export job done: ${job.id} in ${ms}ms`);
    } catch (err) {
      job.status = 'error';
      job.error = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date();
      this.logger.error(`Export job failed: ${job.id}`, err);
    } finally {
      this.running--;
      // Разблокировать следующую ожидающую задачу
      const next = this.pending.shift();
      if (next) next();
    }
  }

  private async generate(
    job: ExportJob,
    user: JwtUser,
  ): Promise<{
    data?: Buffer;
    filePath?: string;
    contentType: string;
    filename: string;
  }> {
    const date = new Date().toISOString().split('T')[0];

    if (job.type === 'csv') {
      const data = await this.exportService.exportLeadsToBuffer(
        job.masterId,
        user,
        'csv',
      );
      return {
        data,
        contentType: 'text/csv; charset=utf-8',
        filename: `leads_${date}.csv`,
      };
    }

    if (job.type === 'excel') {
      const data = await this.exportService.exportLeadsToBuffer(
        job.masterId,
        user,
        'excel',
      );
      return {
        data,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `leads_${date}.xlsx`,
      };
    }

    if (job.type === 'pdf') {
      const filePath = await this.exportService.exportAnalyticsToFile(
        job.masterId,
        user,
        job.locale ?? 'en',
      );
      return {
        filePath,
        contentType: 'application/pdf',
        filename: `analytics_${date}.pdf`,
      };
    }

    throw new Error(`Unknown export type: ${job.type as string}`);
  }
}
