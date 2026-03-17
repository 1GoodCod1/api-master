import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { ExportAccessService } from './services/export-access.service';
import { ExportLeadsService } from './services/export-leads.service';
import { ExportAnalyticsService } from './services/export-analytics.service';

/**
 * Фасад для операций экспорта. Делегирует вызовы специализированным сервисам.
 * Сохраняет публичный API для ExportController и ExportQueueService.
 */
@Injectable()
export class ExportService {
  constructor(
    private readonly accessService: ExportAccessService,
    private readonly leadsService: ExportLeadsService,
    private readonly analyticsService: ExportAnalyticsService,
  ) {}

  async validateExportAccess(masterId: string, user: JwtUser): Promise<void> {
    return this.accessService.validateExportAccess(masterId, user);
  }

  async exportLeadsToCSV(
    masterId: string,
    user: JwtUser,
    res: Response,
  ): Promise<void> {
    return this.leadsService.exportLeadsToCSV(masterId, user, res);
  }

  async exportLeadsToExcel(
    masterId: string,
    user: JwtUser,
    res: Response,
  ): Promise<void> {
    return this.leadsService.exportLeadsToExcel(masterId, user, res);
  }

  async exportLeadsToBuffer(
    masterId: string,
    user: JwtUser,
    format: 'csv' | 'excel',
  ): Promise<Buffer> {
    return this.leadsService.exportLeadsToBuffer(masterId, user, format);
  }

  async exportAnalyticsToPDF(
    masterId: string,
    user: JwtUser,
    res: Response,
    locale?: string,
  ): Promise<void> {
    const lang = locale?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
    return this.analyticsService.exportAnalyticsToPDF(
      masterId,
      user,
      res,
      lang,
    );
  }

  async exportAnalyticsToBuffer(
    masterId: string,
    user: JwtUser,
    locale: string = 'en',
  ): Promise<Buffer> {
    return this.analyticsService.exportAnalyticsToBuffer(
      masterId,
      user,
      locale,
    );
  }

  async exportAnalyticsToFile(
    masterId: string,
    user: JwtUser,
    locale: string = 'en',
  ): Promise<string> {
    return this.analyticsService.exportAnalyticsToFile(masterId, user, locale);
  }
}
