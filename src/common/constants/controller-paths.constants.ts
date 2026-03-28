/**
 * Сегменты путей для @Controller() (без глобального префикса API).
 * Единый источник для контроллеров, тестов и при необходимости клиентов.
 */
export const CONTROLLER_PATH = {
  /** @Controller() — маршруты на корне */
  root: '',
  admin: 'admin',
  adminCompliance: 'admin/compliance',
  analytics: 'analytics',
  audit: 'audit',
  auth: 'auth',
  bookings: 'bookings',
  cacheWarming: 'cache-warming',
  categories: 'categories',
  cities: 'cities',
  consent: 'consent',
  conversations: 'conversations',
  digest: 'digest',
  export: 'export',
  favorites: 'favorites',
  files: 'files',
  leads: 'leads',
  masters: 'masters',
  notifications: 'notifications',
  payments: 'payments',
  phoneVerification: 'phone-verification',
  portfolio: 'portfolio',
  promotions: 'promotions',
  recommendations: 'recommendations',
  referrals: 'referrals',
  reports: 'reports',
  reviews: 'reviews',
  search: 'search',
  security: 'security',
  tariffs: 'tariffs',
  telegramWebhook: 'webhook/telegram',
  users: 'users',
  verification: 'verification',
  webPush: 'web-push',
  webVitals: 'web-vitals',
} as const;

export type ControllerPath =
  (typeof CONTROLLER_PATH)[keyof typeof CONTROLLER_PATH];
