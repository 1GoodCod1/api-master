import path from 'path';
import type PDFDocument from 'pdfkit';

const COLORS = {
  primary: '#0f766e',
  primaryLight: '#e6f7f6',
  accent: '#dc2626',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
} as const;

type Doc = InstanceType<typeof PDFDocument>;

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

const LABELS: Record<string, Record<string, string>> = {
  en: {
    title: 'Data Protection Impact Assessment',
    subtitle: 'GDPR Article 35 — DPIA Report',
    generated: 'Generated',
    organization: 'Organization',
    dpo: 'Data Protection Officer',
    dpoContact: 'DPO Contact',

    section1: '1. Description of Processing Operations',
    processingDesc:
      'The platform "MasterHub" is a marketplace connecting service masters with clients. The system processes personal data to facilitate service discovery, booking, payment processing, and quality assurance through reviews.',
    dataCategories: 'Categories of Personal Data Processed',
    cat_identity: 'Identity data — full name, email, phone number',
    cat_auth:
      'Authentication data — hashed passwords, login history, IP addresses, user agents',
    cat_financial: 'Financial data — payment records, transaction history',
    cat_professional:
      'Professional data — master profiles, experience, service descriptions',
    cat_communication: 'Communication data — lead messages, review texts',
    cat_documents:
      'Identity documents — passport/ID photos for master verification (high-risk)',
    cat_location: 'Location data — city preferences',
    cat_consent:
      'Consent records — consent type, timestamps, IP at consent time',

    section2: '2. Purpose and Legal Basis',
    purpose: 'Purpose',
    legalBasis: 'Legal Basis',
    purpose_service: 'Service delivery (marketplace functionality)',
    basis_service: 'Art. 6(1)(b) — Contract performance',
    purpose_verification: 'Master identity verification',
    basis_verification:
      'Art. 6(1)(f) — Legitimate interest (platform trust & safety)',
    purpose_payments: 'Payment processing',
    basis_payments: 'Art. 6(1)(b) — Contract performance',
    purpose_marketing: 'Digest and marketing communications',
    basis_marketing: 'Art. 6(1)(a) — Consent',
    purpose_security: 'Platform security and fraud prevention',
    basis_security: 'Art. 6(1)(f) — Legitimate interest',
    purpose_analytics: 'Service improvement analytics',
    basis_analytics: 'Art. 6(1)(f) — Legitimate interest',

    section3: '3. Necessity and Proportionality Assessment',
    necessityDesc:
      'All data collection is limited to what is strictly necessary for the stated purposes. Data minimization is enforced at the schema level — only required fields are collected.',
    retentionTitle: 'Retention Periods',
    retention_active: 'Active account data — retained while account is active',
    retention_deleted: 'Deleted account data — purged within 30 days',
    retention_logs: 'Login/audit logs — 90 days',
    retention_documents:
      'Verification document files — deleted shortly after approval (verification fact retained)',
    retention_payments: 'Financial records — 5 years (legal requirement)',
    retention_consents:
      'Consent records — retained for duration of processing + 3 years',

    section4: '4. Risk Assessment',
    riskTitle: 'Identified Risks and Mitigation Measures',
    risk: 'Risk',
    likelihood: 'Likelihood',
    impact: 'Impact',
    mitigation: 'Mitigation',
    risk_breach: 'Unauthorized access to personal data',
    risk_breach_l: 'Low',
    risk_breach_i: 'High',
    risk_breach_m:
      'Encryption at rest/transit, JWT auth, rate limiting, audit logging',
    risk_documents: 'Identity document leakage',
    risk_documents_l: 'Low',
    risk_documents_i: 'Very High',
    risk_documents_m:
      'Encrypted storage, auto-deletion after verification, access restricted to admins',
    risk_consent: 'Processing without valid consent',
    risk_consent_l: 'Very Low',
    risk_consent_i: 'Medium',
    risk_consent_m:
      'Consent management system with versioning, audit trail, revocation support',
    risk_availability: 'Service unavailability / data loss',
    risk_availability_l: 'Low',
    risk_availability_i: 'Medium',
    risk_availability_m:
      'Automated backups, Redis caching, health monitoring, Prometheus metrics',

    section5: '5. Technical and Organizational Measures (Art. 32)',
    measureCategory: 'Category',
    measureDescription: 'Measure',
    m_encryption: 'Encryption',
    m_encryption_d:
      'TLS 1.3 in transit; AES-256 encryption for sensitive fields at rest; bcrypt password hashing',
    m_access: 'Access Control',
    m_access_d:
      'Role-based access (ADMIN, MASTER, CLIENT); JWT + refresh token rotation; 2FA available',
    m_audit: 'Audit Logging',
    m_audit_d:
      'Comprehensive audit trail for all data modifications; login history tracking; IP logging',
    m_rateLimit: 'Rate Limiting',
    m_rateLimit_d:
      'Throttle protection on all endpoints; Redis-backed distributed rate limiting in production',
    m_backup: 'Backup & Recovery',
    m_backup_d:
      'Automated database backups; admin-triggered manual backups; encrypted backup storage',
    m_monitoring: 'Monitoring',
    m_monitoring_d:
      'Prometheus metrics; health checks via Terminus; real-time WebSocket monitoring',
    m_minimization: 'Data Minimization',
    m_minimization_d:
      'Schema-level enforcement; auto-deletion of verification documents; configurable retention',
    m_consent: 'Consent Management',
    m_consent_d:
      'Granular consent types with versioning; revocation support; IP/timestamp logging',

    section6: '6. Data Subject Rights',
    rightsDesc:
      'The platform implements the following GDPR data subject rights:',
    right_access:
      'Right of access (Art. 15) — Personal data export in PDF format',
    right_rectification:
      'Right to rectification (Art. 16) — Profile editing functionality',
    right_erasure:
      'Right to erasure (Art. 17) — Account self-deletion with cascade purge',
    right_portability:
      'Right to data portability (Art. 20) — Structured PDF data export',
    right_objection: 'Right to object (Art. 21) — Consent revocation mechanism',
    right_restriction:
      'Right to restriction (Art. 18) — Account deactivation option',

    section7: '7. Current Platform Statistics',
    statLabel: 'Metric',
    statValue: 'Value',
    stat_users: 'Total registered users',
    stat_masters: 'Registered masters',
    stat_leads: 'Total leads processed',
    stat_bookings: 'Total bookings',
    stat_reviews: 'Total reviews',
    stat_documents: 'Verification documents processed',
    stat_consents: 'Consent records stored',

    section8: '8. Conclusion',
    conclusionText:
      'Based on this assessment, the residual risk level after implementation of all technical and organizational measures is ACCEPTABLE. The processing operations are necessary, proportionate, and adequately protected. The DPIA will be reviewed annually or when significant changes to processing occur.',
    approvedBy: 'Approved by',
    date: 'Date',
  },
  ru: {
    title: 'Оценка воздействия на защиту данных',
    subtitle: 'GDPR Статья 35 — Отчёт DPIA',
    generated: 'Сформировано',
    organization: 'Организация',
    dpo: 'Ответственный за защиту данных (DPO)',
    dpoContact: 'Контакт DPO',

    section1: '1. Описание операций по обработке',
    processingDesc:
      'Платформа «MasterHub» — это маркетплейс, соединяющий мастеров по оказанию услуг с клиентами. Система обрабатывает персональные данные для поиска услуг, бронирования, обработки платежей и обеспечения качества через отзывы.',
    dataCategories: 'Категории обрабатываемых персональных данных',
    cat_identity: 'Идентификационные данные — ФИО, email, телефон',
    cat_auth:
      'Данные аутентификации — хеши паролей, история входов, IP-адреса, user-agent',
    cat_financial: 'Финансовые данные — записи о платежах, история транзакций',
    cat_professional:
      'Профессиональные данные — профили мастеров, опыт, описания услуг',
    cat_communication:
      'Коммуникационные данные — сообщения заявок, тексты отзывов',
    cat_documents:
      'Документы, удостоверяющие личность — фото паспорта/ID для верификации мастеров (высокий риск)',
    cat_location: 'Данные о местоположении — предпочтения по городу',
    cat_consent:
      'Записи согласий — тип согласия, временные метки, IP на момент согласия',

    section2: '2. Цели и правовые основания',
    purpose: 'Цель',
    legalBasis: 'Правовое основание',
    purpose_service: 'Оказание услуг (функционал маркетплейса)',
    basis_service: 'Ст. 6(1)(b) — Исполнение договора',
    purpose_verification: 'Верификация личности мастеров',
    basis_verification:
      'Ст. 6(1)(f) — Законный интерес (доверие и безопасность платформы)',
    purpose_payments: 'Обработка платежей',
    basis_payments: 'Ст. 6(1)(b) — Исполнение договора',
    purpose_marketing: 'Дайджест и маркетинговые рассылки',
    basis_marketing: 'Ст. 6(1)(a) — Согласие',
    purpose_security: 'Безопасность платформы и предотвращение мошенничества',
    basis_security: 'Ст. 6(1)(f) — Законный интерес',
    purpose_analytics: 'Аналитика для улучшения сервиса',
    basis_analytics: 'Ст. 6(1)(f) — Законный интерес',

    section3: '3. Оценка необходимости и пропорциональности',
    necessityDesc:
      'Сбор данных ограничен строго необходимым для заявленных целей. Минимизация данных реализована на уровне схемы БД — собираются только обязательные поля.',
    retentionTitle: 'Сроки хранения',
    retention_active:
      'Данные активного аккаунта — хранятся пока аккаунт активен',
    retention_deleted:
      'Данные удалённого аккаунта — удаляются в течение 30 дней',
    retention_logs: 'Логи входа/аудита — 90 дней',
    retention_documents:
      'Файлы документов верификации — удаляются вскоре после одобрения (факт верификации сохраняется)',
    retention_payments: 'Финансовые записи — 5 лет (требование закона)',
    retention_consents:
      'Записи согласий — хранятся на время обработки + 3 года',

    section4: '4. Оценка рисков',
    riskTitle: 'Выявленные риски и меры по снижению',
    risk: 'Риск',
    likelihood: 'Вероятность',
    impact: 'Воздействие',
    mitigation: 'Меры снижения',
    risk_breach: 'Несанкционированный доступ к персональным данным',
    risk_breach_l: 'Низкая',
    risk_breach_i: 'Высокое',
    risk_breach_m:
      'Шифрование at rest/transit, JWT аутентификация, rate-limiting, аудит-логирование',
    risk_documents: 'Утечка документов, удостоверяющих личность',
    risk_documents_l: 'Низкая',
    risk_documents_i: 'Очень высокое',
    risk_documents_m:
      'Шифрованное хранилище, автоудаление после верификации, доступ только для админов',
    risk_consent: 'Обработка без действительного согласия',
    risk_consent_l: 'Очень низкая',
    risk_consent_i: 'Среднее',
    risk_consent_m:
      'Система управления согласиями с версионированием, журналом аудита, поддержкой отзыва',
    risk_availability: 'Недоступность сервиса / потеря данных',
    risk_availability_l: 'Низкая',
    risk_availability_i: 'Среднее',
    risk_availability_m:
      'Автоматические бэкапы, Redis-кеширование, мониторинг здоровья, Prometheus-метрики',

    section5: '5. Технические и организационные меры (Ст. 32)',
    measureCategory: 'Категория',
    measureDescription: 'Мера',
    m_encryption: 'Шифрование',
    m_encryption_d:
      'TLS 1.3 при передаче; AES-256 шифрование чувствительных полей; bcrypt-хеширование паролей',
    m_access: 'Контроль доступа',
    m_access_d:
      'Ролевой доступ (ADMIN, MASTER, CLIENT); JWT + ротация refresh-токенов; 2FA доступна',
    m_audit: 'Аудит-логирование',
    m_audit_d:
      'Полный журнал аудита для всех изменений данных; история входов; логирование IP',
    m_rateLimit: 'Ограничение частоты запросов',
    m_rateLimit_d:
      'Throttle-защита на всех эндпоинтах; Redis-backed распределённый rate-limiting в продакшене',
    m_backup: 'Резервное копирование',
    m_backup_d:
      'Автоматические бэкапы БД; ручные бэкапы по требованию; шифрованное хранение бэкапов',
    m_monitoring: 'Мониторинг',
    m_monitoring_d:
      'Prometheus-метрики; проверки здоровья через Terminus; WebSocket мониторинг в реальном времени',
    m_minimization: 'Минимизация данных',
    m_minimization_d:
      'Контроль на уровне схемы; автоудаление документов верификации; настраиваемые сроки хранения',
    m_consent: 'Управление согласиями',
    m_consent_d:
      'Гранулярные типы согласий с версионированием; поддержка отзыва; логирование IP/временных меток',

    section6: '6. Права субъектов данных',
    rightsDesc: 'Платформа реализует следующие права субъектов данных по GDPR:',
    right_access:
      'Право на доступ (Ст. 15) — Экспорт персональных данных в PDF',
    right_rectification:
      'Право на исправление (Ст. 16) — Редактирование профиля',
    right_erasure:
      'Право на удаление (Ст. 17) — Самоудаление аккаунта с каскадной очисткой',
    right_portability:
      'Право на переносимость (Ст. 20) — Структурированный экспорт в PDF',
    right_objection: 'Право на возражение (Ст. 21) — Механизм отзыва согласия',
    right_restriction:
      'Право на ограничение (Ст. 18) — Возможность деактивации аккаунта',

    section7: '7. Текущая статистика платформы',
    statLabel: 'Метрика',
    statValue: 'Значение',
    stat_users: 'Всего зарегистрированных пользователей',
    stat_masters: 'Зарегистрированных мастеров',
    stat_leads: 'Всего обработанных заявок',
    stat_bookings: 'Всего бронирований',
    stat_reviews: 'Всего отзывов',
    stat_documents: 'Обработано документов верификации',
    stat_consents: 'Сохранено записей согласий',

    section8: '8. Заключение',
    conclusionText:
      'На основании данной оценки, остаточный уровень риска после внедрения всех технических и организационных мер является ПРИЕМЛЕМЫМ. Операции обработки необходимы, пропорциональны и надлежащим образом защищены. DPIA будет пересмотрена ежегодно или при существенных изменениях в обработке.',
    approvedBy: 'Утверждено',
    date: 'Дата',
  },
  ro: {
    title: 'Evaluarea impactului asupra protecției datelor',
    subtitle: 'GDPR Articolul 35 — Raport DPIA',
    generated: 'Generat',
    organization: 'Organizație',
    dpo: 'Responsabil cu protecția datelor (DPO)',
    dpoContact: 'Contact DPO',

    section1: '1. Descrierea operațiunilor de prelucrare',
    processingDesc:
      'Platforma „MasterHub" este un marketplace care conectează meșterii cu clienții. Sistemul prelucrează date personale pentru găsirea serviciilor, rezervare, procesarea plăților și asigurarea calității prin recenzii.',
    dataCategories: 'Categorii de date personale prelucrate',
    cat_identity: 'Date de identificare — nume, email, telefon',
    cat_auth:
      'Date de autentificare — hash-uri parole, istoric autentificări, adrese IP, user-agent',
    cat_financial: 'Date financiare — înregistrări plăți, istoric tranzacții',
    cat_professional:
      'Date profesionale — profiluri meșteri, experiență, descrieri servicii',
    cat_communication: 'Date de comunicare — mesaje cereri, texte recenzii',
    cat_documents:
      'Documente de identitate — fotografii pașaport/buletin pentru verificarea meșterilor (risc ridicat)',
    cat_location: 'Date de localizare — preferințe oraș',
    cat_consent:
      'Înregistrări consimțământ — tip, marcaje temporale, IP la momentul consimțământului',

    section2: '2. Scopuri și temeiuri juridice',
    purpose: 'Scop',
    legalBasis: 'Temei juridic',
    purpose_service: 'Prestarea serviciilor (funcționalitatea marketplace)',
    basis_service: 'Art. 6(1)(b) — Executarea contractului',
    purpose_verification: 'Verificarea identității meșterilor',
    basis_verification:
      'Art. 6(1)(f) — Interes legitim (încredere și siguranță platformă)',
    purpose_payments: 'Procesarea plăților',
    basis_payments: 'Art. 6(1)(b) — Executarea contractului',
    purpose_marketing: 'Digest și comunicări de marketing',
    basis_marketing: 'Art. 6(1)(a) — Consimțământ',
    purpose_security: 'Securitatea platformei și prevenirea fraudei',
    basis_security: 'Art. 6(1)(f) — Interes legitim',
    purpose_analytics: 'Analitica pentru îmbunătățirea serviciului',
    basis_analytics: 'Art. 6(1)(f) — Interes legitim',

    section3: '3. Evaluarea necesității și proporționalității',
    necessityDesc:
      'Colectarea datelor este limitată la strictul necesar pentru scopurile declarate. Minimizarea datelor este impusă la nivel de schemă — se colectează doar câmpurile obligatorii.',
    retentionTitle: 'Perioade de retenție',
    retention_active: 'Date cont activ — păstrate cât contul este activ',
    retention_deleted: 'Date cont șters — șterse în 30 de zile',
    retention_logs: 'Loguri autentificare/audit — 90 de zile',
    retention_documents:
      'Fișiere documente verificare — șterse la scurt timp după aprobare (faptul verificării se păstrează)',
    retention_payments: 'Înregistrări financiare — 5 ani (cerință legală)',
    retention_consents:
      'Înregistrări consimțământ — păstrate pe durata prelucrării + 3 ani',

    section4: '4. Evaluarea riscurilor',
    riskTitle: 'Riscuri identificate și măsuri de atenuare',
    risk: 'Risc',
    likelihood: 'Probabilitate',
    impact: 'Impact',
    mitigation: 'Atenuare',
    risk_breach: 'Acces neautorizat la date personale',
    risk_breach_l: 'Scăzută',
    risk_breach_i: 'Ridicat',
    risk_breach_m:
      'Criptare at rest/transit, autentificare JWT, rate-limiting, audit-logging',
    risk_documents: 'Scurgere documente de identitate',
    risk_documents_l: 'Scăzută',
    risk_documents_i: 'Foarte ridicat',
    risk_documents_m:
      'Stocare criptată, ștergere automată după verificare, acces restricționat la admini',
    risk_consent: 'Prelucrare fără consimțământ valid',
    risk_consent_l: 'Foarte scăzută',
    risk_consent_i: 'Mediu',
    risk_consent_m:
      'Sistem gestionare consimțăminte cu versionare, jurnal audit, suport revocare',
    risk_availability: 'Indisponibilitate serviciu / pierdere date',
    risk_availability_l: 'Scăzută',
    risk_availability_i: 'Mediu',
    risk_availability_m:
      'Backup-uri automate, cache Redis, monitorizare sănătate, metrici Prometheus',

    section5: '5. Măsuri tehnice și organizatorice (Art. 32)',
    measureCategory: 'Categorie',
    measureDescription: 'Măsura',
    m_encryption: 'Criptare',
    m_encryption_d:
      'TLS 1.3 în tranzit; criptare AES-256 câmpuri sensibile; hashing bcrypt parole',
    m_access: 'Control acces',
    m_access_d:
      'Acces bazat pe roluri (ADMIN, MASTER, CLIENT); JWT + rotație refresh token; 2FA disponibil',
    m_audit: 'Jurnal audit',
    m_audit_d:
      'Jurnal complet audit pentru toate modificările de date; istoric autentificări; logare IP',
    m_rateLimit: 'Limitare rată cereri',
    m_rateLimit_d:
      'Protecție throttle pe toate endpoint-urile; rate-limiting distribuit Redis în producție',
    m_backup: 'Backup și recuperare',
    m_backup_d:
      'Backup-uri automate bază de date; backup-uri manuale la cerere; stocare criptată backup-uri',
    m_monitoring: 'Monitorizare',
    m_monitoring_d:
      'Metrici Prometheus; verificări sănătate Terminus; monitorizare WebSocket în timp real',
    m_minimization: 'Minimizarea datelor',
    m_minimization_d:
      'Control la nivel schemă; ștergere automată documente verificare; retenție configurabilă',
    m_consent: 'Gestionare consimțăminte',
    m_consent_d:
      'Tipuri granulare consimțământ cu versionare; suport revocare; logare IP/timestamp',

    section6: '6. Drepturile subiecților de date',
    rightsDesc:
      'Platforma implementează următoarele drepturi GDPR ale subiecților de date:',
    right_access:
      'Dreptul de acces (Art. 15) — Export date personale în format PDF',
    right_rectification:
      'Dreptul la rectificare (Art. 16) — Funcționalitate editare profil',
    right_erasure:
      'Dreptul la ștergere (Art. 17) — Auto-ștergere cont cu purjare cascadă',
    right_portability:
      'Dreptul la portabilitate (Art. 20) — Export structurat PDF',
    right_objection:
      'Dreptul la obiecție (Art. 21) — Mecanism revocare consimțământ',
    right_restriction:
      'Dreptul la restricție (Art. 18) — Opțiune dezactivare cont',

    section7: '7. Statistici curente platformă',
    statLabel: 'Metrică',
    statValue: 'Valoare',
    stat_users: 'Total utilizatori înregistrați',
    stat_masters: 'Meșteri înregistrați',
    stat_leads: 'Total cereri procesate',
    stat_bookings: 'Total rezervări',
    stat_reviews: 'Total recenzii',
    stat_documents: 'Documente verificare procesate',
    stat_consents: 'Înregistrări consimțământ stocate',

    section8: '8. Concluzie',
    conclusionText:
      'Pe baza acestei evaluări, nivelul de risc rezidual după implementarea tuturor măsurilor tehnice și organizatorice este ACCEPTABIL. Operațiunile de prelucrare sunt necesare, proporționale și protejate adecvat. DPIA va fi revizuit anual sau la modificări semnificative ale prelucrării.',
    approvedBy: 'Aprobat de',
    date: 'Data',
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

function ensureSpace(doc: Doc, needed: number, margin: number): number {
  if (doc.y + needed > 750) {
    doc.addPage();
    return margin;
  }
  return doc.y;
}

function drawSectionHeader(doc: Doc, text: string, y: number): number {
  y = ensureSpace(doc, 40, 50);
  doc
    .fontSize(14)
    .fillColor(COLORS.primary)
    .text(text, 50, y, { continued: false });
  doc.moveDown(0.5);
  return doc.y;
}

function drawParagraph(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
): number {
  y = ensureSpace(doc, 30, 50);
  doc.fontSize(10).fillColor(COLORS.text).text(text, x, y, { width });
  return doc.y;
}

function drawBullet(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
): number {
  y = ensureSpace(doc, 16, 50);
  doc
    .fontSize(10)
    .fillColor(COLORS.textMuted)
    .text('•', x, y, { continued: false });
  doc.fillColor(COLORS.text).text(text, x + 14, y, { width: width - 14 });
  return doc.y;
}

function drawTableRow(
  doc: Doc,
  cols: string[],
  widths: number[],
  x: number,
  y: number,
  isHeader: boolean,
): number {
  y = ensureSpace(doc, 24, 50);
  const fontSize = isHeader ? 9 : 9;
  const color = isHeader ? COLORS.primary : COLORS.text;
  let cx = x;
  for (let i = 0; i < cols.length; i++) {
    doc.fontSize(fontSize).fillColor(color);
    if (isHeader) {
      doc.text(cols[i].toUpperCase(), cx, y, { width: widths[i] });
    } else {
      doc.text(cols[i], cx, y, { width: widths[i] });
    }
    cx += widths[i];
  }
  doc
    .moveTo(x, doc.y + 2)
    .lineTo(x + widths.reduce((a, b) => a + b, 0), doc.y + 2)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
  return doc.y + 6;
}

export function buildDpiaPdf(
  doc: Doc,
  data: DpiaContext,
  locale: string = 'en',
): void {
  const t = getLabels(locale);
  registerPdfFont(doc);

  const margin = 50;
  const pageWidth = 595;
  const contentWidth = pageWidth - margin * 2;

  // Header banner
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
  const localeStr =
    locale === 'ru' ? 'ru-RU' : locale === 'ro' ? 'ro-RO' : 'en-US';
  doc.fontSize(9).fillColor('rgba(255,255,255,0.8)');
  doc.text(
    `${t.generated}: ${new Date().toLocaleString(localeStr)} | ${t.organization}: ${data.organizationName}`,
    margin,
    68,
    { align: 'center', width: contentWidth },
  );
  doc.text(
    `${t.dpo}: ${data.dpoName} | ${t.dpoContact}: ${data.dpoEmail}`,
    margin,
    82,
    {
      align: 'center',
      width: contentWidth,
    },
  );

  let y = 120;

  // Section 1: Description
  y = drawSectionHeader(doc, t.section1, y);
  y = drawParagraph(doc, t.processingDesc, margin, y, contentWidth);
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
    y = drawBullet(doc, cat, margin + 10, y, contentWidth - 10);
    y += 2;
  }
  y += 10;

  // Section 2: Purpose & Legal Basis
  y = drawSectionHeader(doc, t.section2, y);
  const purposes = [
    [t.purpose_service, t.basis_service],
    [t.purpose_verification, t.basis_verification],
    [t.purpose_payments, t.basis_payments],
    [t.purpose_marketing, t.basis_marketing],
    [t.purpose_security, t.basis_security],
    [t.purpose_analytics, t.basis_analytics],
  ];
  const purposeWidths = [contentWidth * 0.45, contentWidth * 0.55];
  y = drawTableRow(
    doc,
    [t.purpose, t.legalBasis],
    purposeWidths,
    margin,
    y,
    true,
  );
  for (const [purpose, basis] of purposes) {
    y = drawTableRow(doc, [purpose, basis], purposeWidths, margin, y, false);
  }
  y += 10;

  // Section 3: Necessity & Proportionality
  y = drawSectionHeader(doc, t.section3, y);
  y = drawParagraph(doc, t.necessityDesc, margin, y, contentWidth);
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
    y = drawBullet(doc, ret, margin + 10, y, contentWidth - 10);
    y += 2;
  }
  y += 10;

  // Section 4: Risk Assessment
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
    margin,
    y,
    true,
  );

  const risks = [
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
    y = drawTableRow(doc, row, riskWidths, margin, y, false);
  }
  y += 10;

  // Section 5: Technical Measures
  y = drawSectionHeader(doc, t.section5, y);
  const measureWidths = [contentWidth * 0.25, contentWidth * 0.75];
  y = drawTableRow(
    doc,
    [t.measureCategory, t.measureDescription],
    measureWidths,
    margin,
    y,
    true,
  );

  const measures = [
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
    y = drawTableRow(doc, row, measureWidths, margin, y, false);
  }
  y += 10;

  // Section 6: Data Subject Rights
  y = drawSectionHeader(doc, t.section6, y);
  y = drawParagraph(doc, t.rightsDesc, margin, y, contentWidth);
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
    y = drawBullet(doc, right, margin + 10, y, contentWidth - 10);
    y += 2;
  }
  y += 10;

  // Section 7: Platform Statistics
  y = drawSectionHeader(doc, t.section7, y);
  const statWidths = [contentWidth * 0.65, contentWidth * 0.35];
  y = drawTableRow(
    doc,
    [t.statLabel, t.statValue],
    statWidths,
    margin,
    y,
    true,
  );

  const stats = [
    [t.stat_users, String(data.totalUsers)],
    [t.stat_masters, String(data.totalMasters)],
    [t.stat_leads, String(data.totalLeads)],
    [t.stat_bookings, String(data.totalBookings)],
    [t.stat_reviews, String(data.totalReviews)],
    [t.stat_documents, String(data.verifiedDocumentsCount)],
    [t.stat_consents, String(data.consentsCount)],
  ];
  for (const row of stats) {
    y = drawTableRow(doc, row, statWidths, margin, y, false);
  }
  y += 10;

  // Section 8: Conclusion
  drawSectionHeader(doc, t.section8, y);

  y = ensureSpace(doc, 60, margin);
  doc.rect(margin, y, contentWidth, 4).fill(COLORS.primary);
  y += 12;
  drawParagraph(doc, t.conclusionText, margin, y, contentWidth);

  y = ensureSpace(doc, 40, margin);
  doc.fontSize(10).fillColor(COLORS.textMuted);
  doc.text(`${t.approvedBy}: ${data.dpoName}`, margin, y);
  y = doc.y + 4;
  doc.text(`${t.date}: ${new Date().toLocaleDateString(localeStr)}`, margin, y);

  doc.fillColor(COLORS.text);
}
