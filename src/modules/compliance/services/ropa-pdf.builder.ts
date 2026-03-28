import {
  type Doc,
  COLORS,
  PAGE,
  registerPdfFont,
  getLabels,
  resolveLocale,
  formatDate,
  addPageNumbers,
} from './pdf-shared';
import { ROPA_LABELS, type RopaLabels } from '../i18n/ropa-labels';
import type { RopaContext, RopaEntry } from '../types';

export type { RopaContext, RopaEntry };

const PROCESSING_KEYS = [
  'registration',
  'masterProfile',
  'verification',
  'leads',
  'bookings',
  'reviews',
  'payments',
  'loginHistory',
  'analytics',
  'consent',
  'notifications',
  'audit',
] as const;

function getEntries(t: RopaLabels): RopaEntry[] {
  return PROCESSING_KEYS.map((k) => ({
    activity: t[`act_${k}`],
    dataSubjects: t[`sub_${k}`],
    dataCategories: t[`cat_${k}`],
    purpose: t[`pur_${k}`],
    legalBasis: t[`bas_${k}`],
    recipients: t[`rec_${k}`],
    retention: t[`ret_${k}`],
    transfers: t[`tra_${k}`],
    technicalMeasures: t[`mea_${k}`],
  }));
}

const ENTRY_HEADER_HEIGHT = 22;

function drawEntryBlock(
  doc: Doc,
  entry: RopaEntry,
  index: number,
  t: RopaLabels,
): void {
  const { margin, contentWidth } = PAGE;
  const labelWidth = 130;
  const valueWidth = contentWidth - labelWidth - 10;

  if (doc.y > PAGE.bottomLimit - 80) {
    doc.addPage();
  }

  // Полоса шапки
  const headerY = doc.y;
  doc
    .rect(margin, headerY, contentWidth, ENTRY_HEADER_HEIGHT)
    .fill(COLORS.primary);
  doc
    .fontSize(11)
    .fillColor(COLORS.white)
    .text(
      `${index + 1}. ${entry.activity}`,
      margin + 8,
      headerY + (ENTRY_HEADER_HEIGHT - 11) / 2,
    );

  let y = headerY + ENTRY_HEADER_HEIGHT + 8;
  doc.y = y;

  const rows: [string, string][] = [
    [t.colSubjects, entry.dataSubjects],
    [t.colCategories, entry.dataCategories],
    [t.colPurpose, entry.purpose],
    [t.colLegalBasis, entry.legalBasis],
    [t.colRecipients, entry.recipients],
    [t.colRetention, entry.retention],
    [t.colTransfers, entry.transfers],
    [t.colMeasures, entry.technicalMeasures],
  ];

  for (const [label, value] of rows) {
    if (y > PAGE.bottomLimit) {
      doc.addPage();
      y = PAGE.margin;
    }
    doc
      .fontSize(9)
      .fillColor(COLORS.primary)
      .text(label, margin + 8, y, { width: labelWidth, continued: false });
    const labelBottom = doc.y;
    doc
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(value, margin + labelWidth + 10, y, { width: valueWidth });
    y = Math.max(labelBottom, doc.y) + 4;
  }

  doc
    .moveTo(margin, y)
    .lineTo(margin + contentWidth, y)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc.y = y + 10;
}

export function buildRopaPdf(
  doc: Doc,
  data: RopaContext,
  locale: string = 'en',
): void {
  const lang = resolveLocale(locale);
  const t = getLabels(ROPA_LABELS, lang);
  registerPdfFont(doc);

  const { margin, contentWidth, width: pageWidth } = PAGE;

  // Шапка
  doc.rect(0, 0, pageWidth, 100).fill(COLORS.primary);
  doc.fontSize(22).fillColor(COLORS.white).text(t.title, margin, 20, {
    align: 'center',
    width: contentWidth,
  });
  doc
    .fontSize(11)
    .fillColor('rgba(255,255,255,0.9)')
    .text(t.subtitle, margin, 46, {
      align: 'center',
      width: contentWidth,
    });
  doc.fontSize(9).fillColor('rgba(255,255,255,0.8)');
  doc.text(`${t.generated}: ${formatDate(lang)}`, margin, 62, {
    align: 'center',
    width: contentWidth,
  });
  doc.text(`${t.controller}: ${data.organizationName}`, margin, 74, {
    align: 'center',
    width: contentWidth,
  });
  doc.text(
    `${t.dpo}: ${data.dpoName} | ${t.dpoContact}: ${data.dpoEmail}`,
    margin,
    86,
    { align: 'center', width: contentWidth },
  );

  let y = 116;
  doc.fontSize(10).fillColor(COLORS.textMuted);
  doc.text(`${t.address}: ${data.organizationAddress}`, margin, y);
  y = doc.y + 6;
  doc.fontSize(8).fillColor(COLORS.textMuted);
  doc.text(t.supervisoryAuthority, margin, y, { width: contentWidth });
  y = doc.y + 2;
  doc.text(t.legalFramework, margin, y, { width: contentWidth });
  y = doc.y + 12;
  doc.y = y;

  const entries = getEntries(t);
  for (let i = 0; i < entries.length; i++) {
    drawEntryBlock(doc, entries[i], i, t);
  }

  // Подвал
  y = doc.y + 10;
  if (y > PAGE.bottomLimit - 30) {
    doc.addPage();
    y = PAGE.margin;
  }
  doc.rect(margin, y, contentWidth, 3).fill(COLORS.primary);
  y += 12;
  doc
    .fontSize(9)
    .fillColor(COLORS.textMuted)
    .text(t.footer, margin, y, { width: contentWidth, align: 'center' });

  doc.fillColor(COLORS.text);

  addPageNumbers(doc);
}
