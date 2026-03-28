export const dpiaLabelKeys = [
  'title',
  'subtitle',
  'generated',
  'organization',
  'dpo',
  'dpoContact',
  'supervisoryAuthority',
  'legalFramework',
  'section1',
  'processingDesc',
  'dataCategories',
  'cat_identity',
  'cat_auth',
  'cat_financial',
  'cat_professional',
  'cat_communication',
  'cat_documents',
  'cat_location',
  'cat_consent',
  'section2',
  'purpose',
  'legalBasis',
  'purpose_service',
  'basis_service',
  'purpose_verification',
  'basis_verification',
  'purpose_payments',
  'basis_payments',
  'purpose_marketing',
  'basis_marketing',
  'purpose_security',
  'basis_security',
  'purpose_analytics',
  'basis_analytics',
  'section3',
  'necessityDesc',
  'retentionTitle',
  'retention_active',
  'retention_deleted',
  'retention_logs',
  'retention_documents',
  'retention_payments',
  'retention_consents',
  'section4',
  'riskTitle',
  'risk',
  'likelihood',
  'impact',
  'mitigation',
  'risk_breach',
  'risk_breach_l',
  'risk_breach_i',
  'risk_breach_m',
  'risk_documents',
  'risk_documents_l',
  'risk_documents_i',
  'risk_documents_m',
  'risk_consent',
  'risk_consent_l',
  'risk_consent_i',
  'risk_consent_m',
  'risk_availability',
  'risk_availability_l',
  'risk_availability_i',
  'risk_availability_m',
  'section5',
  'measureCategory',
  'measureDescription',
  'm_encryption',
  'm_encryption_d',
  'm_access',
  'm_access_d',
  'm_audit',
  'm_audit_d',
  'm_rateLimit',
  'm_rateLimit_d',
  'm_backup',
  'm_backup_d',
  'm_monitoring',
  'm_monitoring_d',
  'm_minimization',
  'm_minimization_d',
  'm_consent',
  'm_consent_d',
  'section6',
  'rightsDesc',
  'right_access',
  'right_rectification',
  'right_erasure',
  'right_portability',
  'right_objection',
  'right_restriction',
  'section7',
  'statLabel',
  'statValue',
  'stat_users',
  'stat_masters',
  'stat_leads',
  'stat_bookings',
  'stat_reviews',
  'stat_documents',
  'stat_consents',
  'section8',
  'conclusionText',
  'approvedBy',
  'date',
] as const;

export type DpiaLabelKey = (typeof dpiaLabelKeys)[number];
export type DpiaLabels = Record<DpiaLabelKey, string>;

const en: DpiaLabels = {
  title: 'Data Protection Impact Assessment',
  subtitle: 'Legea nr. 133/2011 (Moldova) & GDPR Art. 35 — DPIA Report',
  generated: 'Generated',
  organization: 'Organization',
  dpo: 'Data Protection Officer',
  dpoContact: 'DPO Contact',
  supervisoryAuthority:
    'Supervisory Authority: NCPDP (Centrul Național pentru Protecția Datelor cu Caracter Personal)',
  legalFramework:
    'Legal framework: Legea nr. 133 din 08.07.2011 privind protecția datelor cu caracter personal (Republic of Moldova). GDPR (EU) 2016/679 applies additionally for EU data subjects.',

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
  cat_consent: 'Consent records — consent type, timestamps, IP at consent time',

  section2: '2. Purpose and Legal Basis',
  purpose: 'Purpose',
  legalBasis: 'Legal Basis',
  purpose_service: 'Service delivery (marketplace functionality)',
  basis_service:
    'Legea 133 Art. 5(1)(b) / GDPR Art. 6(1)(b) — Contract performance',
  purpose_verification: 'Master identity verification',
  basis_verification:
    'Legea 133 Art. 5(1)(f) / GDPR Art. 6(1)(f) — Legitimate interest (platform trust & safety)',
  purpose_payments: 'Payment processing',
  basis_payments:
    'Legea 133 Art. 5(1)(b) / GDPR Art. 6(1)(b) — Contract performance',
  purpose_marketing: 'Digest and marketing communications',
  basis_marketing: 'Legea 133 Art. 5(1)(a) / GDPR Art. 6(1)(a) — Consent',
  purpose_security: 'Platform security and fraud prevention',
  basis_security:
    'Legea 133 Art. 5(1)(f) / GDPR Art. 6(1)(f) — Legitimate interest',
  purpose_analytics: 'Service improvement analytics',
  basis_analytics:
    'Legea 133 Art. 5(1)(f) / GDPR Art. 6(1)(f) — Legitimate interest',

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

  section5:
    '5. Technical and Organizational Measures (Legea 133 Art. 30 / GDPR Art. 32)',
  measureCategory: 'Category',
  measureDescription: 'Measure',
  m_encryption: 'Encryption',
  m_encryption_d:
    'TLS 1.3 in transit; AES-256 encryption for sensitive fields at rest; Argon2 password hashing',
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
    'The platform implements the following data subject rights per Legea 133/2011 (Moldova) and GDPR:',
  right_access:
    'Right of access (Legea 133 Art. 13 / GDPR Art. 15) — Personal data export in PDF format',
  right_rectification:
    'Right to rectification (Legea 133 Art. 14 / GDPR Art. 16) — Profile editing functionality',
  right_erasure:
    'Right to erasure (Legea 133 Art. 14 / GDPR Art. 17) — Account self-deletion with cascade purge',
  right_portability:
    'Right to data portability (GDPR Art. 20) — Structured PDF data export',
  right_objection:
    'Right to object (Legea 133 Art. 15 / GDPR Art. 21) — Consent revocation mechanism',
  right_restriction:
    'Right to restriction (GDPR Art. 18) — Account deactivation option',

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
    'Based on this assessment, the residual risk level after implementation of all technical and organizational measures is ACCEPTABLE. The processing operations comply with Legea nr. 133/2011 (Republic of Moldova) and GDPR (EU) 2016/679. Processing is necessary, proportionate, and adequately protected. This assessment will be reviewed annually or upon material changes to processing operations. Supervisory authority: NCPDP (Republic of Moldova).',
  approvedBy: 'Approved by',
  date: 'Date',
};

