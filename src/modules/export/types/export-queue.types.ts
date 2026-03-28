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
