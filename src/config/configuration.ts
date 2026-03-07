export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  /** Global HTTP request timeout (ms). Increase if DB/cache retries can exceed (e.g. 30000). */
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),

  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5432/moldmasters',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    sentinels: process.env.REDIS_SENTINELS
      ? process.env.REDIS_SENTINELS.split(',').map((s) => {
          const parts = s.split(':');
          return { host: parts[0], port: parseInt(parts[1] || '26379', 10) };
        })
      : null,
    sentinelName: process.env.REDIS_SENTINEL_NAME || 'mymaster',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
  },

  // httpOnly cookie for refresh token (must match frontend VITE_USE_HTTPONLY).
  // Defaults to true. Set USE_HTTPONLY_COOKIE=false to disable (e.g. mobile API clients).
  auth: {
    useHttpOnlyCookie: process.env.USE_HTTPONLY_COOKIE !== 'false',
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'rt',
    refreshCookieMaxAgeDays: Math.max(
      1,
      parseInt(process.env.REFRESH_COOKIE_MAX_AGE_DAYS || '7', 10) || 7,
    ),
    // Cookie domain for cross-subdomain support (e.g. '.master-hub.md').
    // Leave empty in dev; set in production so cookie works across api.* and www.*
    cookieDomain: process.env.COOKIE_DOMAIN || '',
  },

  idEncryption: {
    secret: process.env.ID_ENCRYPTION_SECRET || '',
  },

  /** MIA / MAIB QR payments (clientId + clientSecret → Bearer token; then create QR) */
  mia: {
    clientId: process.env.MIA_CLIENT_ID || '',
    clientSecret: process.env.MIA_CLIENT_SECRET || '',
    baseUrl: process.env.MIA_BASE_URL || 'https://api.maib.md',
    authPath: process.env.MIA_AUTH_PATH || '/v1/auth',
    createQrPath: process.env.MIA_CREATE_QR_PATH || '/v1/qr/create',
    terminalId: process.env.MIA_TERMINAL_ID || '',
    sandbox: process.env.MIA_SANDBOX === 'true',
    testPayPath: process.env.MIA_TEST_PAY_PATH || '/v2/mia/test-pay',
    /**
     * Shared secret для защиты вебхука от неавторизованных вызовов.
     * MIA должен слать callback на: /payments/mia-callback?token=<MIA_WEBHOOK_SECRET>
     * В продакшне — обязательно задать длинную случайную строку.
     */
    webhookSecret: process.env.MIA_WEBHOOK_SECRET || '',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED !== 'false',
    senderId:
      process.env.TWILIO_WHATSAPP_SENDER_ID ||
      process.env.TWILIO_WHATSAPP_FROM ||
      'whatsapp:+14155238886',
  },

  /** Backblaze B2 (S3-compatible). Production storage when B2_APPLICATION_KEY_ID is set. */
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
    telegramEnabled: 'true',
    smsEnabled: 'true',
    quietHoursStart: 23, // 23:00
    quietHoursEnd: 8, // 08:00
  },

  email: {
    enabled: process.env.EMAIL_ENABLED !== 'false',
    from: process.env.EMAIL_FROM || 'noreply@moldmasters.md',
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
    email: process.env.VAPID_EMAIL || 'admin@moldmasters.md',
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
});
