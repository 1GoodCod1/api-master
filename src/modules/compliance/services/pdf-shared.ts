import path from 'path';
import type PDFDocument from 'pdfkit';
import { APP_LOCALE, type AppLocale } from '../../../common/constants';

// ==================== Типы ====================

export type Doc = InstanceType<typeof PDFDocument>;

// ==================== Константы ====================

export const COLORS = {
  primary: '#0f766e',
  primaryLight: '#e6f7f6',
  accent: '#dc2626',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  headerBg: '#f1f5f9',
} as const;

const PAGE_WIDTH = 595;
const PAGE_MARGIN = 50;

export const PAGE = {
  width: PAGE_WIDTH,
  margin: PAGE_MARGIN,
  contentWidth: PAGE_WIDTH - PAGE_MARGIN * 2,
  bottomLimit: 730,
} as const;

// ==================== Шрифт ====================

export function registerPdfFont(doc: Doc): void {
  const fontPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'assets',
    'fonts',
    'Roboto-Regular.ttf',
  );
  try {
    doc.registerFont('Roboto', fontPath);
    doc.font('Roboto');
  } catch {
    doc.font('Helvetica');
  }
}

// ==================== Локаль ====================

/** Алиас: те же коды, что AppLocale из common/constants. */
export type SupportedLocale = AppLocale;

export function resolveLocale(locale: string): SupportedLocale {
  const l = locale?.toLowerCase();
  if (l?.startsWith('ru')) return APP_LOCALE.RU;
  if (l?.startsWith('ro')) return APP_LOCALE.RO;
  return APP_LOCALE.EN;
}

export function getLocaleString(locale: SupportedLocale): string {
  const map: Record<SupportedLocale, string> = {
    [APP_LOCALE.EN]: 'en-US',
    [APP_LOCALE.RU]: 'ru-RU',
    [APP_LOCALE.RO]: 'ro-RO',
  };
  return map[locale];
}

export function formatDate(locale: SupportedLocale): string {
  const now = new Date();
  const localeStr = getLocaleString(locale);
  try {
    return new Intl.DateTimeFormat(localeStr, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function formatDateShort(locale: SupportedLocale): string {
  const now = new Date();
  const localeStr = getLocaleString(locale);
  try {
    return new Intl.DateTimeFormat(localeStr, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

// ==================== Подписи (i18n) ====================

export function getLabels<T extends Record<string, string>>(
  allLabels: Record<SupportedLocale, T>,
  locale: string,
): T {
  const lang = resolveLocale(locale);
  return allLabels[lang] ?? allLabels[APP_LOCALE.EN];
}

// ==================== Отрисовка ====================

export function ensureSpace(doc: Doc, needed: number): number {
  if (doc.y + needed > PAGE.bottomLimit) {
    doc.addPage();
    return PAGE.margin;
  }
  return doc.y;
}

export function drawSectionHeader(doc: Doc, text: string, y: number): number {
  y = ensureSpace(doc, 40);
  doc
    .fontSize(14)
    .fillColor(COLORS.primary)
    .text(text, PAGE.margin, y, { continued: false });
  doc.moveDown(0.5);
  return doc.y;
}

export function drawParagraph(doc: Doc, text: string, y: number): number {
  y = ensureSpace(doc, 30);
  doc
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(text, PAGE.margin, y, { width: PAGE.contentWidth });
  return doc.y;
}

export function drawBullet(doc: Doc, text: string, y: number): number {
  y = ensureSpace(doc, 16);
  const x = PAGE.margin + 10;
  const w = PAGE.contentWidth - 10;
  doc
    .fontSize(10)
    .fillColor(COLORS.textMuted)
    .text('\u2022', x, y, { continued: false });
  doc.fillColor(COLORS.text).text(text, x + 14, y, { width: w - 14 });
  return doc.y;
}

export function drawTableRow(
  doc: Doc,
  cols: string[],
  widths: number[],
  y: number,
  isHeader: boolean,
): number {
  y = ensureSpace(doc, 24);
  const headerFontSize = 9;
  const bodyFontSize = 9;
  const fontSize = isHeader ? headerFontSize : bodyFontSize;
  const color = isHeader ? COLORS.primary : COLORS.text;
  let cx = PAGE.margin;
  for (let i = 0; i < cols.length; i++) {
    doc.fontSize(fontSize).fillColor(color);
    if (isHeader) {
      doc.text(cols[i].toUpperCase(), cx, y, { width: widths[i] });
    } else {
      doc.text(cols[i], cx, y, { width: widths[i] });
    }
    cx += widths[i];
  }
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  doc
    .moveTo(PAGE.margin, doc.y + 2)
    .lineTo(PAGE.margin + totalWidth, doc.y + 2)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  return doc.y + 6;
}

// ==================== Номера страниц ====================

export function addPageNumbers(doc: Doc): void {
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor(COLORS.textMuted)
      .text(`${i + 1} / ${total}`, PAGE.margin, 780, {
        width: PAGE.contentWidth,
        align: 'center',
      });
  }
  doc.fillColor(COLORS.text);
}
