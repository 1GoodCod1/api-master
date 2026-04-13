import { resolveUseHttpOnlyCookie } from './http-only-cookie';

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  buildId: process.env.BUILD_ID || 'local',
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  frontendUrl:
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5432/faber-md',
    readUrl: process.env.DATABASE_READ_URL || undefined,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
    sentinels: process.env.REDIS_SENTINELS
      ? process.env.REDIS_SENTINELS.split(',').map((s) => {
          const parts = s.trim().split(':');
          return {
            host: parts[0],
            port: parseInt(parts[1] || '26379', 10),
          };
        })
      : null,
    sentinelName: process.env.REDIS_SENTINEL_NAME || 'mymaster',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
    oauthPendingSecret:
      process.env.JWT_OAUTH_PENDING_SECRET?.trim() ||
      process.env.JWT_ACCESS_SECRET ||
      '',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:4000/api/v1/auth/google/callback',
    },
  },
  auth: {
    useHttpOnlyCookie: resolveUseHttpOnlyCookie(),
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'rt',
    refreshCookieMaxAgeDays: Math.max(
      1,
      parseInt(process.env.REFRESH_COOKIE_MAX_AGE_DAYS || '7', 10) || 7,
    ),
    cookieDomain: process.env.COOKIE_DOMAIN || '',
    oauthPendingCookieName:
      process.env.OAUTH_PENDING_COOKIE_NAME || 'oauth_pending',
    oauthPendingCookieMaxMs: 15 * 60 * 1000,
  },
  idEncryption: {
    secret: process.env.ID_ENCRYPTION_SECRET || '',
  },
  mia: {
    clientId: process.env.MIA_CLIENT_ID || '',
    clientSecret: process.env.MIA_CLIENT_SECRET || '',
    baseUrl: process.env.MIA_BASE_URL || 'https://api.maib.md',
    authPath: process.env.MIA_AUTH_PATH || '/v1/auth',
    createQrPath: process.env.MIA_CREATE_QR_PATH || '/v1/qr/create',
    terminalId: process.env.MIA_TERMINAL_ID || '',
    sandbox: process.env.MIA_SANDBOX === 'true',
    testPayPath: process.env.MIA_TEST_PAY_PATH || '/v2/mia/test-pay',
    webhookSecret: process.env.MIA_WEBHOOK_SECRET || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  },

  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED !== 'false',
    senderId:
      process.env.TWILIO_WHATSAPP_SENDER_ID ||
      process.env.TWILIO_WHATSAPP_FROM ||
      'whatsapp:+14155238886',
  },
  b2: {
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID || '',
    applicationKey: process.env.B2_APPLICATION_KEY || '',
    bucket: process.env.B2_BUCKET || '',
    region: process.env.B2_REGION || 'eu-central-003',
    endpoint: process.env.B2_ENDPOINT || '',
  },

  sms: {
    enabled: process.env.SMS_ENABLED !== 'false',
    provider: process.env.SMS_PROVIDER || 'twilio',
    httpProvider: {
      url: process.env.SMS_HTTP_PROVIDER_URL,
      apiKey: process.env.SMS_HTTP_PROVIDER_API_KEY,
      apiId: process.env.SMS_HTTP_PROVIDER_API_ID,
    },
  },
  notifications: {
    telegramEnabled: process.env.NOTIFICATIONS_TELEGRAM_ENABLED !== 'false',
    smsEnabled: process.env.NOTIFICATIONS_SMS_ENABLED !== 'false',
    quietHoursStart: parseInt(
      process.env.NOTIFICATIONS_QUIET_HOURS_START || '23',
      10,
    ),
    quietHoursEnd: parseInt(
      process.env.NOTIFICATIONS_QUIET_HOURS_END || '8',
      10,
    ),
  },
  email: {
    enabled: process.env.EMAIL_ENABLED !== 'false',
    from: process.env.EMAIL_FROM || 'noreply@faber.md',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  webPush: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    email: process.env.VAPID_EMAIL || 'admin@faber.md',
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    useRedisStorage:
      process.env.RATE_LIMIT_REDIS_STORAGE === 'true'
        ? true
        : process.env.RATE_LIMIT_REDIS_STORAGE === 'false'
          ? false
          : process.env.NODE_ENV === 'production',
  },
  security: {
    cookieOriginCheckEnabled:
      process.env.NODE_ENV === 'production'
        ? process.env.COOKIE_ORIGIN_CHECK !== 'false'
        : process.env.COOKIE_ORIGIN_CHECK === 'true',
  },
  audit: {
    httpEnabled: process.env.AUDIT_HTTP_ENABLED === 'true',
  },
});
