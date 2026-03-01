import { Controller, Get, Param, Res, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ExportService } from './export.service';
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
  constructor(private readonly exportService: ExportService) {}

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
  @ApiResponse({ status: 200, description: 'Excel file' })
  @ApiResponse({ status: 403, description: 'PREMIUM tariff required' })
  async exportLeadsExcel(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    await this.exportService.exportLeadsToExcel(masterId, req.user, res);
  }

  @Get('analytics/pdf/:masterId')
  @ApiOperation({ summary: 'Export analytics to PDF (PREMIUM only)' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @ApiResponse({ status: 403, description: 'PREMIUM tariff required' })
  async exportAnalyticsPDF(
    @Param('masterId') masterId: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    await this.exportService.exportAnalyticsToPDF(masterId, req.user, res);
  }
}
