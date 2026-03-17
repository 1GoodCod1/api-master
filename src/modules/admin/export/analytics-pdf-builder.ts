import path from 'path';
import { getAnalyticsPdfTranslations } from './analytics-pdf-translations';

/** Цветовая палитра PDF */
const COLORS = {
  primary: '#0f766e',
  primaryLight: '#e6f7f6',
  accent: '#f59e0b',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
} as const;

type Doc = InstanceType<typeof import('pdfkit')>;

interface AnalyticsPdfData {
  masterName: string;
  categoryName: string;
  cityName: string;
  rating: number | null;
  totalReviews: number;
  totalLeads: number;
  leadsStats: Array<{ status: string; _count: number }>;
  reviewsStats: Array<{ status: string; _count: number }>;
  bookingsStats: Array<{ status: string; _count: number }>;
  analytics: Array<{ date: Date; leadsCount: number; viewsCount: number }>;
}

/**
 * Register Roboto font for Cyrillic support.
 * Falls back to Helvetica if font file is missing.
 */
function registerPdfFont(doc: Doc): void {
  const fontPath = path.join(
    process.cwd(),
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

function drawSectionHeader(doc: Doc, text: string, y: number): number {
  doc
    .fontSize(14)
    .fillColor(COLORS.primary)
    .text(text, 50, y, { continued: false });
  doc.moveDown(0.5);
  return doc.y;
}

function drawKeyValue(
  doc: Doc,
  label: string,
  value: string | number,
  x: number,
  y: number,
): number {
  doc.fontSize(10).fillColor(COLORS.textMuted).text(`${label}: `, x, y, {
    continued: true,
    width: 120,
  });
  doc.fillColor(COLORS.text).text(String(value));
  return doc.y;
}

function drawStatBox(
  doc: Doc,
  label: string,
  value: string | number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  doc
    .rect(x, y, width, height)
    .fillAndStroke(COLORS.primaryLight, COLORS.border);
  doc
    .fontSize(9)
    .fillColor(COLORS.textMuted)
    .text(label, x + 10, y + 8, {
      width: width - 20,
    });
  doc
    .fontSize(16)
    .fillColor(COLORS.primary)
    .text(String(value), x + 10, y + 24, {
      width: width - 20,
    });
}

/**
 * Построение содержимого PDF-отчёта аналитики с улучшенным дизайном и переводами.
 */
export function buildAnalyticsPdf(
  doc: Doc,
  data: AnalyticsPdfData,
  locale: string = 'en',
): void {
  const t = getAnalyticsPdfTranslations(locale);
  const translateStatus = (status: string) => t.status[status] ?? status;

  registerPdfFont(doc);

  const margin = 50;
  const pageWidth = 595;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Заголовок с акцентной полосой
  doc.rect(0, 0, pageWidth, 80).fill(COLORS.primary);
  doc.fontSize(24).fillColor(COLORS.white).text(t.title, margin, 28, {
    align: 'center',
    width: contentWidth,
  });
  doc
    .fontSize(12)
    .fillColor('rgba(255,255,255,0.9)')
    .text(`${t.master}: ${data.masterName}`, margin, 52, {
      align: 'center',
      width: contentWidth,
    });
  doc.text(
    `${t.generated}: ${new Date().toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}`,
    margin,
    64,
    { align: 'center', width: contentWidth },
  );

  y = 100;

  // Секция информации о профиле
  y = drawSectionHeader(doc, t.profileInfo, y);
  doc.fontSize(10);

  const profileItems = [
    [t.category, data.categoryName || '—'],
    [t.city, data.cityName || '—'],
    [t.rating, data.rating != null ? data.rating.toFixed(1) : '—'],
    [t.totalReviews, String(data.totalReviews)],
    [t.totalLeads, String(data.totalLeads)],
  ];

  let rowY = y;
  for (const [label, value] of profileItems) {
    rowY = drawKeyValue(doc, label, value, margin, rowY);
    rowY += 6;
  }
  y = rowY + 16;

  // Stats in boxes (3 columns)
  const boxWidth = (contentWidth - 40) / 3;
  const boxHeight = 52;

  // Статистика лидов
  y = drawSectionHeader(doc, t.leadsStats, y);
  if (data.leadsStats.length > 0) {
    let col = 0;
    for (const stat of data.leadsStats) {
      const x = margin + col * (boxWidth + 20);
      drawStatBox(
        doc,
        translateStatus(stat.status),
        stat._count,
        x,
        y,
        boxWidth,
        boxHeight,
      );
      col++;
    }
    y += boxHeight + 16;
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 24;
  }

  // Статистика отзывов
  y = drawSectionHeader(doc, t.reviewsStats, y);
  if (data.reviewsStats.length > 0) {
    let col = 0;
    for (const stat of data.reviewsStats) {
      const x = margin + col * (boxWidth + 20);
      drawStatBox(
        doc,
        translateStatus(stat.status),
        stat._count,
        x,
        y,
        boxWidth,
        boxHeight,
      );
      col++;
    }
    y += boxHeight + 16;
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 24;
  }

  // Bookings stats
  y = drawSectionHeader(doc, t.bookingsStats, y);
  if (data.bookingsStats.length > 0) {
    let col = 0;
    for (const stat of data.bookingsStats) {
      const x = margin + col * (boxWidth + 20);
      drawStatBox(
        doc,
        translateStatus(stat.status),
        stat._count,
        x,
        y,
        boxWidth,
        boxHeight,
      );
      col++;
    }
    y += boxHeight + 16;
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 24;
  }

  // Таблица последней аналитики
  if (data.analytics.length > 0) {
    y = drawSectionHeader(doc, t.recentAnalytics, y);

    const localeStr = locale === 'ru' ? 'ru-RU' : 'en-US';
    const dateOpts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };

    doc.fontSize(9).fillColor(COLORS.textMuted);
    doc.text('Date', margin, y, { width: 120, continued: true });
    doc.text(t.leads, { continued: true });
    doc.text(` | ${t.views}`);
    y += 14;

    doc.fillColor(COLORS.text);
    for (const day of data.analytics) {
      const dateStr = day.date.toLocaleDateString(localeStr, dateOpts);
      doc.text(
        `${dateStr}: ${day.leadsCount ?? 0} ${t.leads}, ${day.viewsCount ?? 0} ${t.views}`,
        margin,
        y,
        { width: contentWidth },
      );
      y += 12;
    }
  }

  doc.fillColor(COLORS.text);
}
