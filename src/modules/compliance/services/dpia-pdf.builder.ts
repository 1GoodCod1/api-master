import {
  type Doc,
  COLORS,
  PAGE,
  registerPdfFont,
  getLabels,
  resolveLocale,
  formatDate,
  formatDateShort,
  ensureSpace,
  drawSectionHeader,
  drawParagraph,
  drawBullet,
  drawTableRow,
  addPageNumbers,
} from './pdf-shared';
import { DPIA_LABELS, type DpiaLabels } from '../i18n/dpia-labels';

export interface DpiaContext {
  organizationName: string;
  dpoName: string;
  dpoEmail: string;
  totalUsers: number;
  totalMasters: number;
  totalLeads: number;
  totalBookings: number;
  totalReviews: number;
  verifiedDocumentsCount: number;
  consentsCount: number;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
  auditLogEnabled: boolean;
  rateLimitEnabled: boolean;
  twoFactorAvailable: boolean;
}

export function buildDpiaPdf(
  doc: Doc,
  data: DpiaContext,
  locale: string = 'en',
): void {
  const lang = resolveLocale(locale);
  const t: DpiaLabels = getLabels(DPIA_LABELS, lang);
  registerPdfFont(doc);

  const { margin, contentWidth, width: pageWidth } = PAGE;

  // Баннер шапки
  doc.rect(0, 0, pageWidth, 100).fill(COLORS.accent);
  doc.fontSize(22).fillColor(COLORS.white).text(t.title, margin, 24, {
    align: 'center',
    width: contentWidth,
  });
  doc
    .fontSize(11)
    .fillColor('rgba(255,255,255,0.9)')
    .text(t.subtitle, margin, 50, {
      align: 'center',
      width: contentWidth,
    });
  doc.fontSize(9).fillColor('rgba(255,255,255,0.8)');
  doc.text(
    `${t.generated}: ${formatDate(lang)} | ${t.organization}: ${data.organizationName}`,
    margin,
    68,
    { align: 'center', width: contentWidth },
  );
  doc.text(
    `${t.dpo}: ${data.dpoName} | ${t.dpoContact}: ${data.dpoEmail}`,
    margin,
    82,
    { align: 'center', width: contentWidth },
  );

  let y = 120;

  // Сведения о правовой базе
  doc.fontSize(8).fillColor(COLORS.textMuted);
  doc.text(t.supervisoryAuthority, margin, y, { width: contentWidth });
  y = doc.y + 2;
  doc.text(t.legalFramework, margin, y, { width: contentWidth });
  y = doc.y + 12;

  // Раздел 1: описание
  y = drawSectionHeader(doc, t.section1, y);
  y = drawParagraph(doc, t.processingDesc, y);
  y += 10;
  doc.fontSize(11).fillColor(COLORS.primary).text(t.dataCategories, margin, y);
  y = doc.y + 6;

  const categories = [
    t.cat_identity,
    t.cat_auth,
    t.cat_financial,
    t.cat_professional,
    t.cat_communication,
    t.cat_documents,
    t.cat_location,
    t.cat_consent,
  ];
  for (const cat of categories) {
    y = drawBullet(doc, cat, y);
    y += 2;
  }
  y += 10;

  // Раздел 2: цели и правовые основания
  y = drawSectionHeader(doc, t.section2, y);
  const purposes: [string, string][] = [
    [t.purpose_service, t.basis_service],
    [t.purpose_verification, t.basis_verification],
    [t.purpose_payments, t.basis_payments],
    [t.purpose_marketing, t.basis_marketing],
    [t.purpose_security, t.basis_security],
    [t.purpose_analytics, t.basis_analytics],
  ];
  const purposeWidths = [contentWidth * 0.45, contentWidth * 0.55];
  y = drawTableRow(doc, [t.purpose, t.legalBasis], purposeWidths, y, true);
  for (const [purpose, basis] of purposes) {
    y = drawTableRow(doc, [purpose, basis], purposeWidths, y, false);
  }
  y += 10;

  // Раздел 3: необходимость и пропорциональность
  y = drawSectionHeader(doc, t.section3, y);
  y = drawParagraph(doc, t.necessityDesc, y);
  y += 8;
  doc.fontSize(11).fillColor(COLORS.primary).text(t.retentionTitle, margin, y);
  y = doc.y + 6;

  const retentions = [
    t.retention_active,
    t.retention_deleted,
    t.retention_logs,
    t.retention_documents,
    t.retention_payments,
    t.retention_consents,
  ];
  for (const ret of retentions) {
    y = drawBullet(doc, ret, y);
    y += 2;
  }
  y += 10;

  // Раздел 4: оценка рисков
  y = drawSectionHeader(doc, t.section4, y);
  doc.fontSize(11).fillColor(COLORS.text).text(t.riskTitle, margin, y);
  y = doc.y + 6;

  const riskWidths = [
    contentWidth * 0.25,
    contentWidth * 0.12,
    contentWidth * 0.13,
    contentWidth * 0.5,
  ];
  y = drawTableRow(
    doc,
    [t.risk, t.likelihood, t.impact, t.mitigation],
    riskWidths,
    y,
    true,
  );

  const risks: [string, string, string, string][] = [
    [t.risk_breach, t.risk_breach_l, t.risk_breach_i, t.risk_breach_m],
    [
      t.risk_documents,
      t.risk_documents_l,
      t.risk_documents_i,
      t.risk_documents_m,
    ],
    [t.risk_consent, t.risk_consent_l, t.risk_consent_i, t.risk_consent_m],
    [
      t.risk_availability,
      t.risk_availability_l,
      t.risk_availability_i,
      t.risk_availability_m,
    ],
  ];
  for (const row of risks) {
    y = drawTableRow(doc, row, riskWidths, y, false);
  }
  y += 10;

  // Раздел 5: технические меры
  y = drawSectionHeader(doc, t.section5, y);
  const measureWidths = [contentWidth * 0.25, contentWidth * 0.75];
  y = drawTableRow(
    doc,
    [t.measureCategory, t.measureDescription],
    measureWidths,
    y,
    true,
  );

  const measures: [string, string][] = [
    [t.m_encryption, t.m_encryption_d],
    [t.m_access, t.m_access_d],
    [t.m_audit, t.m_audit_d],
    [t.m_rateLimit, t.m_rateLimit_d],
    [t.m_backup, t.m_backup_d],
    [t.m_monitoring, t.m_monitoring_d],
    [t.m_minimization, t.m_minimization_d],
    [t.m_consent, t.m_consent_d],
  ];
  for (const row of measures) {
    y = drawTableRow(doc, row, measureWidths, y, false);
  }
  y += 10;

  // Раздел 6: права субъектов данных
  y = drawSectionHeader(doc, t.section6, y);
  y = drawParagraph(doc, t.rightsDesc, y);
  y += 4;

  const rights = [
    t.right_access,
    t.right_rectification,
    t.right_erasure,
    t.right_portability,
    t.right_objection,
    t.right_restriction,
  ];
  for (const right of rights) {
    y = drawBullet(doc, right, y);
    y += 2;
  }
  y += 10;

  // Раздел 7: статистика платформы
  y = drawSectionHeader(doc, t.section7, y);
  const statWidths = [contentWidth * 0.65, contentWidth * 0.35];
  y = drawTableRow(doc, [t.statLabel, t.statValue], statWidths, y, true);

  const stats: [string, string][] = [
    [t.stat_users, String(data.totalUsers)],
    [t.stat_masters, String(data.totalMasters)],
    [t.stat_leads, String(data.totalLeads)],
    [t.stat_bookings, String(data.totalBookings)],
    [t.stat_reviews, String(data.totalReviews)],
    [t.stat_documents, String(data.verifiedDocumentsCount)],
    [t.stat_consents, String(data.consentsCount)],
  ];
  for (const row of stats) {
    y = drawTableRow(doc, row, statWidths, y, false);
  }
  y += 10;

  // Раздел 8: заключение
  drawSectionHeader(doc, t.section8, y);

  y = ensureSpace(doc, 60);
  doc.rect(margin, y, contentWidth, 4).fill(COLORS.primary);
  y += 12;
  drawParagraph(doc, t.conclusionText, y);

  y = ensureSpace(doc, 40);
  doc.fontSize(10).fillColor(COLORS.textMuted);
  doc.text(`${t.approvedBy}: ${data.dpoName}`, margin, y);
  y = doc.y + 4;
  doc.text(`${t.date}: ${formatDateShort(lang)}`, margin, y);

  doc.fillColor(COLORS.text);

  addPageNumbers(doc);
}
