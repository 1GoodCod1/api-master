import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as fs from 'fs';
import { stat } from 'fs/promises';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import type {
  ExportJobType,
  ExportJobData,
  ExportJobResult,
} from '../shared/types/export.types';

export type { ExportJobType };

export type ExportJobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface ExportJobStatusDto {
  jobId: string;
  status: ExportJobStatus;
  error: string | null;
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  filename: string | null;
}

export interface EnqueueResultDto {
  jobId: string;
  status: ExportJobStatus;
  message: string;
}

const VALID_EXPORT_TYPES: ExportJobType[] = ['csv', 'excel', 'pdf'];

/**
 * Очередь экспорта на Bull + Redis.
 *
 * КАК РАБОТАЕТ:
 * 1. Клиент POST /export/queue → сразу получает jobId (HTTP 202)
 * 2. Задача ставится в Bull-очередь «export» → worker подхватывает
 * 3. Worker генерирует файл → сохраняет на диск (uploads/exports/)
 * 4. Клиент опрашивает GET /export/status/:jobId до status = 'done'
 * 5. Клиент загружает GET /export/download/:jobId — стриминг с диска
 * 6. Завершённые задачи удаляются из Redis через 10 минут
 * 7. Файлы на диске чистятся ExportProcessor каждые 10 минут
 */
@Injectable()
export class ExportQueueService {
  private readonly logger = new Logger(ExportQueueService.name);

  constructor(
    @InjectQueue('export') private readonly exportQueue: Queue<ExportJobData>,
  ) {}

  /**
   * Валидация типа, постановка в очередь, возврат DTO для HTTP-ответа.
   */
  async enqueueExport(
    type: string,
    masterId: string,
    user: JwtUser,
    locale?: string,
  ): Promise<EnqueueResultDto> {
    const validatedType = this.validateExportType(type);
    const jobId = randomUUID();

    const data: ExportJobData = {
      type: validatedType,
      masterId,
      userId: user.id,
      userRole: user.role,
      locale:
        validatedType === 'pdf'
          ? locale?.toLowerCase().startsWith('ru')
            ? 'ru'
            : 'en'
          : undefined,
    };

    await this.exportQueue.add('generate', data, { jobId });

    this.logger.log(
      `Export job enqueued: ${jobId} (${validatedType}, master=${masterId})`,
    );

    return {
      jobId,
      status: 'queued',
      message: 'Export started. Poll /export/status/:jobId for progress.',
    };
  }

  validateExportType(type: string): ExportJobType {
    if (!VALID_EXPORT_TYPES.includes(type as ExportJobType)) {
      throw new BadRequestException(
        `Invalid export type. Use: ${VALID_EXPORT_TYPES.join(', ')}`,
      );
    }
    return type as ExportJobType;
  }

  async getJobStatus(jobId: string): Promise<ExportJobStatusDto> {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found or expired');
    }

    const state = await job.getState();

    return {
      jobId: job.id.toString(),
      status: this.mapBullState(state),
      error: job.failedReason ?? null,
      queuedAt: new Date(job.timestamp),
      startedAt: job.processedOn ? new Date(job.processedOn) : null,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      filename:
        (job.returnvalue as ExportJobResult | undefined)?.filename ?? null,
    };
  }

  async getJobForDownload(
    jobId: string,
    userId: string,
    userRole: string,
  ): Promise<ExportJobResult> {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found or expired');
    }

    if (job.data.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new NotFoundException('Job not found');
    }

    const state = await job.getState();
    if (state !== 'completed' || !job.returnvalue) {
      throw new BadRequestException(
        `Export not ready yet. Status: ${this.mapBullState(state)}`,
      );
    }

    return job.returnvalue as ExportJobResult;
  }

  async streamJobToResponse(
    result: ExportJobResult,
    res: Response,
  ): Promise<void> {
    const stats = await stat(result.filePath);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('Content-Length', stats.size);

    const stream = fs.createReadStream(result.filePath);
    stream.on('error', (err) => {
      this.logger.error('Export file stream error', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read export file' });
      }
      stream.destroy();
    });
    stream.pipe(res);
  }

  private mapBullState(state: string): ExportJobStatus {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'queued';
      case 'active':
        return 'processing';
      case 'completed':
        return 'done';
      case 'failed':
        return 'error';
      default:
        return 'queued';
    }
  }
}
