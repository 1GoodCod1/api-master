import {
  type Doc,
  COLORS,
  PAGE,
  registerPdfFont,
  drawSectionHeader,
  drawKeyValue,
  resolveLocale,
  getLocaleString,
} from '../shared/pdf/pdf-shared';
import { getAnalyticsPdfTranslations } from './analytics-pdf-translations';
import type { AnalyticsPdfData } from './types';

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

export function buildAnalyticsPdf(
  doc: Doc,
  data: AnalyticsPdfData,
  locale: string = 'en',
): void {
  const t = getAnalyticsPdfTranslations(locale);
  const translateStatus = (status: string) => t.status[status] ?? status;

  registerPdfFont(doc);

  const { margin, contentWidth, width: pageWidth } = PAGE;
  const localeStr = getLocaleString(resolveLocale(locale));
  let y = 110;

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
    `${t.generated}: ${new Date().toLocaleString(localeStr)}`,
    margin,
    64,
    { align: 'center', width: contentWidth },
  );

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
    rowY = drawKeyValue(doc, label, value, margin, rowY, 120);
    rowY += 6;
  }
  y = rowY + 16;

  const boxWidth = (contentWidth - 40) / 3;
  const boxHeight = 52;

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

  if (data.analytics.length > 0) {
    y = drawSectionHeader(doc, t.recentAnalytics, y);

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