const ru: DpiaLabels = {
  title: 'Оценка воздействия на защиту данных',
  subtitle: 'Закон РМ nr. 133/2011 и GDPR Ст. 35 — Отчёт DPIA',
  generated: 'Сформировано',
  organization: 'Организация',
  dpo: 'Ответственный за защиту данных (DPO)',
  dpoContact: 'Контакт DPO',
  supervisoryAuthority:
    'Надзорный орган: НЦЗПД (Национальный центр по защите персональных данных, Республика Молдова)',
  legalFramework:
    'Правовая основа: Закон nr. 133 от 08.07.2011 о защите персональных данных (Республика Молдова). GDPR (ЕС) 2016/679 применяется дополнительно для субъектов данных из ЕС.',

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
  basis_service:
    'Закон 133 Ст. 5(1)(b) / GDPR Ст. 6(1)(b) — Исполнение договора',
  purpose_verification: 'Верификация личности мастеров',
  basis_verification:
    'Закон 133 Ст. 5(1)(f) / GDPR Ст. 6(1)(f) — Законный интерес (доверие и безопасность платформы)',
  purpose_payments: 'Обработка платежей',
  basis_payments:
    'Закон 133 Ст. 5(1)(b) / GDPR Ст. 6(1)(b) — Исполнение договора',
  purpose_marketing: 'Дайджест и маркетинговые рассылки',
  basis_marketing: 'Закон 133 Ст. 5(1)(a) / GDPR Ст. 6(1)(a) — Согласие',
  purpose_security: 'Безопасность платформы и предотвращение мошенничества',
  basis_security: 'Закон 133 Ст. 5(1)(f) / GDPR Ст. 6(1)(f) — Законный интерес',
  purpose_analytics: 'Аналитика для улучшения сервиса',
  basis_analytics:
    'Закон 133 Ст. 5(1)(f) / GDPR Ст. 6(1)(f) — Законный интерес',

  section3: '3. Оценка необходимости и пропорциональности',
  necessityDesc:
    'Сбор данных ограничен строго необходимым для заявленных целей. Минимизация данных реализована на уровне схемы БД — собираются только обязательные поля.',
  retentionTitle: 'Сроки хранения',
  retention_active: 'Данные активного аккаунта — хранятся пока аккаунт активен',
  retention_deleted: 'Данные удалённого аккаунта — удаляются в течение 30 дней',
  retention_logs: 'Логи входа/аудита — 90 дней',
  retention_documents:
    'Файлы документов верификации — удаляются вскоре после одобрения (факт верификации сохраняется)',
  retention_payments: 'Финансовые записи — 5 лет (требование закона)',
  retention_consents: 'Записи согласий — хранятся на время обработки + 3 года',

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

  section5:
    '5. Технические и организационные меры (Закон 133 Ст. 30 / GDPR Ст. 32)',
  measureCategory: 'Категория',
  measureDescription: 'Мера',
  m_encryption: 'Шифрование',
  m_encryption_d:
    'TLS 1.3 при передаче; AES-256 шифрование чувствительных полей; Argon2-хеширование паролей',
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
  rightsDesc:
    'Платформа реализует следующие права субъектов данных по Закону 133/2011 (РМ) и GDPR:',
  right_access:
    'Право на доступ (Закон 133 Ст. 13 / GDPR Ст. 15) — Экспорт персональных данных в PDF',
  right_rectification:
    'Право на исправление (Закон 133 Ст. 14 / GDPR Ст. 16) — Редактирование профиля',
  right_erasure:
    'Право на удаление (Закон 133 Ст. 14 / GDPR Ст. 17) — Самоудаление аккаунта с каскадной очисткой',
  right_portability:
    'Право на переносимость (GDPR Ст. 20) — Структурированный экспорт в PDF',
  right_objection:
    'Право на возражение (Закон 133 Ст. 15 / GDPR Ст. 21) — Механизм отзыва согласия',
  right_restriction:
    'Право на ограничение (GDPR Ст. 18) — Возможность деактивации аккаунта',

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
    'На основании данной оценки, остаточный уровень риска после внедрения всех технических и организационных мер является ПРИЕМЛЕМЫМ. Операции обработки соответствуют Закону nr. 133/2011 (Республика Молдова) и GDPR (ЕС) 2016/679. Обработка необходима, пропорциональна и надлежащим образом защищена. Оценка будет пересмотрена ежегодно или при существенных изменениях. Надзорный орган: НЦЗПД (Республика Молдова).',
  approvedBy: 'Утверждено',
  date: 'Дата',
};

