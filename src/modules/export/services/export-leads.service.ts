import { Injectable, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../shared/database/prisma.service';
import type { JwtUser } from '../../../common/interfaces/jwt-user.interface';
import { ExportAccessService } from './export-access.service';
import { LEADS_EXPORT_COLUMNS } from '../constants/export.constants';
import { csvEscape } from '../utils/csv-escape.util';

type LeadWithClient = Awaited<
  ReturnType<ExportLeadsService['fetchLeadsData']>
>['leads'][number];

@Injectable()
export class ExportLeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: ExportAccessService,
  ) {}

  async exportLeadsToCSV(
    masterId: string,
    user: JwtUser,
    res: Response,
  ): Promise<void> {
    await this.accessService.validateExportAccess(masterId, user);
    const { leads, master } = await this.fetchLeadsData(masterId);
    const categoryName = master?.category?.name ?? '';
    const cityName = master?.city?.name ?? '';

    const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.write('\uFEFF');
    res.write(LEADS_EXPORT_COLUMNS.map(csvEscape).join(',') + '\r\n');

    leads.forEach((lead, idx) => {
      const row = this.buildLeadRow(lead, idx, categoryName, cityName);
      res.write(row.map(csvEscape).join(',') + '\r\n');
    });

    res.end();
  }

  async exportLeadsToExcel(
    masterId: string,
    user: JwtUser,
    res: Response,
  ): Promise<void> {
    await this.accessService.validateExportAccess(masterId, user);
    const { leads, master } = await this.fetchLeadsData(masterId);

    if (!master) {
      throw new BadRequestException('Master not found');
    }

    const workbook = this.buildExcelWorkbook(leads, master);
    const filename = `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  async exportLeadsToBuffer(
    masterId: string,
    user: JwtUser,
    format: 'csv' | 'excel',
  ): Promise<Buffer> {
    await this.accessService.validateExportAccess(masterId, user);
    const { leads, master } = await this.fetchLeadsData(masterId);

    if (!master) {
      throw new BadRequestException('Master not found');
    }

    if (format === 'csv') {
      const rows: string[] = [];
      rows.push('\uFEFF' + LEADS_EXPORT_COLUMNS.map(csvEscape).join(','));
      leads.forEach((lead, idx) => {
        const row = this.buildLeadRow(
          lead,
          idx,
          master.category?.name ?? '',
          master.city?.name ?? '',
        );
        rows.push(row.map(csvEscape).join(','));
      });
      return Buffer.from(rows.join('\r\n'), 'utf-8');
    }

    const workbook = this.buildExcelWorkbook(leads, master);
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private async fetchLeadsData(masterId: string) {
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
    return { leads, master };
  }

  private getClientEmail(lead: LeadWithClient): string {
    return lead.client && 'email' in lead.client
      ? (lead.client as { email: string }).email
      : '';
  }

  private buildLeadRow(
    lead: LeadWithClient,
    idx: number,
    categoryName: string,
    cityName: string,
  ): string[] {
    return [
      (idx + 1).toString(),
      lead.id,
      lead.createdAt.toISOString(),
      lead.updatedAt.toISOString(),
      lead.status,
      lead.clientName ?? '',
      lead.clientPhone,
      this.getClientEmail(lead),
      lead.message,
      lead.isPremium ? 'Yes' : 'No',
      lead.spamScore.toString(),
      lead.files.length.toString(),
      categoryName,
      cityName,
    ];
  }

  private buildExcelWorkbook(
    leads: LeadWithClient[],
    master: NonNullable<
      Awaited<ReturnType<ExportLeadsService['fetchLeadsData']>>['master']
    >,
  ): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Master-Hub';
    workbook.created = new Date();

    const masterName =
      `${master.user.firstName ?? ''} ${master.user.lastName ?? ''}`.trim() ||
      'Мастер';
    const categoryName = master.category?.name ?? '—';
    const cityName = master.city?.name ?? '—';

    // ── Helpers ──────────────────────────────────
    const statusLabel: Record<string, string> = {
      NEW: 'Новый',
      IN_PROGRESS: 'В работе',
      CLOSED: 'Закрыт',
      SPAM: 'Спам',
    };
    const statusBg: Record<string, string> = {
      NEW: 'FFDBEAFE',
      IN_PROGRESS: 'FFFEF3C7',
      CLOSED: 'FFDCFCE7',
      SPAM: 'FFFEE2E2',
    };
    const statusFontClr: Record<string, string> = {
      NEW: 'FF7C3AED',
      IN_PROGRESS: 'FFD97706',
      CLOSED: 'FF16A34A',
      SPAM: 'FFDC2626',
    };

    const HEADER_BG = 'FF1F2937';
    const HEADER_FONT = 'FFFFFFFF';
    const ALT_ROW = 'FFF9FAFB';
    const BORDER_CLR = 'FFE5E7EB';
    const ACCENT = 'FFB45309';
    const LABEL_BG = 'FFF3F4F6';
    const DARK = 'FF1F2937';
    const MUTED = 'FF374151';

    const bdr = { style: 'thin' as const, color: { argb: BORDER_CLR } };
    const thinBorder = { top: bdr, bottom: bdr, left: bdr, right: bdr };

    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmtDate = (d: Date) =>
      `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    const fmtDateTime = (d: Date) =>
      `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    // ═══════════════════════════════════════════
    //  ЛИСТ «ОТЧЁТ»
    // ═══════════════════════════════════════════
    const info = workbook.addWorksheet('Отчёт', {
      properties: { tabColor: { argb: ACCENT } },
    });
    info.columns = [
      { key: 'label', width: 28 },
      { key: 'value', width: 44 },
    ];

    // Title
    info.mergeCells('A1:B1');
    const titleCell = info.getCell('A1');
    titleCell.value = 'Отчёт по заявкам';
    titleCell.font = { bold: true, size: 16, color: { argb: DARK } };
    titleCell.alignment = { vertical: 'middle' };
    info.getRow(1).height = 32;

    info.mergeCells('A2:B2');
    info.getCell('A2').value = 'Master-Hub';
    info.getCell('A2').font = { size: 11, color: { argb: 'FF9CA3AF' } };

    info.addRow({});

    const addInfoRow = (label: string, value: string | number) => {
      const row = info.addRow({ label, value });
      row.getCell(1).font = { bold: true, size: 11, color: { argb: MUTED } };
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: LABEL_BG },
      };
      row.getCell(1).border = thinBorder;
      row.getCell(2).border = thinBorder;
      row.getCell(2).font = { size: 11 };
      return row;
    };

    addInfoRow('Мастер', masterName);
    addInfoRow('Категория', categoryName);
    addInfoRow('Город', cityName);
    addInfoRow('Дата выгрузки', fmtDateTime(new Date()));
    addInfoRow('Всего заявок', leads.length);

    const premiumCount = leads.filter((l) => l.isPremium).length;
    if (premiumCount > 0) {
      addInfoRow('Премиум заявок', `${premiumCount} из ${leads.length}`);
    }

    if (leads.length > 0) {
      const times = leads.map((l) => l.createdAt.getTime());
      addInfoRow(
        'Период',
        `${fmtDate(new Date(Math.min(...times)))} — ${fmtDate(new Date(Math.max(...times)))}`,
      );
    }

    // Status breakdown
    info.addRow({});
    const statsRow = info.addRow({ label: 'Статистика по статусам' });
    info.mergeCells(`A${statsRow.number}:B${statsRow.number}`);
    statsRow.getCell(1).font = {
      bold: true,
      size: 13,
      color: { argb: DARK },
    };

    const statusCounts: Record<string, number> = {};
    leads.forEach((l) => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });

    for (const [status, count] of Object.entries(statusCounts)) {
      const row = info.addRow({
        label: statusLabel[status] ?? status,
        value: count,
      });
      row.getCell(1).font = {
        bold: true,
        color: { argb: statusFontClr[status] ?? MUTED },
      };
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusBg[status] ?? LABEL_BG },
      };
      row.getCell(1).border = thinBorder;
      row.getCell(2).border = thinBorder;
      row.getCell(2).font = { bold: true, size: 12 };
      row.getCell(2).alignment = { horizontal: 'center' };
    }

    // ═══════════════════════════════════════════
    //  ЛИСТ «ЗАЯВКИ»
    // ═══════════════════════════════════════════
    const sheet = workbook.addWorksheet('Заявки', {
      properties: { tabColor: { argb: 'FF217346' } },
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const colDefs: { header: string; key: string; width: number }[] = [
      { header: '№', key: 'rowNum', width: 6 },
      { header: 'Дата создания', key: 'createdAt', width: 20 },
      { header: 'Обновлено', key: 'updatedAt', width: 20 },
      { header: 'Статус', key: 'status', width: 16 },
      { header: 'Имя клиента', key: 'clientName', width: 22 },
      { header: 'Телефон', key: 'clientPhone', width: 18 },
      { header: 'Email', key: 'clientEmail', width: 28 },
      { header: 'Сообщение', key: 'message', width: 50 },
      { header: 'Премиум', key: 'isPremium', width: 12 },
      { header: 'Оценка спама', key: 'spamScore', width: 14 },
      { header: 'Файлов', key: 'filesCount', width: 10 },
    ];
    sheet.columns = colDefs;

    // Header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = { bold: true, size: 11, color: { argb: HEADER_FONT } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: HEADER_BG } },
        bottom: { style: 'medium', color: { argb: ACCENT } },
        left: { style: 'thin', color: { argb: 'FF374151' } },
        right: { style: 'thin', color: { argb: 'FF374151' } },
      };
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: colDefs.length },
    };

    // Data rows
    leads.forEach((lead, idx) => {
      const row = sheet.addRow({
        rowNum: idx + 1,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        status: statusLabel[lead.status] ?? lead.status,
        clientName: lead.clientName ?? '',
        clientPhone: lead.clientPhone,
        clientEmail: this.getClientEmail(lead),
        message: lead.message,
        isPremium: lead.isPremium ? 'Да' : 'Нет',
        spamScore: lead.spamScore,
        filesCount: lead.files.length,
      });

      // Alternating row background
      if (idx % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: ALT_ROW },
          };
        });
      }

      // Borders & base alignment
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', wrapText: true };
      });

      // Status cell colour
      const sBg = statusBg[lead.status];
      const sFc = statusFontClr[lead.status];
      if (sBg && sFc) {
        const sc = row.getCell('status');
        sc.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: sBg },
        };
        sc.font = { bold: true, color: { argb: sFc } };
        sc.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      row.getCell('rowNum').alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      // Premium highlight
      if (lead.isPremium) {
        const pc = row.getCell('isPremium');
        pc.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' },
        };
        pc.font = { bold: true, color: { argb: 'FFD97706' } };
        pc.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Spam score highlight
      if (lead.spamScore > 0) {
        row.getCell('spamScore').font = {
          bold: true,
          color: { argb: 'FFDC2626' },
        };
      }
    });

    // Date format
    sheet.getColumn('createdAt').numFmt = 'dd.mm.yyyy hh:mm';
    sheet.getColumn('updatedAt').numFmt = 'dd.mm.yyyy hh:mm';

    // Summary row
    if (leads.length > 0) {
      const sumRow = sheet.addRow({});
      sheet.mergeCells(`A${sumRow.number}:C${sumRow.number}`);
      const sumCell = sumRow.getCell(1);
      sumCell.value = `Итого: ${leads.length} заявок`;
      sumCell.font = { bold: true, size: 11, color: { argb: DARK } };
      sumCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      sumRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'medium', color: { argb: ACCENT } },
          bottom: { style: 'thin', color: { argb: BORDER_CLR } },
          left: { style: 'thin', color: { argb: BORDER_CLR } },
          right: { style: 'thin', color: { argb: BORDER_CLR } },
        };
      });
    }

    return workbook;
  }
}
