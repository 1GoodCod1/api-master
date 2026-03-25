import path from 'path';
import type PDFDocument from 'pdfkit';

const COLORS = {
  primary: '#0f766e',
  primaryLight: '#e6f7f6',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
  headerBg: '#f1f5f9',
} as const;

type Doc = InstanceType<typeof PDFDocument>;

export interface RopaContext {
  organizationName: string;
  organizationAddress: string;
  dpoName: string;
  dpoEmail: string;
  totalUsers: number;
  totalMasters: number;
}

interface RopaEntry {
  activity: string;
  dataSubjects: string;
  dataCategories: string;
  purpose: string;
  legalBasis: string;
  recipients: string;
  retention: string;
  transfers: string;
  technicalMeasures: string;
}

const LABELS: Record<string, Record<string, string>> = {
  en: {
    title: 'Record of Processing Activities',
    subtitle: 'GDPR Article 30 — ROPA',
    generated: 'Generated',
    controller: 'Data Controller',
    address: 'Address',
    dpo: 'Data Protection Officer',
    dpoContact: 'DPO Email',

    colActivity: 'Processing Activity',
    colSubjects: 'Data Subjects',
    colCategories: 'Data Categories',
    colPurpose: 'Purpose',
    colLegalBasis: 'Legal Basis',
    colRecipients: 'Recipients',
    colRetention: 'Retention',
    colTransfers: 'Transfers',
    colMeasures: 'Technical Measures',

    act_registration: 'User Registration & Authentication',
    sub_registration: 'All users (clients, masters, admins)',
    cat_registration: 'Name, email, phone, password hash, preferred language',
    pur_registration: 'Account creation and identity authentication',
    bas_registration: 'Art. 6(1)(b) Contract',
    rec_registration: 'Internal platform only',
    ret_registration: 'Until account deletion + 30 days',
    tra_registration: 'None (EU servers)',
    mea_registration: 'bcrypt hashing, JWT auth, rate limiting',

    act_masterProfile: 'Master Profile Management',
    sub_masterProfile: 'Masters',
    cat_masterProfile:
      'Professional description, experience, city, category, WhatsApp, photos',
    pur_masterProfile: 'Service marketplace listing',
    bas_masterProfile: 'Art. 6(1)(b) Contract',
    rec_masterProfile: 'Public marketplace visitors',
    ret_masterProfile: 'Until profile/account deletion',
    tra_masterProfile: 'None',
    mea_masterProfile: 'Input validation, role-based access',

    act_verification: 'Master Identity Verification',
    sub_verification: 'Masters submitting verification',
    cat_verification: 'Passport/ID document photos, selfie',
    pur_verification: 'Identity verification for platform trust',
    bas_verification: 'Art. 6(1)(f) Legitimate interest',
    rec_verification: 'Admin reviewers only',
    ret_verification: 'Document files deleted shortly after approval',
    tra_verification: 'None',
    mea_verification: 'Encrypted storage, admin-only access, auto-deletion',

    act_leads: 'Lead / Service Request Processing',
    sub_leads: 'Clients submitting requests',
    cat_leads: 'Name, phone, message text, request status',
    pur_leads: 'Connecting clients with masters',
    bas_leads: 'Art. 6(1)(b) Contract',
    rec_leads: 'Target master',
    ret_leads: 'Until account deletion',
    tra_leads: 'None',
    mea_leads: 'Role-based access, audit logging',

    act_bookings: 'Booking Management',
    sub_bookings: 'Clients and masters',
    cat_bookings: 'Booking times, status, client/master relationship',
    pur_bookings: 'Service scheduling and management',
    bas_bookings: 'Art. 6(1)(b) Contract',
    rec_bookings: 'Booked master and client',
    ret_bookings: 'Until account deletion',
    tra_bookings: 'None',
    mea_bookings: 'Role-based access, input validation',

    act_reviews: 'Review & Rating System',
    sub_reviews: 'Clients writing reviews',
    cat_reviews: 'Rating, comment text, phone, client name',
    pur_reviews: 'Quality assurance and trust building',
    bas_reviews: 'Art. 6(1)(f) Legitimate interest',
    rec_reviews: 'Public (visible reviews), master',
    ret_reviews: 'Until account deletion or moderation',
    tra_reviews: 'None',
    mea_reviews: 'Moderation system, admin review',

    act_payments: 'Payment Processing',
    sub_payments: 'Paying masters (subscription)',
    cat_payments: 'Payment amount, status, tariff, timestamps',
    pur_payments: 'Subscription and service payment',
    bas_payments: 'Art. 6(1)(b) Contract',
    rec_payments: 'Payment processor',
    ret_payments: '5 years (legal requirement)',
    tra_payments: 'Payment processor (PCI-compliant)',
    mea_payments: 'Tokenization, no card data stored',

    act_loginHistory: 'Login History & Security Logs',
    sub_loginHistory: 'All authenticated users',
    cat_loginHistory:
      'IP address, user agent, timestamp, success/failure, location',
    pur_loginHistory: 'Security monitoring, fraud prevention',
    bas_loginHistory: 'Art. 6(1)(f) Legitimate interest',
    rec_loginHistory: 'Internal (security team)',
    ret_loginHistory: '90 days',
    tra_loginHistory: 'None',
    mea_loginHistory: 'Encrypted storage, admin-only access',

    act_analytics: 'Platform Analytics & Activity Tracking',
    sub_analytics: 'All users (anonymized where possible)',
    cat_analytics: 'Page views, actions, session data, device info',
    pur_analytics: 'Service improvement, UX optimization',
    bas_analytics: 'Art. 6(1)(f) Legitimate interest',
    rec_analytics: 'Internal analytics team',
    ret_analytics: '12 months (aggregated data retained longer)',
    tra_analytics: 'None',
    mea_analytics: 'Anonymization, aggregation, access control',

    act_consent: 'Consent Management',
    sub_consent: 'All users granting consent',
    cat_consent:
      'Consent type, granted flag, version, IP, user agent, timestamp',
    pur_consent: 'GDPR compliance — proof of consent',
    bas_consent: 'Art. 6(1)(c) Legal obligation',
    rec_consent: 'Internal (compliance)',
    ret_consent: 'Duration of processing + 3 years',
    tra_consent: 'None',
    mea_consent: 'Immutable records, versioning, audit trail',

    act_notifications: 'Notifications & Communications',
    sub_notifications: 'All users',
    cat_notifications: 'Notification type, message content, delivery status',
    pur_notifications: 'Service communication, marketing (with consent)',
    bas_notifications: 'Art. 6(1)(b) Contract / Art. 6(1)(a) Consent',
    rec_notifications: 'Email service provider',
    ret_notifications: '90 days for in-app; email logs per provider policy',
    tra_notifications: 'Email service provider (EU)',
    mea_notifications: 'Unsubscribe mechanism, consent tracking',

    act_audit: 'Audit Trail',
    sub_audit: 'All users performing audited actions',
    cat_audit: 'Action type, entity, user ID, timestamp, metadata',
    pur_audit: 'Security, compliance, incident investigation',
    bas_audit: 'Art. 6(1)(f) Legitimate interest',
    rec_audit: 'Internal (security/compliance)',
    ret_audit: '12 months',
    tra_audit: 'None',
    mea_audit: 'Append-only logging, admin access control',

    footer:
      'This Record of Processing Activities is maintained in accordance with Article 30 of the GDPR and will be updated upon any material changes to processing operations.',
  },
  ru: {
    title: 'Реестр операций по обработке данных',
    subtitle: 'GDPR Статья 30 — ROPA',
    generated: 'Сформировано',
    controller: 'Контролёр данных',
    address: 'Адрес',
    dpo: 'Ответственный за защиту данных',
    dpoContact: 'Email DPO',

    colActivity: 'Операция обработки',
    colSubjects: 'Субъекты данных',
    colCategories: 'Категории данных',
    colPurpose: 'Цель',
    colLegalBasis: 'Правовое основание',
    colRecipients: 'Получатели',
    colRetention: 'Срок хранения',
    colTransfers: 'Передача',
    colMeasures: 'Технические меры',

    act_registration: 'Регистрация и аутентификация',
    sub_registration: 'Все пользователи (клиенты, мастера, админы)',
    cat_registration: 'Имя, email, телефон, хеш пароля, язык',
    pur_registration: 'Создание аккаунта и аутентификация',
    bas_registration: 'Ст. 6(1)(b) Договор',
    rec_registration: 'Только внутри платформы',
    ret_registration: 'До удаления аккаунта + 30 дней',
    tra_registration: 'Нет (серверы в ЕС)',
    mea_registration: 'bcrypt-хеширование, JWT, rate-limiting',

    act_masterProfile: 'Управление профилем мастера',
    sub_masterProfile: 'Мастера',
    cat_masterProfile: 'Описание, опыт, город, категория, WhatsApp, фото',
    pur_masterProfile: 'Размещение на маркетплейсе',
    bas_masterProfile: 'Ст. 6(1)(b) Договор',
    rec_masterProfile: 'Посетители маркетплейса',
    ret_masterProfile: 'До удаления профиля/аккаунта',
    tra_masterProfile: 'Нет',
    mea_masterProfile: 'Валидация ввода, ролевой доступ',

    act_verification: 'Верификация личности мастера',
    sub_verification: 'Мастера, подающие на верификацию',
    cat_verification: 'Фото паспорта/удостоверения, селфи',
    pur_verification: 'Подтверждение личности для доверия к платформе',
    bas_verification: 'Ст. 6(1)(f) Законный интерес',
    rec_verification: 'Только администраторы',
    ret_verification: 'Удаляются после верификации + 30 дней',
    tra_verification: 'Нет',
    mea_verification:
      'Шифрованное хранилище, доступ только для админов, автоудаление',

    act_leads: 'Обработка заявок / лидов',
    sub_leads: 'Клиенты, отправляющие заявки',
    cat_leads: 'Имя, телефон, текст сообщения, статус',
    pur_leads: 'Связь клиентов с мастерами',
    bas_leads: 'Ст. 6(1)(b) Договор',
    rec_leads: 'Целевой мастер',
    ret_leads: 'До удаления аккаунта',
    tra_leads: 'Нет',
    mea_leads: 'Ролевой доступ, аудит-логирование',

    act_bookings: 'Управление бронированиями',
    sub_bookings: 'Клиенты и мастера',
    cat_bookings: 'Время бронирования, статус, связь клиент/мастер',
    pur_bookings: 'Планирование и управление услугами',
    bas_bookings: 'Ст. 6(1)(b) Договор',
    rec_bookings: 'Забронированный мастер и клиент',
    ret_bookings: 'До удаления аккаунта',
    tra_bookings: 'Нет',
    mea_bookings: 'Ролевой доступ, валидация ввода',

    act_reviews: 'Система отзывов и рейтингов',
    sub_reviews: 'Клиенты, оставляющие отзывы',
    cat_reviews: 'Оценка, текст, телефон, имя клиента',
    pur_reviews: 'Контроль качества и формирование доверия',
    bas_reviews: 'Ст. 6(1)(f) Законный интерес',
    rec_reviews: 'Публичные (видимые отзывы), мастер',
    ret_reviews: 'До удаления аккаунта или модерации',
    tra_reviews: 'Нет',
    mea_reviews: 'Система модерации, проверка админом',

    act_payments: 'Обработка платежей',
    sub_payments: 'Мастера (подписка)',
    cat_payments: 'Сумма, статус, тариф, временные метки',
    pur_payments: 'Подписка и оплата услуг',
    bas_payments: 'Ст. 6(1)(b) Договор',
    rec_payments: 'Платёжный процессор',
    ret_payments: '5 лет (требование закона)',
    tra_payments: 'Платёжный процессор (PCI-совместимый)',
    mea_payments: 'Токенизация, данные карт не хранятся',

    act_loginHistory: 'История входов и журналы безопасности',
    sub_loginHistory: 'Все аутентифицированные пользователи',
    cat_loginHistory: 'IP-адрес, user-agent, время, успех/неудача, локация',
    pur_loginHistory: 'Мониторинг безопасности, предотвращение мошенничества',
    bas_loginHistory: 'Ст. 6(1)(f) Законный интерес',
    rec_loginHistory: 'Внутренние (команда безопасности)',
    ret_loginHistory: '90 дней',
    tra_loginHistory: 'Нет',
    mea_loginHistory: 'Шифрованное хранилище, доступ только для админов',

    act_analytics: 'Аналитика и отслеживание активности',
    sub_analytics: 'Все пользователи (анонимизировано где возможно)',
    cat_analytics:
      'Просмотры, действия, данные сессий, информация об устройстве',
    pur_analytics: 'Улучшение сервиса, оптимизация UX',
    bas_analytics: 'Ст. 6(1)(f) Законный интерес',
    rec_analytics: 'Внутренняя команда аналитики',
    ret_analytics: '12 месяцев (агрегированные данные хранятся дольше)',
    tra_analytics: 'Нет',
    mea_analytics: 'Анонимизация, агрегация, контроль доступа',

    act_consent: 'Управление согласиями',
    sub_consent: 'Все пользователи, давшие согласие',
    cat_consent: 'Тип согласия, флаг, версия, IP, user-agent, время',
    pur_consent: 'Соответствие GDPR — подтверждение согласия',
    bas_consent: 'Ст. 6(1)(c) Юридическое обязательство',
    rec_consent: 'Внутренние (комплаенс)',
    ret_consent: 'На время обработки + 3 года',
    tra_consent: 'Нет',
    mea_consent: 'Неизменяемые записи, версионирование, аудит',

    act_notifications: 'Уведомления и коммуникации',
    sub_notifications: 'Все пользователи',
    cat_notifications: 'Тип уведомления, содержание, статус доставки',
    pur_notifications: 'Сервисные сообщения, маркетинг (с согласия)',
    bas_notifications: 'Ст. 6(1)(b) Договор / Ст. 6(1)(a) Согласие',
    rec_notifications: 'Email-провайдер',
    ret_notifications: '90 дней (in-app); email — по политике провайдера',
    tra_notifications: 'Email-провайдер (ЕС)',
    mea_notifications: 'Механизм отписки, отслеживание согласий',

    act_audit: 'Журнал аудита',
    sub_audit: 'Все пользователи, выполняющие действия аудита',
    cat_audit: 'Тип действия, сущность, ID пользователя, время, метаданные',
    pur_audit: 'Безопасность, комплаенс, расследование инцидентов',
    bas_audit: 'Ст. 6(1)(f) Законный интерес',
    rec_audit: 'Внутренние (безопасность/комплаенс)',
    ret_audit: '12 месяцев',
    tra_audit: 'Нет',
    mea_audit: 'Журнал только на добавление, контроль доступа',

    footer:
      'Настоящий реестр операций по обработке ведётся в соответствии со статьёй 30 GDPR и будет обновлён при любых существенных изменениях в операциях обработки.',
  },
  ro: {
    title: 'Registrul activităților de prelucrare',
    subtitle: 'GDPR Articolul 30 — ROPA',
    generated: 'Generat',
    controller: 'Operator de date',
    address: 'Adresă',
    dpo: 'Responsabil protecția datelor',
    dpoContact: 'Email DPO',

    colActivity: 'Activitate de prelucrare',
    colSubjects: 'Subiecți de date',
    colCategories: 'Categorii de date',
    colPurpose: 'Scop',
    colLegalBasis: 'Temei juridic',
    colRecipients: 'Destinatari',
    colRetention: 'Retenție',
    colTransfers: 'Transferuri',
    colMeasures: 'Măsuri tehnice',

    act_registration: 'Înregistrare și autentificare',
    sub_registration: 'Toți utilizatorii (clienți, meșteri, admini)',
    cat_registration: 'Nume, email, telefon, hash parolă, limbă',
    pur_registration: 'Creare cont și autentificare',
    bas_registration: 'Art. 6(1)(b) Contract',
    rec_registration: 'Doar intern platformă',
    ret_registration: 'Până la ștergere cont + 30 zile',
    tra_registration: 'Niciuna (servere UE)',
    mea_registration: 'hashing bcrypt, JWT, rate-limiting',

    act_masterProfile: 'Gestionare profil meșter',
    sub_masterProfile: 'Meșteri',
    cat_masterProfile:
      'Descriere, experiență, oraș, categorie, WhatsApp, fotografii',
    pur_masterProfile: 'Listare pe marketplace',
    bas_masterProfile: 'Art. 6(1)(b) Contract',
    rec_masterProfile: 'Vizitatori marketplace',
    ret_masterProfile: 'Până la ștergere profil/cont',
    tra_masterProfile: 'Niciuna',
    mea_masterProfile: 'Validare input, acces pe roluri',

    act_verification: 'Verificare identitate meșter',
    sub_verification: 'Meșteri care solicită verificare',
    cat_verification: 'Fotografii pașaport/buletin, selfie',
    pur_verification: 'Verificare identitate pentru încrederea platformei',
    bas_verification: 'Art. 6(1)(f) Interes legitim',
    rec_verification: 'Doar administratori',
    ret_verification: 'Fișierele se șterg la scurt timp după aprobare',
    tra_verification: 'Niciuna',
    mea_verification: 'Stocare criptată, acces doar admin, ștergere automată',

    act_leads: 'Procesare cereri / lead-uri',
    sub_leads: 'Clienți care trimit cereri',
    cat_leads: 'Nume, telefon, text mesaj, status',
    pur_leads: 'Conectare clienți cu meșteri',
    bas_leads: 'Art. 6(1)(b) Contract',
    rec_leads: 'Meșterul țintă',
    ret_leads: 'Până la ștergere cont',
    tra_leads: 'Niciuna',
    mea_leads: 'Acces pe roluri, logare audit',

    act_bookings: 'Gestionare rezervări',
    sub_bookings: 'Clienți și meșteri',
    cat_bookings: 'Ore rezervare, status, relație client/meșter',
    pur_bookings: 'Planificare și gestionare servicii',
    bas_bookings: 'Art. 6(1)(b) Contract',
    rec_bookings: 'Meșterul și clientul rezervat',
    ret_bookings: 'Până la ștergere cont',
    tra_bookings: 'Niciuna',
    mea_bookings: 'Acces pe roluri, validare input',

    act_reviews: 'Sistem recenzii și evaluări',
    sub_reviews: 'Clienți care scriu recenzii',
    cat_reviews: 'Evaluare, text comentariu, telefon, nume client',
    pur_reviews: 'Asigurare calitate și construire încredere',
    bas_reviews: 'Art. 6(1)(f) Interes legitim',
    rec_reviews: 'Public (recenzii vizibile), meșter',
    ret_reviews: 'Până la ștergere cont sau moderare',
    tra_reviews: 'Niciuna',
    mea_reviews: 'Sistem moderare, verificare admin',

    act_payments: 'Procesare plăți',
    sub_payments: 'Meșteri (abonament)',
    cat_payments: 'Sumă, status, tarif, marcaje temporale',
    pur_payments: 'Abonament și plată servicii',
    bas_payments: 'Art. 6(1)(b) Contract',
    rec_payments: 'Procesor plăți',
    ret_payments: '5 ani (cerință legală)',
    tra_payments: 'Procesor plăți (conform PCI)',
    mea_payments: 'Tokenizare, date card nu sunt stocate',

    act_loginHistory: 'Istoric autentificări și loguri securitate',
    sub_loginHistory: 'Toți utilizatorii autentificați',
    cat_loginHistory: 'Adresă IP, user-agent, timestamp, succes/eșec, locație',
    pur_loginHistory: 'Monitorizare securitate, prevenire fraudă',
    bas_loginHistory: 'Art. 6(1)(f) Interes legitim',
    rec_loginHistory: 'Intern (echipă securitate)',
    ret_loginHistory: '90 zile',
    tra_loginHistory: 'Niciuna',
    mea_loginHistory: 'Stocare criptată, acces doar admin',

    act_analytics: 'Analitica platformei și urmărire activitate',
    sub_analytics: 'Toți utilizatorii (anonim unde posibil)',
    cat_analytics: 'Vizualizări, acțiuni, date sesiune, info dispozitiv',
    pur_analytics: 'Îmbunătățire serviciu, optimizare UX',
    bas_analytics: 'Art. 6(1)(f) Interes legitim',
    rec_analytics: 'Echipă internă analitica',
    ret_analytics: '12 luni (date agregate reținute mai mult)',
    tra_analytics: 'Niciuna',
    mea_analytics: 'Anonimizare, agregare, control acces',

    act_consent: 'Gestionare consimțăminte',
    sub_consent: 'Toți utilizatorii care acordă consimțământ',
    cat_consent: 'Tip consimțământ, flag, versiune, IP, user-agent, timestamp',
    pur_consent: 'Conformitate GDPR — dovadă consimțământ',
    bas_consent: 'Art. 6(1)(c) Obligație legală',
    rec_consent: 'Intern (conformitate)',
    ret_consent: 'Pe durata prelucrării + 3 ani',
    tra_consent: 'Niciuna',
    mea_consent: 'Înregistrări imuabile, versionare, audit',

    act_notifications: 'Notificări și comunicări',
    sub_notifications: 'Toți utilizatorii',
    cat_notifications: 'Tip notificare, conținut, status livrare',
    pur_notifications: 'Comunicare servicii, marketing (cu consimțământ)',
    bas_notifications: 'Art. 6(1)(b) Contract / Art. 6(1)(a) Consimțământ',
    rec_notifications: 'Furnizor servicii email',
    ret_notifications: '90 zile (in-app); email per politica furnizorului',
    tra_notifications: 'Furnizor email (UE)',
    mea_notifications: 'Mecanism dezabonare, urmărire consimțăminte',

    act_audit: 'Jurnal audit',
    sub_audit: 'Toți utilizatorii cu acțiuni auditate',
    cat_audit: 'Tip acțiune, entitate, ID utilizator, timestamp, metadate',
    pur_audit: 'Securitate, conformitate, investigare incidente',
    bas_audit: 'Art. 6(1)(f) Interes legitim',
    rec_audit: 'Intern (securitate/conformitate)',
    ret_audit: '12 luni',
    tra_audit: 'Niciuna',
    mea_audit: 'Logare append-only, control acces admin',

    footer:
      'Acest Registru al activităților de prelucrare este menținut în conformitate cu Articolul 30 din GDPR și va fi actualizat la orice modificare materială a operațiunilor de prelucrare.',
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

function getEntries(t: Record<string, string>): RopaEntry[] {
  const keys = [
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
  ];
  return keys.map((k) => ({
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

function drawEntryBlock(
  doc: Doc,
  entry: RopaEntry,
  index: number,
  t: Record<string, string>,
  margin: number,
  contentWidth: number,
): void {
  const labelWidth = 130;
  const valueWidth = contentWidth - labelWidth - 10;

  if (doc.y > 600) {
    doc.addPage();
  }

  doc.rect(margin, doc.y, contentWidth, 22).fill(COLORS.primary);
  doc
    .fontSize(11)
    .fillColor(COLORS.white)
    .text(`${index + 1}. ${entry.activity}`, margin + 8, doc.y - 16);

  let y = doc.y + 8;

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
    if (y > 730) {
      doc.addPage();
      y = 50;
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
  const t = getLabels(locale);
  registerPdfFont(doc);

  const margin = 50;
  const pageWidth = 595;
  const contentWidth = pageWidth - margin * 2;

  // Header
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
  const localeStr =
    locale === 'ru' ? 'ru-RU' : locale === 'ro' ? 'ro-RO' : 'en-US';
  doc.fontSize(9).fillColor('rgba(255,255,255,0.8)');
  doc.text(
    `${t.generated}: ${new Date().toLocaleString(localeStr)}`,
    margin,
    62,
    { align: 'center', width: contentWidth },
  );
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
  y = doc.y + 16;
  doc.y = y;

  const entries = getEntries(t);
  for (let i = 0; i < entries.length; i++) {
    drawEntryBlock(doc, entries[i], i, t, margin, contentWidth);
  }

  // Footer
  y = doc.y + 10;
  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  doc.rect(margin, y, contentWidth, 3).fill(COLORS.primary);
  y += 12;
  doc
    .fontSize(9)
    .fillColor(COLORS.textMuted)
    .text(t.footer, margin, y, { width: contentWidth, align: 'center' });

  doc.fillColor(COLORS.text);
}
