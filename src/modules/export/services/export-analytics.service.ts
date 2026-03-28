import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { PrismaService } from '../../shared/database/prisma.service';
import { SORT_DESC } from '../../../common/constants';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { ExportAccessService } from './export-access.service';
import { buildAnalyticsPdf } from '../analytics-pdf-builder';
import type { AnalyticsPdfData } from '../types';

export type { AnalyticsPdfData };

@Injectable()
export class ExportAnalyticsService {
  private readonly logger = new Logger(ExportAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: ExportAccessService,
  ) {}

  async exportAnalyticsToPDF(
    masterId: string,
    user: JwtUser,
    res: Response,
    locale: string = 'en',
  ): Promise<void> {
    await this.accessService.validateExportAccess(masterId, user);
    const pdfData = await this.fetchAnalyticsData(masterId);

    const filename = `analytics_${masterId}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    buildAnalyticsPdf(doc, pdfData, locale);
    doc.end();
  }

  async exportAnalyticsToBuffer(
    masterId: string,
    user: JwtUser,
    locale: string = 'en',
  ): Promise<Buffer> {
    await this.accessService.validateExportAccess(masterId, user);
    const pdfData = await this.fetchAnalyticsData(masterId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      buildAnalyticsPdf(doc, pdfData, locale);
      doc.end();
    });
  }

  async exportAnalyticsToFile(
    masterId: string,
    user: JwtUser,
    locale: string = 'en',
  ): Promise<string> {
    const filePath = path.join(
      os.tmpdir(),
      `export-analytics-${randomUUID()}.pdf`,
    );
    const writeStream = fs.createWriteStream(filePath);

    try {
      await this.accessService.validateExportAccess(masterId, user);
      const pdfData = await this.fetchAnalyticsData(masterId);

      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(writeStream);
        doc.on('error', reject);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        buildAnalyticsPdf(doc, pdfData, locale);
        doc.end();
      });

      return filePath;
    } catch (err) {
      writeStream.destroy();
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // игнорировать ошибки очистки
      }
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error('exportAnalyticsToFile failed', err);
      throw err;
    }
  }

  private async fetchAnalyticsData(
    masterId: string,
  ): Promise<AnalyticsPdfData> {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      include: { user: true, category: true, city: true },
    });

    if (!master) {
      throw AppErrors.badRequest(AppErrorMessages.MASTER_NOT_FOUND);
    }

    const [leadsStats, reviewsStats, bookingsStats, analytics] =
      await Promise.all([
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { masterId },
          _count: true,
        }),
        this.prisma.review.groupBy({
          by: ['status'],
          where: { masterId },
          _count: true,
        }),
        this.prisma.booking.groupBy({
          by: ['status'],
          where: { masterId },
          _count: true,
        }),
        this.prisma.masterAnalytics.findMany({
          where: { masterId },
          orderBy: { date: SORT_DESC },
          take: 30,
        }),
      ]);

    return {
      masterName:
        `${master.user.firstName ?? ''} ${master.user.lastName ?? ''}`.trim() ||
        'Master',
      categoryName: master.category?.name ?? '',
      cityName: master.city?.name ?? '',
      rating: master.rating,
      totalReviews: master.totalReviews ?? 0,
      totalLeads: master.leadsCount ?? 0,
      leadsStats,
      reviewsStats,
      bookingsStats,
      analytics: analytics.map((a) => ({
        date: a.date,
        leadsCount: a.leadsCount ?? 0,
        viewsCount: a.viewsCount ?? 0,
      })),
    };
  }
}