const ro: DpiaLabels = {
  title: 'Evaluarea impactului asupra protecției datelor',
  subtitle: 'Legea nr. 133/2011 (RM) și GDPR Art. 35 — Raport DPIA',
  generated: 'Generat',
  organization: 'Organizație',
  dpo: 'Responsabil cu protecția datelor (DPO)',
  dpoContact: 'Contact DPO',
  supervisoryAuthority:
    'Autoritate de supraveghere: CNPDCP (Centrul Național pentru Protecția Datelor cu Caracter Personal, Republica Moldova)',
  legalFramework:
    'Cadru juridic: Legea nr. 133 din 08.07.2011 privind protecția datelor cu caracter personal (Republica Moldova). GDPR (UE) 2016/679 se aplică suplimentar pentru subiecții de date din UE.',

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
  basis_service:
    'Legea 133 Art. 5(1)(b) / GDPR Art. 6(1)(b) — Executarea contractului',
  purpose_verification: 'Verificarea identității meșterilor',
  basis_verification:
    'Legea 133 Art. 5(1)(f) / GDPR Art. 6(1)(f) — Interes legitim (încredere și siguranță platformă)',
  purpose_payments: 'Procesarea plăților',
  basis_payments:
    'Legea 133 Art. 5(1)(b) / GDPR Art. 6(1)(b) — Executarea contractului',
  purpose_marketing: 'Digest și comunicări de marketing',
  basis_marketing: 'Legea 133 Art. 5(1)(a) / GDPR Art. 6(1)(a) — Consimțământ',
  purpose_security: 'Securitatea platformei și prevenirea fraudei',
  basis_security:
    'Legea 133 Art. 5(1)(f) / GDPR Art. 6(1)(f) — Interes legitim',
  purpose_analytics: 'Analitica pentru îmbunătățirea serviciului',
  basis_analytics:
    'Legea 133 Art. 5(1)(f) / GDPR Art. 6(1)(f) — Interes legitim',

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

  section5:
    '5. Măsuri tehnice și organizatorice (Legea 133 Art. 30 / GDPR Art. 32)',
  measureCategory: 'Categorie',
  measureDescription: 'Măsura',
  m_encryption: 'Criptare',
  m_encryption_d:
    'TLS 1.3 în tranzit; criptare AES-256 câmpuri sensibile; hashing Argon2 parole',
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
    'Platforma implementează următoarele drepturi ale subiecților de date conform Legii 133/2011 (RM) și GDPR:',
  right_access:
    'Dreptul de acces (Legea 133 Art. 13 / GDPR Art. 15) — Export date personale în format PDF',
  right_rectification:
    'Dreptul la rectificare (Legea 133 Art. 14 / GDPR Art. 16) — Funcționalitate editare profil',
  right_erasure:
    'Dreptul la ștergere (Legea 133 Art. 14 / GDPR Art. 17) — Auto-ștergere cont cu purjare cascadă',
  right_portability:
    'Dreptul la portabilitate (GDPR Art. 20) — Export structurat PDF',
  right_objection:
    'Dreptul la obiecție (Legea 133 Art. 15 / GDPR Art. 21) — Mecanism revocare consimțământ',
  right_restriction:
    'Dreptul la restricție (GDPR Art. 18) — Opțiune dezactivare cont',

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
    'Pe baza acestei evaluări, nivelul de risc rezidual după implementarea tuturor măsurilor tehnice și organizatorice este ACCEPTABIL. Operațiunile de prelucrare sunt conforme cu Legea nr. 133/2011 (Republica Moldova) și GDPR (UE) 2016/679. Prelucrarea este necesară, proporțională și protejată adecvat. Evaluarea va fi revizuită anual sau la modificări semnificative ale operațiunilor de prelucrare. Autoritate de supraveghere: CNPDCP (Republica Moldova).',
  approvedBy: 'Aprobat de',
  date: 'Data',
};

export const DPIA_LABELS: Record<'en' | 'ru' | 'ro', DpiaLabels> = {
  en,
  ru,
  ro,
};
