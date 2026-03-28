import path from 'path';
import type PDFDocument from 'pdfkit';
import { formatUserName } from '../../shared/utils/format-name.util';

/** PDF color palette — professional, GDPR-friendly */
const COLORS = {
  primary: '#0f766e',
  primaryLight: '#e6f7f6',
  accent: '#f59e0b',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
} as const;

type Doc = InstanceType<typeof PDFDocument>;

export interface PersonalDataPdfUser {
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isVerified: boolean;
  preferredLanguage: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface PersonalDataPdfMasterProfile {
  description: string | null;
  experienceYears: number;
  cityName: string | null;
  categoryName: string | null;
  whatsappPhone: string | null;
  createdAt: string;
}

export interface PersonalDataPdfLead {
  message: string;
  clientPhone: string;
  clientName: string | null;
  status: string;
  createdAt: string;
}

export interface PersonalDataPdfReview {
  rating: number;
  comment: string | null;
  clientPhone: string;
  clientName: string | null;
  createdAt: string;
}

export interface PersonalDataPdfBooking {
  clientPhone: string;
  clientName: string | null;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
}

export interface PersonalDataPdfLoginEntry {
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  success: boolean;
  createdAt: string;
}

export interface PersonalDataPdfNotification {
  type: string;
  message: string;
  createdAt: string;
}

export interface PersonalDataPdfConsent {
  consentType: string;
  granted: boolean;
  version: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface PersonalDataPdfData {
  exportDate: string;
  user: PersonalDataPdfUser;
  masterProfile: PersonalDataPdfMasterProfile | null;
  leads: PersonalDataPdfLead[];
  reviews: PersonalDataPdfReview[];
  bookings: PersonalDataPdfBooking[];
  loginHistory: PersonalDataPdfLoginEntry[];
  notifications: PersonalDataPdfNotification[];
  consents: PersonalDataPdfConsent[];
}

const LABELS: Record<string, Record<string, string>> = {
  en: {
    title: 'Personal Data Export',
    subtitle: 'GDPR Art. 20 — Data Portability',
    generated: 'Generated',
    profile: 'Profile',
    email: 'Email',
    phone: 'Phone',
    name: 'Name',
    role: 'Role',
    verified: 'Verified',
    language: 'Preferred language',
    registered: 'Registered',
    lastLogin: 'Last login',
    yes: 'Yes',
    no: 'No',
    masterProfile: 'Master Profile',
    description: 'Description',
    experience: 'Years of experience',
    city: 'City',
    category: 'Category',
    whatsapp: 'WhatsApp',
    leads: 'Leads',
    reviews: 'Reviews',
    bookings: 'Bookings',
    loginHistory: 'Login History',
    notifications: 'Notifications',
    consents: 'Data Processing Consents',
    consentType: 'Type',
    consentGranted: 'Granted',
    consentVersion: 'Version',
    consentRevoked: 'Revoked',
    noData: 'No data',
    status: 'Status',
    message: 'Message',
    rating: 'Rating',
    date: 'Date',
    ip: 'IP address',
    browser: 'Browser',
    location: 'Location',
    success: 'Success',
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    CLOSED: 'Closed',
    SPAM: 'Spam',
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    VISIBLE: 'Visible',
    HIDDEN: 'Hidden',
    IN_APP: 'In-app',
    EMAIL: 'Email',
    SMS: 'SMS',
    PUSH: 'Push',
    andMore: 'and {count} more',
  },
  ru: {
    title: 'Экспорт персональных данных',
    subtitle: 'GDPR ст. 20 — Право на переносимость',
    generated: 'Сформировано',
    profile: 'Профиль',
    email: 'Email',
    phone: 'Телефон',
    name: 'Имя',
    role: 'Роль',
    verified: 'Верифицирован',
    language: 'Язык',
    registered: 'Регистрация',
    lastLogin: 'Последний вход',
    yes: 'Да',
    no: 'Нет',
    masterProfile: 'Профиль мастера',
    description: 'Описание',
    experience: 'Опыт (лет)',
    city: 'Город',
    category: 'Категория',
    whatsapp: 'WhatsApp',
    leads: 'Лиды',
    reviews: 'Отзывы',
    bookings: 'Записи',
    loginHistory: 'История входов',
    notifications: 'Уведомления',
    consents: 'Согласия на обработку данных',
    consentType: 'Тип',
    consentGranted: 'Дано',
    consentVersion: 'Версия',
    consentRevoked: 'Отозвано',
    noData: 'Нет данных',
    status: 'Статус',
    message: 'Сообщение',
    rating: 'Рейтинг',
    date: 'Дата',
    ip: 'IP-адрес',
    browser: 'Браузер',
    location: 'Местоположение',
    success: 'Успех',
    NEW: 'Новый',
    IN_PROGRESS: 'В работе',
    CLOSED: 'Закрыт',
    SPAM: 'Спам',
    PENDING: 'Ожидает',
    CONFIRMED: 'Подтверждено',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
    VISIBLE: 'Опубликовано',
    HIDDEN: 'Скрыто',
    IN_APP: 'В приложении',
    EMAIL: 'Email',
    SMS: 'SMS',
    PUSH: 'Push',
    andMore: 'и ещё {count}',
  },
  ro: {
    title: 'Export date personale',
    subtitle: 'GDPR Art. 20 — Portabilitate date',
    generated: 'Generat',
    profile: 'Profil',
    email: 'Email',
    phone: 'Telefon',
    name: 'Nume',
    role: 'Rol',
    verified: 'Verificat',
    language: 'Limbă preferată',
    registered: 'Înregistrat',
    lastLogin: 'Ultima autentificare',
    yes: 'Da',
    no: 'Nu',
    masterProfile: 'Profil master',
    description: 'Descriere',
    experience: 'Ani experiență',
    city: 'Oraș',
    category: 'Categorie',
    whatsapp: 'WhatsApp',
    leads: 'Lead-uri',
    reviews: 'Recenzii',
    bookings: 'Rezervări',
    loginHistory: 'Istoric autentificări',
    notifications: 'Notificări',
    consents: 'Consimțăminte pentru prelucrarea datelor',
    consentType: 'Tip',
    consentGranted: 'Acordat',
    consentVersion: 'Versiune',
    consentRevoked: 'Revocat',
    noData: 'Fără date',
    status: 'Status',
    message: 'Mesaj',
    rating: 'Evaluare',
    date: 'Data',
    ip: 'Adresă IP',
    browser: 'Browser',
    location: 'Locație',
    success: 'Succes',
    NEW: 'Nou',
    IN_PROGRESS: 'În lucru',
    CLOSED: 'Închis',
    SPAM: 'Spam',
    PENDING: 'În așteptare',
    CONFIRMED: 'Confirmat',
    COMPLETED: 'Finalizat',
    CANCELLED: 'Anulat',
    VISIBLE: 'Vizibil',
    HIDDEN: 'Ascuns',
    IN_APP: 'În aplicație',
    EMAIL: 'Email',
    SMS: 'SMS',
    PUSH: 'Push',
    andMore: 'și încă {count}',
  },
};

function getLabels(locale: string): (typeof LABELS)['en'] {
  const lang = locale?.toLowerCase().startsWith('ru')
    ? 'ru'
    : locale?.toLowerCase().startsWith('ro')
      ? 'ro'
      : 'en';
  return LABELS[lang] ?? LABELS.en;
}

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
  value: string | number | null | undefined,
  x: number,
  y: number,
): number {
  const val = value == null ? '—' : String(value);
  doc.fontSize(10).fillColor(COLORS.textMuted).text(`${label}: `, x, y, {
    continued: true,
    width: 140,
  });
  doc.fillColor(COLORS.text).text(val);
  return doc.y;
}

function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };
    return d.toLocaleString(
      locale === 'ru' ? 'ru-RU' : locale === 'ro' ? 'ro-RO' : 'en-US',
      opts,
    );
  } catch {
    return iso;
  }
}

