import { Injectable, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
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
      'Master';
    const categoryName = master.category?.name ?? '';
    const cityName = master.city?.name ?? '';

    const infoSheet = workbook.addWorksheet('Report Info', {
      properties: { tabColor: { argb: 'FFB45309' } },
    });
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
    infoSheet.addRow({ label: 'Export Date', value: new Date().toISOString() });
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

    const leadsSheet = workbook.addWorksheet('Leads', {
      properties: { tabColor: { argb: 'FF217346' } },
      views: [{ state: 'frozen', ySplit: 1 }],
    });

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

    leadsSheet.getRow(1).font = { bold: true };
    leadsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    };
    leadsSheet.getRow(1).alignment = {
      wrapText: true,
      vertical: 'middle',
    };
    leadsSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: colDefs.length },
    };

    leads.forEach((lead, idx) => {
      leadsSheet.addRow({
        rowNum: idx + 1,
        id: lead.id,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        status: lead.status,
        clientName: lead.clientName ?? '',
        clientPhone: lead.clientPhone,
        clientEmail: this.getClientEmail(lead),
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

    return workbook;
  }
}
