import { Injectable, Logger } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../common/errors';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../shared/database/prisma.service';
import { buildDpiaPdf, type DpiaContext } from './dpia-pdf.builder';
import { buildRopaPdf, type RopaContext } from './ropa-pdf.builder';

type PdfBuilder<T> = (
  doc: InstanceType<typeof PDFDocument>,
  data: T,
  locale: string,
) => void;

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getOrgName(): string {
    return this.config.get<string>('ORGANIZATION_NAME', 'MasterHub SRL');
  }

  private getOrgAddress(): string {
    return this.config.get<string>(
      'ORGANIZATION_ADDRESS',
      'Chișinău, Republic of Moldova',
    );
  }

  private getDpoName(): string {
    return this.config.get<string>('DPO_NAME', 'Data Protection Officer');
  }

  private getDpoEmail(): string {
    return this.config.get<string>('DPO_EMAIL', 'dpo@masterhub.md');
  }

  async getDpiaContext(): Promise<DpiaContext> {
    const [
      totalUsers,
      totalMasters,
      totalLeads,
      totalBookings,
      totalReviews,
      verifiedDocumentsCount,
      consentsCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.master.count(),
      this.prisma.lead.count(),
      this.prisma.booking.count(),
      this.prisma.review.count(),
      this.prisma.masterVerification.count({ where: { status: 'APPROVED' } }),
      this.prisma.userConsent.count(),
    ]);

    return {
      organizationName: this.getOrgName(),
      dpoName: this.getDpoName(),
      dpoEmail: this.getDpoEmail(),
      totalUsers,
      totalMasters,
      totalLeads,
      totalBookings,
      totalReviews,
      verifiedDocumentsCount,
      consentsCount,
      encryptionEnabled: true,
      backupEnabled: true,
      auditLogEnabled: true,
      rateLimitEnabled: true,
      twoFactorAvailable: true,
    };
  }

  async getRopaContext(): Promise<RopaContext> {
    const [totalUsers, totalMasters] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.master.count(),
    ]);

    return {
      organizationName: this.getOrgName(),
      organizationAddress: this.getOrgAddress(),
      dpoName: this.getDpoName(),
      dpoEmail: this.getDpoEmail(),
      totalUsers,
      totalMasters,
    };
  }

  private async streamPdf<T>(
    res: Response,
    locale: string,
    prefix: string,
    getData: () => Promise<T>,
    builder: PdfBuilder<T>,
  ): Promise<void> {
    this.logger.log(`Generating ${prefix} PDF (locale=${locale})`);

    const data = await getData();
    const filename = `${prefix}_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
    });

    doc.on('error', (err) => {
      this.logger.error(`PDF generation error (${prefix})`, err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'PDF generation failed' });
      }
    });

    doc.pipe(res);

    try {
      builder(doc, data, locale);
      doc.end();
    } catch (err) {
      this.logger.error(`Failed to build ${prefix} PDF`, err);
      doc.end();
      if (!res.headersSent) {
        throw AppErrors.internal(AppErrorMessages.PDF_GENERATION_FAILED);
      }
    }
  }

  async streamDpiaPdf(res: Response, locale: string): Promise<void> {
    return this.streamPdf(
      res,
      locale,
      'DPIA',
      () => this.getDpiaContext(),
      buildDpiaPdf,
    );
  }

  async streamRopaPdf(res: Response, locale: string): Promise<void> {
    return this.streamPdf(
      res,
      locale,
      'ROPA',
      () => this.getRopaContext(),
      buildRopaPdf,
    );
  }

  async getComplianceOverview() {
    const [
      totalUsers,
      totalMasters,
      totalConsents,
      totalAuditLogs,
      pendingVerifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.master.count(),
      this.prisma.userConsent.count(),
      this.prisma.auditLog.count(),
      this.prisma.masterVerification.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      totalUsers,
      totalMasters,
      totalConsents,
      totalAuditLogs,
      pendingVerifications,
      dpiaAvailable: true,
      ropaAvailable: true,
    };
  }
}
