import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { getEffectiveTariff } from '../../common/helpers/plans';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { buildAnalyticsPdf } from './analytics-pdf-builder';

/** RFC 4180 compliant CSV escape */
function csvEscape(val: string): string {
  const str = String(val ?? '')
    .replace(/\r?\n/g, ' ')
    .trim();
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str || '""';
}

const LEADS_EXPORT_COLUMNS = [
  '№',
  'Lead ID',
  'Created At',
  'Updated At',
  'Status',
  'Client Name',
  'Client Phone',
  'Client Email',
  'Message',
  'Is Premium',
  'Spam Score',
  'Attachments Count',
  'Master Category',
  'Master City',
] as const;

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверка прав доступа и наличия тарифа PREMIUM
   */
  async validateExportAccess(masterId: string, user: JwtUser): Promise<void> {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        include: { user: true },
      });

      if (!master) {
        throw new BadRequestException('Master not found');
      }

      // Проверка прав (только админ или владелец)
      if (user.role !== 'ADMIN' && master.userId !== user.id) {
        throw new ForbiddenException('You can only export your own data');
      }

      const effectiveTariff = getEffectiveTariff(master);
      if (effectiveTariff !== 'PREMIUM') {
        throw new ForbiddenException(
          'Export is only available for PREMIUM tariff',
        );
      }
    } catch (err) {
      if (
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('validateExportAccess failed', err);
      throw err;
    }
  }

  /**
   * Профессиональный экспорт лидов в CSV (RFC 4180, UTF-8 BOM)
   */
  async exportLeadsToCSV(
    masterId: string,
    user: JwtUser,
    res: Response,
  ): Promise<void> {
    try {
      await this.validateExportAccess(masterId, user);

      const [leads, master] = await Promise.all([
        this.prisma.lead.findMany({
          where: { masterId },
          orderBy: { createdAt: 'desc' },
          include: {
            files: true,
            client: { select: { email: true } },
          },
        }),
        this.prisma.master.findUnique({
          where: { id: masterId },
          include: {
            category: { select: { name: true } },
            city: { select: { name: true } },
          },
        }),
      ]);

      const categoryName = master?.category?.name ?? '';
      const cityName = master?.city?.name ?? '';

      const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      res.write('\uFEFF'); // BOM for UTF-8
      res.write(LEADS_EXPORT_COLUMNS.map(csvEscape).join(',') + '\r\n');

      leads.forEach((lead, idx) => {
        const row = [
          (idx + 1).toString(),
          lead.id,
          lead.createdAt.toISOString(),
          lead.updatedAt.toISOString(),
          lead.status,
          lead.clientName ?? '',
          lead.clientPhone,
          (lead.client && 'email' in lead.client
            ? (lead.client as { email: string }).email
            : '') || '',
          lead.message,
          lead.isPremium ? 'Yes' : 'No',
          lead.spamScore.toString(),
          lead.files.length.toString(),
          categoryName,
          cityName,
        ];
        res.write(row.map(csvEscape).join(',') + '\r\n');
      });

      res.end();
    } catch (err) {
      if (
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error('exportLeadsToCSV failed', err);
      throw err;
    }
  }

  /**
   * Профессиональный экспорт лидов в Excel (шаблон: Info + Leads)
   */
  async exportLeadsToExcel(
    masterId: string,
    user: JwtUser,
    res: Response,
  ): Promise<void> {
    try {
      await this.validateExportAccess(masterId, user);

      const [leads, master] = await Promise.all([
        this.prisma.lead.findMany({
          where: { masterId },
          orderBy: { createdAt: 'desc' },
          include: {
            files: true,
            client: { select: { email: true } },
          },
        }),
        this.prisma.master.findUnique({
          where: { id: masterId },
          include: {
            user: true,
            category: { select: { name: true } },
            city: { select: { name: true } },
          },
        }),
      ]);

      if (!master) {
        throw new BadRequestException('Master not found');
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Master-Hub';
      workbook.created = new Date();

      // ----- Sheet 1: Report Info -----
      const infoSheet = workbook.addWorksheet('Report Info', {
        properties: { tabColor: { argb: 'FFB45309' } },
      });
      const masterName =
        `${master.user.firstName ?? ''} ${master.user.lastName ?? ''}`.trim() ||
        'Master';
      const exportDate = new Date().toISOString();
      infoSheet.columns = [
        { key: 'label', width: 22 },
        { key: 'value', width: 50 },
      ];
      infoSheet.addRow({ label: 'Report Type', value: 'Leads Export' });
      infoSheet.addRow({ label: 'Master', value: masterName });
      infoSheet.addRow({
        label: 'Category',
        value: master.category?.name ?? '-',
      });
      infoSheet.addRow({ label: 'City', value: master.city?.name ?? '-' });
      infoSheet.addRow({ label: 'Export Date', value: exportDate });
      infoSheet.addRow({ label: 'Total Leads', value: leads.length });
      infoSheet.addRow({ label: '', value: '' });
      infoSheet.addRow({ label: 'Column Legend', value: '' });
      LEADS_EXPORT_COLUMNS.forEach((col, i) => {
        infoSheet.addRow({ label: `  ${i + 1}. ${col}`, value: '' });
      });
      infoSheet.getRow(1).font = { bold: true, size: 12 };
      infoSheet.getColumn(1).eachCell({ includeEmpty: true }, (cell, row) => {
        if (row <= 6) cell.font = { bold: true };
      });

      // ----- Sheet 2: Leads Data -----
      const leadsSheet = workbook.addWorksheet('Leads', {
        properties: { tabColor: { argb: 'FF217346' } },
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      const HEADER_ROW = 1;
      const colDefs: { header: string; key: string; width: number }[] = [
        { header: '№', key: 'rowNum', width: 6 },
        { header: 'Lead ID', key: 'id', width: 38 },
        { header: 'Created At', key: 'createdAt', width: 22 },
        { header: 'Updated At', key: 'updatedAt', width: 22 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Client Name', key: 'clientName', width: 20 },
        { header: 'Client Phone', key: 'clientPhone', width: 16 },
        { header: 'Client Email', key: 'clientEmail', width: 26 },
        { header: 'Message', key: 'message', width: 45 },
        { header: 'Is Premium', key: 'isPremium', width: 12 },
        { header: 'Spam Score', key: 'spamScore', width: 12 },
        { header: 'Attachments Count', key: 'filesCount', width: 18 },
        { header: 'Master Category', key: 'categoryName', width: 20 },
        { header: 'Master City', key: 'cityName', width: 18 },
      ];
      leadsSheet.columns = colDefs;

      leadsSheet.getRow(HEADER_ROW).font = { bold: true };
      leadsSheet.getRow(HEADER_ROW).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E8E8' },
      };
      leadsSheet.getRow(HEADER_ROW).alignment = {
        wrapText: true,
        vertical: 'middle',
      };
      leadsSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: colDefs.length },
      };

      const categoryName = master.category?.name ?? '';
      const cityName = master.city?.name ?? '';

      leads.forEach((lead, idx) => {
        const clientEmail =
          lead.client && 'email' in lead.client
            ? (lead.client as { email: string }).email
            : '';
        leadsSheet.addRow({
          rowNum: idx + 1,
          id: lead.id,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
          status: lead.status,
          clientName: lead.clientName ?? '',
          clientPhone: lead.clientPhone,
          clientEmail,
          message: lead.message,
          isPremium: lead.isPremium ? 'Yes' : 'No',
          spamScore: lead.spamScore,
          filesCount: lead.files.length,
          categoryName,
          cityName,
        });
      });

      // Date format for Created At, Updated At
      leadsSheet.getColumn(3).numFmt = 'yyyy-mm-dd hh:mm:ss';
      leadsSheet.getColumn(4).numFmt = 'yyyy-mm-dd hh:mm:ss';

      const filename = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error('exportLeadsToExcel failed', err);
      throw err;
    }
  }

  /**
   * Экспорт аналитики в PDF
   * @param locale — язык отчёта (en|ru), по умолчанию en
   */
  async exportAnalyticsToPDF(
    masterId: string,
    user: JwtUser,
    res: Response,
    locale: string = 'en',
  ): Promise<void> {
    try {
      await this.validateExportAccess(masterId, user);

      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        include: {
          user: true,
          category: true,
          city: true,
        },
      });

      if (!master) {
        throw new BadRequestException('Master not found');
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
            orderBy: { date: 'desc' },
            take: 30,
          }),
        ]);

      const filename = `analytics_${masterId}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      const pdfData = {
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

      buildAnalyticsPdf(doc, pdfData, locale);
      doc.end();
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error('exportAnalyticsToPDF failed', err);
      throw err;
    }
  }

  // ============================================================================
  // BUFFER METHODS — used by ExportQueueService for off-request async processing
  // ============================================================================

  /**
   * Generate leads export as an in-memory Buffer (CSV or Excel).
   * Does NOT write to HTTP response — safe to call from a background job.
   */
  async exportLeadsToBuffer(
    masterId: string,
    user: JwtUser,
    format: 'csv' | 'excel',
  ): Promise<Buffer> {
    try {
      await this.validateExportAccess(masterId, user);

      const [leads, master] = await Promise.all([
        this.prisma.lead.findMany({
          where: { masterId },
          orderBy: { createdAt: 'desc' },
          include: { files: true, client: { select: { email: true } } },
        }),
        this.prisma.master.findUnique({
          where: { id: masterId },
          include: {
            user: true,
            category: { select: { name: true } },
            city: { select: { name: true } },
          },
        }),
      ]);

      if (!master) throw new BadRequestException('Master not found');
      const categoryName = master.category?.name ?? '';
      const cityName = master.city?.name ?? '';

      if (format === 'csv') {
        const rows: string[] = [];
        rows.push('\uFEFF' + LEADS_EXPORT_COLUMNS.map(csvEscape).join(','));
        leads.forEach((lead, idx) => {
          const clientEmail =
            lead.client && 'email' in lead.client
              ? (lead.client as { email: string }).email
              : '';
          rows.push(
            [
              (idx + 1).toString(),
              lead.id,
              lead.createdAt.toISOString(),
              lead.updatedAt.toISOString(),
              lead.status,
              lead.clientName ?? '',
              lead.clientPhone,
              clientEmail,
              lead.message,
              lead.isPremium ? 'Yes' : 'No',
              lead.spamScore.toString(),
              lead.files.length.toString(),
              categoryName,
              cityName,
            ]
              .map(csvEscape)
              .join(','),
          );
        });
        return Buffer.from(rows.join('\r\n'), 'utf-8');
      }

      // Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Master-Hub';
      workbook.created = new Date();
      const infoSheet = workbook.addWorksheet('Report Info', {
        properties: { tabColor: { argb: 'FFB45309' } },
      });
      const masterName =
        `${master.user.firstName ?? ''} ${master.user.lastName ?? ''}`.trim() ||
        'Master';
      infoSheet.columns = [
        { key: 'label', width: 22 },
        { key: 'value', width: 50 },
      ];
      infoSheet.addRow({ label: 'Report Type', value: 'Leads Export' });
      infoSheet.addRow({ label: 'Master', value: masterName });
      infoSheet.addRow({
        label: 'Category',
        value: master.category?.name ?? '-',
      });
      infoSheet.addRow({ label: 'City', value: master.city?.name ?? '-' });
      infoSheet.addRow({
        label: 'Export Date',
        value: new Date().toISOString(),
      });
      infoSheet.addRow({ label: 'Total Leads', value: leads.length });
      const leadsSheet = workbook.addWorksheet('Leads', {
        properties: { tabColor: { argb: 'FF217346' } },
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      const colDefs = [
        { header: '\u2116', key: 'rowNum', width: 6 },
        { header: 'Lead ID', key: 'id', width: 38 },
        { header: 'Created At', key: 'createdAt', width: 22 },
        { header: 'Updated At', key: 'updatedAt', width: 22 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Client Name', key: 'clientName', width: 20 },
        { header: 'Client Phone', key: 'clientPhone', width: 16 },
        { header: 'Client Email', key: 'clientEmail', width: 26 },
        { header: 'Message', key: 'message', width: 45 },
        { header: 'Is Premium', key: 'isPremium', width: 12 },
        { header: 'Spam Score', key: 'spamScore', width: 12 },
        { header: 'Attachments Count', key: 'filesCount', width: 18 },
        { header: 'Master Category', key: 'categoryName', width: 20 },
        { header: 'Master City', key: 'cityName', width: 18 },
      ];
      leadsSheet.columns = colDefs;
      leadsSheet.getRow(1).font = { bold: true };
      leadsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8E8E8' },
      };
      leadsSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: colDefs.length },
      };
      leads.forEach((lead, idx) => {
        const clientEmail =
          lead.client && 'email' in lead.client
            ? (lead.client as { email: string }).email
            : '';
        leadsSheet.addRow({
          rowNum: idx + 1,
          id: lead.id,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
          status: lead.status,
          clientName: lead.clientName ?? '',
          clientPhone: lead.clientPhone,
          clientEmail,
          message: lead.message,
          isPremium: lead.isPremium ? 'Yes' : 'No',
          spamScore: lead.spamScore,
          filesCount: lead.files.length,
          categoryName,
          cityName,
        });
      });
      leadsSheet.getColumn(3).numFmt = 'yyyy-mm-dd hh:mm:ss';
      leadsSheet.getColumn(4).numFmt = 'yyyy-mm-dd hh:mm:ss';
      const buf = await workbook.xlsx.writeBuffer();
      return Buffer.from(buf);
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error('exportLeadsToBuffer failed', err);
      throw err;
    }
  }

  /**
   * Generate analytics PDF as an in-memory Buffer.
   * Does NOT write to HTTP response — safe to call from a background job.
   * @param locale — язык отчёта (en|ru), по умолчанию en
   */
  async exportAnalyticsToBuffer(
    masterId: string,
    user: JwtUser,
    locale: string = 'en',
  ): Promise<Buffer> {
    try {
      await this.validateExportAccess(masterId, user);

      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        include: { user: true, category: true, city: true },
      });
      if (!master) throw new BadRequestException('Master not found');

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
            orderBy: { date: 'desc' },
            take: 30,
          }),
        ]);

      const pdfData = {
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

      return new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        buildAnalyticsPdf(doc, pdfData, locale);
        doc.end();
      });
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error('exportAnalyticsToBuffer failed', err);
      throw err;
    }
  }
}
