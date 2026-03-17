/**
 * Переводы для PDF-отчёта аналитики.
 * Поддерживаются EN (английский) и RU (русский).
 */
export type AnalyticsPdfLocale = 'en' | 'ru';

export const analyticsPdfTranslations: Record<
  AnalyticsPdfLocale,
  {
    title: string;
    master: string;
    generated: string;
    profileInfo: string;
    category: string;
    city: string;
    rating: string;
    totalReviews: string;
    totalLeads: string;
    leadsStats: string;
    reviewsStats: string;
    bookingsStats: string;
    recentAnalytics: string;
    leads: string;
    views: string;
    noData: string;
    status: Record<string, string>;
  }
> = {
  en: {
    title: 'Analytics Report',
    master: 'Master',
    generated: 'Generated',
    profileInfo: 'Profile Information',
    category: 'Category',
    city: 'City',
    rating: 'Rating',
    totalReviews: 'Total Reviews',
    totalLeads: 'Total Leads',
    leadsStats: 'Leads Statistics',
    reviewsStats: 'Reviews Statistics',
    bookingsStats: 'Bookings Statistics',
    recentAnalytics: 'Recent Analytics (Last 30 Days)',
    leads: 'leads',
    views: 'views',
    noData: 'No data',
    status: {
      CLOSED: 'Closed',
      SPAM: 'Spam',
      NEW: 'New',
      IN_PROGRESS: 'In Progress',
      VISIBLE: 'Visible',
      HIDDEN: 'Hidden',
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      CANCELLED: 'Cancelled',
      COMPLETED: 'Completed',
    },
  },
  ru: {
    title: 'Отчёт по аналитике',
    master: 'Мастер',
    generated: 'Сформировано',
    profileInfo: 'Информация о профиле',
    category: 'Категория',
    city: 'Город',
    rating: 'Рейтинг',
    totalReviews: 'Всего отзывов',
    totalLeads: 'Всего лидов',
    leadsStats: 'Статистика лидов',
    reviewsStats: 'Статистика отзывов',
    bookingsStats: 'Статистика записей',
    recentAnalytics: 'Аналитика за последние 30 дней',
    leads: 'лидов',
    views: 'просмотров',
    noData: 'Нет данных',
    status: {
      CLOSED: 'Закрыто',
      SPAM: 'Спам',
      NEW: 'Новые',
      IN_PROGRESS: 'В работе',
      VISIBLE: 'Опубликовано',
      HIDDEN: 'Скрыто',
      PENDING: 'Ожидает',
      CONFIRMED: 'Подтверждено',
      CANCELLED: 'Отменено',
      COMPLETED: 'Завершено',
    },
  },
};

export function getAnalyticsPdfTranslations(
  locale: string,
): (typeof analyticsPdfTranslations)['en'] {
  const lang = locale?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  return analyticsPdfTranslations[lang];
}
