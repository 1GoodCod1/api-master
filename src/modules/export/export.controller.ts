import { UserRole } from '@prisma/client';
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
@Roles(UserRole.MASTER, UserRole.ADMIN)
@ApiBearerAuth()
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly exportQueue: ExportQueueService,
  ) {}

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

  @Get('leads/excel/:masterId')
  @ApiOperation({ summary: 'Export leads to Excel (PREMIUM only)' })
  @ApiResponse({ status: 200, description: 'XLSX file' })
  @ApiResponse({ status: 403, description: 'PREMIUM tariff required' })
  async exportLeadsExcel(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    await this.exportService.exportLeadsToExcel(masterId, req.user, res);
  }

  @Post('queue/:type/:masterId')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
  async enqueueExport(
    @Param('type') type: string,
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Query('locale') locale?: string,
  ) {
    return await this.exportQueue.enqueueExport(
      type,
      masterId,
      req.user,
      locale,
    );
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, description: 'Job status' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getExportStatus(@Param('jobId') jobId: string) {
    return await this.exportQueue.getJobStatus(jobId);
  }

  @Get('download/:jobId')
  @ApiOperation({ summary: 'Download completed export file' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 404, description: 'Job not found or not ready' })
  async downloadExport(
    @Param('jobId') jobId: string,
    @Res() res: Response,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.exportQueue.getJobForDownload(
      jobId,
      req.user.id,
      req.user.role ?? '',
    );
    await this.exportQueue.streamJobToResponse(result, res);
  }

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
    await this.exportService.exportAnalyticsToPDF(
      masterId,
      req.user,
      res,
      locale,
    );
  }
}
