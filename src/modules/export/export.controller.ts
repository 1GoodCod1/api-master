import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportQueueService } from './export-queue.service';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Export')
@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MASTER', 'ADMIN')
@ApiBearerAuth()
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly exportQueue: ExportQueueService,
  ) {}

  // ============================================================================
  // LEGACY SYNC ENDPOINTS (kept for backward-compat, CSV is fine synchronously)
  // ============================================================================

  @Get('leads/csv/:masterId')
  @ApiOperation({ summary: 'Export leads to CSV (PREMIUM only)' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  @ApiResponse({ status: 403, description: 'PREMIUM tariff required' })
  async exportLeadsCSV(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    await this.exportService.exportLeadsToCSV(masterId, req.user, res);
  }

  // ============================================================================
  // ASYNC QUEUE ENDPOINTS — non-blocking for CPU-heavy Excel/PDF exports
  // ============================================================================

  /**
   * POST /export/queue/:type/:masterId
   *
   * Enqueue an export job. Responds immediately with a jobId.
   * Poll GET /export/status/:jobId to get progress.
   * Download GET /export/download/:jobId when status = 'done'.
   */
  @Post('queue/:type/:masterId')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 export requests per minute per IP
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Enqueue an export job (csv|excel|pdf). Returns jobId immediately.',
  })
  @ApiResponse({
    status: 202,
    description: 'Job queued. Poll /export/status/:jobId',
  })
  @ApiResponse({ status: 403, description: 'PREMIUM tariff required' })
  enqueueExport(
    @Param('type') type: string,
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Query('locale') locale?: string,
  ) {
    if (!['csv', 'excel', 'pdf'].includes(type)) {
      throw new BadRequestException(
        'Invalid export type. Use: csv, excel, pdf',
      );
    }
    const job = this.exportQueue.enqueue(
      type as 'csv' | 'excel' | 'pdf',
      masterId,
      req.user,
      locale,
    );
    return {
      jobId: job.id,
      status: job.status,
      message: 'Export started. Poll /export/status/:jobId for progress.',
    };
  }

  /**
   * GET /export/status/:jobId
   * Returns current job status. Lightweight, safe to poll every 1-2s.
   */
  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, description: 'Job status' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getExportStatus(@Param('jobId') jobId: string) {
    const job = this.exportQueue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found or expired');
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

  /**
   * GET /export/download/:jobId
   * Download the file once status = 'done'.
   * The file is kept in memory for 10 minutes after completion.
   */
  @Get('download/:jobId')
  @ApiOperation({ summary: 'Download completed export file' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 404, description: 'Job not found or not ready' })
  downloadExport(
    @Param('jobId') jobId: string,
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const job = this.exportQueue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found or expired');
    if (job.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new NotFoundException('Job not found'); // Don't leak job existence to other users
    }
    if (job.status !== 'done' || !job.result) {
      throw new BadRequestException(
        `Export not ready yet. Status: ${job.status}`,
      );
    }
    res.setHeader('Content-Type', job.contentType!);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${job.filename}"`,
    );
    res.setHeader('Content-Length', job.result.length);
    res.end(job.result);
  }

  // ============================================================================
  // LEGACY SYNC endpoint for analytics PDF (kept, but warns about blocking)
  // ============================================================================

  @Get('analytics/pdf/:masterId')
  @ApiOperation({
    summary:
      '[Legacy] Export analytics to PDF synchronously (PREMIUM only). Use /queue/pdf/:masterId instead.',
  })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @ApiResponse({ status: 403, description: 'PREMIUM tariff required' })
  async exportAnalyticsPDF(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @Query('locale') locale?: string,
  ) {
    const lang = locale?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
    await this.exportService.exportAnalyticsToPDF(
      masterId,
      req.user,
      res,
      lang,
    );
  }
}
