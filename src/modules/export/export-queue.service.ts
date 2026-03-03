import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { ExportService } from './export.service';

export type ExportJobType = 'csv' | 'excel' | 'pdf';

export interface ExportJob {
  id: string;
  type: ExportJobType;
  masterId: string;
  userId: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  error?: string;
  /** Serialized file content as a Buffer, available when status = 'done' */
  result?: Buffer;
  contentType?: string;
  filename?: string;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Lightweight in-process export queue.
 *
 * WHY: Excel/PDF generation is CPU-bound (can take 500ms–5s and use 200–400MB peak).
 * Doing this synchronously in a request handler blocks the Node.js event loop for
 * all other requests during that time.
 *
 * HOW THIS WORKS:
 * 1. Client POSTs /export/queue → receives a jobId immediately (HTTP 202)
 * 2. Export runs off the request path (microtask queue, still same process)
 * 3. Client polls GET /export/status/:jobId until status = 'done'
 * 4. Client fetches GET /export/download/:jobId to receive the file
 * 5. Job is cleaned up from memory 10 minutes after completion
 *
 * PRODUCTION UPGRADE PATH:
 * Replace this with @nestjs/bull + Bull queue backed by Redis for:
 * - Cross-process job distribution (multiple API pods)
 * - Persistence across restarts
 * - Retry logic
 * - Job history & monitoring (Bull Board UI)
 */
@Injectable()
export class ExportQueueService {
  private readonly logger = new Logger(ExportQueueService.name);
  private readonly jobs = new Map<string, ExportJob>();
  /** Max concurrent export jobs (prevents memory spikes) */
  private readonly MAX_CONCURRENT = 3;
  private running = 0;
  /** Queue of pending jobs waiting for a slot */
  private pending: Array<() => void> = [];

  constructor(private readonly exportService: ExportService) {}

  /**
   * Enqueue an export job and return its ID immediately.
   * The actual work runs off the request path.
   */
  enqueue(type: ExportJobType, masterId: string, user: JwtUser): ExportJob {
    const job: ExportJob = {
      id: randomUUID(),
      type,
      masterId,
      userId: user.id,
      status: 'queued',
      queuedAt: new Date(),
    };

    this.jobs.set(job.id, job);

    // Kick off asynchronously — do NOT await
    void this.runJob(job, user);

    // Auto-clean after 10 minutes to prevent memory leak
    setTimeout(() => this.jobs.delete(job.id), 10 * 60 * 1000);

    this.logger.log(
      `Export job enqueued: ${job.id} (${type}, master=${masterId})`,
    );
    return job;
  }

  getJob(id: string): ExportJob | null {
    return this.jobs.get(id) ?? null;
  }

  private async runJob(job: ExportJob, user: JwtUser): Promise<void> {
    // Throttle: wait if MAX_CONCURRENT is reached
    if (this.running >= this.MAX_CONCURRENT) {
      await new Promise<void>((resolve) => this.pending.push(resolve));
    }

    this.running++;
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const buffer = await this.generate(job, user);
      job.result = buffer.data;
      job.contentType = buffer.contentType;
      job.filename = buffer.filename;
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
      // Unblock next pending job
      const next = this.pending.shift();
      if (next) next();
    }
  }

  private async generate(
    job: ExportJob,
    user: JwtUser,
  ): Promise<{ data: Buffer; contentType: string; filename: string }> {
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
      const data = await this.exportService.exportAnalyticsToBuffer(
        job.masterId,
        user,
      );
      return {
        data,
        contentType: 'application/pdf',
        filename: `analytics_${date}.pdf`,
      };
    }

    throw new Error(`Unknown export type: ${job.type as string}`);
  }
}