export function buildPersonalDataPdf(
  doc: Doc,
  data: PersonalDataPdfData,
  locale: string = 'en',
): void {
  const t = getLabels(locale);
  const translateStatus = (s: string) => t[s] ?? s;

  registerPdfFont(doc);

  const margin = 50;
  const pageWidth = 595;
  const contentWidth = pageWidth - margin * 2;
  let y = 110;

  // Шапка
  doc.rect(0, 0, pageWidth, 90).fill(COLORS.primary);
  doc.fontSize(22).fillColor(COLORS.white).text(t.title, margin, 28, {
    align: 'center',
    width: contentWidth,
  });
  doc
    .fontSize(11)
    .fillColor('rgba(255,255,255,0.9)')
    .text(t.subtitle, margin, 52, { align: 'center', width: contentWidth });
  doc
    .fontSize(10)
    .fillColor('rgba(255,255,255,0.85)')
    .text(
      `${t.generated}: ${formatDate(data.exportDate, locale)}`,
      margin,
      68,
      { align: 'center', width: contentWidth },
    );

  // Раздел профиля
  y = drawSectionHeader(doc, t.profile, y);
  const fullName = formatUserName(data.user.firstName, data.user.lastName, '—');
  const profileItems: [string, string | number | null | undefined][] = [
    [t.name, fullName],
    [t.email, data.user.email],
    [t.phone, data.user.phone],
    [t.role, data.user.role],
    [t.verified, data.user.isVerified ? t.yes : t.no],
    [t.language, data.user.preferredLanguage ?? '—'],
    [t.registered, formatDate(data.user.createdAt, locale)],
    [
      t.lastLogin,
      data.user.lastLoginAt ? formatDate(data.user.lastLoginAt, locale) : '—',
    ],
  ];
  for (const [label, value] of profileItems) {
    y = drawKeyValue(doc, label, value, margin, y);
    y += 6;
  }
  y += 12;

  // Профиль мастера (если есть)
  if (data.masterProfile) {
    y = drawSectionHeader(doc, t.masterProfile, y);
    const mp = data.masterProfile;
    const mpItems: [string, string | number | null | undefined][] = [
      [t.description, mp.description || '—'],
      [t.experience, mp.experienceYears],
      [t.city, mp.cityName ?? '—'],
      [t.category, mp.categoryName ?? '—'],
      [t.whatsapp, mp.whatsappPhone ?? '—'],
      [t.date, formatDate(mp.createdAt, locale)],
    ];
    for (const [label, value] of mpItems) {
      y = drawKeyValue(doc, label, value, margin, y);
      y += 6;
    }
    y += 12;
  }

  // Заявки (лиды)
  y = drawSectionHeader(doc, t.leads, y);
  if (data.leads.length > 0) {
    for (let i = 0; i < data.leads.length; i++) {
      const lead = data.leads[i];
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.fontSize(10).fillColor(COLORS.text);
      doc.text(`#${i + 1} — ${formatDate(lead.createdAt, locale)}`, margin, y);
      y += 12;
      doc.fontSize(9).fillColor(COLORS.textMuted);
      doc.text(
        `${t.status}: ${translateStatus(lead.status)} | ${t.phone}: ${lead.clientPhone}`,
        margin,
        y,
        { width: contentWidth },
      );
      y += 10;
      doc.fillColor(COLORS.text);
      doc.text(lead.message || '—', margin, y, { width: contentWidth });
      y += 20;
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 20;
  }

  // Отзывы
  y = drawSectionHeader(doc, t.reviews, y);
  if (data.reviews.length > 0) {
    for (let i = 0; i < data.reviews.length; i++) {
      const r = data.reviews[i];
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.fontSize(10).fillColor(COLORS.text);
      doc.text(
        `#${i + 1} — ${t.rating}: ${r.rating} | ${formatDate(r.createdAt, locale)}`,
        margin,
        y,
      );
      y += 10;
      doc.fontSize(9).fillColor(COLORS.text);
      doc.text(r.comment || '—', margin, y, { width: contentWidth });
      y += 18;
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 20;
  }

  // Бронирования
  y = drawSectionHeader(doc, t.bookings, y);
  if (data.bookings.length > 0) {
    for (let i = 0; i < data.bookings.length; i++) {
      const b = data.bookings[i];
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.fontSize(10).fillColor(COLORS.text);
      doc.text(
        `#${i + 1} — ${formatDate(b.startTime, locale)} — ${translateStatus(b.status)}`,
        margin,
        y,
        { width: contentWidth },
      );
      y += 12;
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 20;
  }

  // История входов
  y = drawSectionHeader(doc, t.loginHistory, y);
  if (data.loginHistory.length > 0) {
    for (let i = 0; i < data.loginHistory.length; i++) {
      const h = data.loginHistory[i];
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.fontSize(9).fillColor(COLORS.text);
      doc.text(
        `${formatDate(h.createdAt, locale)} | ${t.ip}: ${h.ipAddress ?? '—'} | ${t.success}: ${h.success ? t.yes : t.no}`,
        margin,
        y,
        { width: contentWidth },
      );
      y += 12;
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 20;
  }

  // Уведомления
  y = drawSectionHeader(doc, t.notifications, y);
  if (data.notifications.length > 0) {
    for (let i = 0; i < Math.min(data.notifications.length, 50); i++) {
      const n = data.notifications[i];
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.fontSize(9).fillColor(COLORS.text);
      doc.text(
        `${formatDate(n.createdAt, locale)} [${translateStatus(n.type)}]: ${n.message}`,
        margin,
        y,
        { width: contentWidth },
      );
      y += 11;
    }
    if (data.notifications.length > 50) {
      doc
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(
          `... ${(t.andMore ?? 'and {count} more').replace('{count}', String(data.notifications.length - 50))}`,
          margin,
          y,
        );
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
    y += 20;
  }

  // Согласия
  y = drawSectionHeader(doc, t.consents ?? 'Consents', y);
  if (data.consents && data.consents.length > 0) {
    for (const c of data.consents) {
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      const grantedLabel = c.granted ? (t.yes ?? 'Yes') : (t.no ?? 'No');
      const revokedLabel = c.revokedAt
        ? `${t.consentRevoked ?? 'Revoked'}: ${formatDate(c.revokedAt, locale)}`
        : '';
      doc.fontSize(9).fillColor(COLORS.text);
      doc.text(
        `${formatDate(c.createdAt, locale)} — ${c.consentType} (v${c.version}) — ${t.consentGranted ?? 'Granted'}: ${grantedLabel}${revokedLabel ? ` | ${revokedLabel}` : ''}`,
        margin,
        y,
        { width: contentWidth },
      );
      y += 12;
    }
  } else {
    doc.fontSize(10).fillColor(COLORS.textMuted).text(t.noData, margin, y);
  }

  doc.fillColor(COLORS.text);
}
