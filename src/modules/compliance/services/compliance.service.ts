import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../shared/database/prisma.service';
import { buildDpiaPdf, type DpiaContext } from './dpia-pdf.builder';
import { buildRopaPdf, type RopaContext } from './ropa-pdf.builder';

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

  async streamDpiaPdf(res: Response, locale: string): Promise<void> {
    this.logger.log(`Generating DPIA PDF (locale=${locale})`);
    const data = await this.getDpiaContext();
    const filename = `DPIA_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    buildDpiaPdf(doc, data, locale);
    doc.end();
  }

  async streamRopaPdf(res: Response, locale: string): Promise<void> {
    this.logger.log(`Generating ROPA PDF (locale=${locale})`);
    const data = await this.getRopaContext();
    const filename = `ROPA_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    buildRopaPdf(doc, data, locale);
    doc.end();
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
      lastGenerated: new Date().toISOString(),
    };
  }
}
