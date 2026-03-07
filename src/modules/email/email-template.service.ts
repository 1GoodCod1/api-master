import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export interface TemplateContext {
  userName?: string;
  masterName?: string;
  leadId?: string;
  resetLink?: string;
  reviewLink?: string;
  dashboardLink?: string;
  frontendUrl?: string;
  [key: string]: JsonValue | undefined;
}

@Injectable()
export class EmailTemplateService {
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl =
      this.configService.get<string>('frontendUrl') || 'http://localhost:3000';
  }

  /**
   * Render email template by name
   */
  render(
    templateName: string,
    context: TemplateContext = {},
  ): { subject: string; html: string; text: string } {
    const ctx = { ...context, frontendUrl: this.frontendUrl };
    const template = TEMPLATES[templateName];
    if (!template) {
      return {
        subject: 'MoldMasters',
        html: `<p>Шаблон не найден</p>`,
        text: `Template "${templateName}" not found`,
      };
    }
    return {
      subject: template.subject(ctx),
      html: this.wrapLayout(template.html(ctx)),
      text: template.text(ctx),
    };
  }

  private wrapLayout(bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 32px 24px; color: #333; line-height: 1.6; }
    .content p { margin: 0 0 16px; }
    .btn { display: inline-block; padding: 14px 32px; background: #f59e0b; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { padding: 24px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>MoldMasters</h1></div>
    <div class="content">${bodyHtml}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MoldMasters. Все права защищены.</p>
      <p><a href="${this.frontendUrl}" style="color:#f59e0b;">moldmasters.md</a></p>
    </div>
  </div>
</body>
</html>`;
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

type TemplateFn = {
  subject: (ctx: TemplateContext) => string;
  html: (ctx: TemplateContext) => string;
  text: (ctx: TemplateContext) => string;
};

const TEMPLATES: Record<string, TemplateFn> = {
  // ---- WELCOME CHAIN ----
  'welcome-1': {
    subject: () => 'Добро пожаловать в MoldMasters! 🎉',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Мы рады, что вы присоединились к MoldMasters — платформе для поиска лучших мастеров Молдовы.</p>
      <p><strong>Что вы можете сделать:</strong></p>
      <ul>
        <li>🔍 Найти мастера по категории и городу</li>
        <li>📩 Отправить заявку на услугу</li>
        <li>💬 Написать мастеру в чат</li>
        <li>⭐ Оставить честный отзыв</li>
      </ul>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/masters" class="btn">Найти мастера →</a>
      </p>
    `,
    text: (ctx) =>
      `Добро пожаловать${ctx.userName ? `, ${ctx.userName}` : ''}! Начните поиск мастера: ${ctx.frontendUrl}/masters`,
  },

  'welcome-2': {
    subject: () => 'Как найти идеального мастера — 3 простых шага',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Расскажем, как быстро найти нужного мастера:</p>
      <p><strong>Шаг 1:</strong> Выберите категорию и город</p>
      <p><strong>Шаг 2:</strong> Просмотрите профили, рейтинги и портфолио</p>
      <p><strong>Шаг 3:</strong> Отправьте заявку с описанием задачи</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/how-it-works" class="btn">Как это работает →</a>
      </p>
    `,
    text: (ctx) =>
      `3 шага для поиска мастера: 1) Категория + город 2) Рейтинги и портфолио 3) Отправьте заявку. ${ctx.frontendUrl}/how-it-works`,
  },

  // ---- LEAD CHAIN ----
  'lead-created': {
    subject: () => 'Ваша заявка отправлена ✅',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Ваша заявка${ctx.masterName ? ` мастеру <strong>${ctx.masterName}</strong>` : ''} успешно отправлена.</p>
      <p>Мастер получил уведомление и обычно отвечает в течение 1-2 часов.</p>
      <p>Вы можете отслеживать статус заявки в личном кабинете.</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">Мои заявки →</a>
      </p>
    `,
    text: (ctx) =>
      `Заявка${ctx.masterName ? ` мастеру ${ctx.masterName}` : ''} отправлена. Отслеживайте: ${ctx.frontendUrl}/client-dashboard/leads`,
  },

  'lead-followup': {
    subject: () => 'Мастер ответил на вашу заявку?',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Вы отправляли заявку${ctx.masterName ? ` мастеру <strong>${ctx.masterName}</strong>` : ''}.</p>
      <p>Мастер уже ответил? Если да, обсудите детали в чате. Если нет — можно найти другого мастера.</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">Проверить статус →</a>
      </p>
    `,
    text: (ctx) =>
      `Мастер ответил? Проверьте: ${ctx.frontendUrl}/client-dashboard/leads`,
  },

  // ---- REVIEW REQUEST CHAIN ----
  'review-request': {
    subject: () => 'Как прошла работа? Оставьте отзыв ⭐',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Ваш заказ${ctx.masterName ? ` у мастера <strong>${ctx.masterName}</strong>` : ''} выполнен.</p>
      <p>Пожалуйста, оцените качество работы — это поможет другим клиентам и мотивирует мастера.</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.reviewLink || `${ctx.frontendUrl}/client-dashboard/leads`}" class="btn">Оставить отзыв ⭐</a>
      </p>
    `,
    text: (ctx) =>
      `Оставьте отзыв${ctx.masterName ? ` мастеру ${ctx.masterName}` : ''}: ${ctx.reviewLink || ctx.frontendUrl}`,
  },

  // ---- RE-ENGAGEMENT ----
  reengagement: {
    subject: () => 'Мы скучаем! 💜 Новые мастера ждут вас',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Давно не заходили? У нас появились новые мастера и акции!</p>
      <p>Загляните — вдруг найдёте именно того мастера, которого искали.</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/masters" class="btn">Посмотреть мастеров →</a>
      </p>
    `,
    text: (ctx) =>
      `Давно не заходили? Посмотрите новых мастеров: ${ctx.frontendUrl}/masters`,
  },

  // ---- MASTER WELCOME ----
  'master-welcome-1': {
    subject: () => 'Добро пожаловать, мастер! 🛠 Заполните профиль',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Вы зарегистрировались как мастер на MoldMasters.</p>
      <p><strong>Чтобы получать заявки, заполните профиль:</strong></p>
      <ul>
        <li>📸 Добавьте фото</li>
        <li>📝 Опишите свои услуги</li>
        <li>💰 Укажите цены</li>
        <li>🖼 Загрузите портфолио</li>
      </ul>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/dashboard/profile" class="btn">Заполнить профиль →</a>
      </p>
    `,
    text: (ctx) =>
      `Заполните профиль мастера: ${ctx.frontendUrl}/dashboard/profile`,
  },

  'master-welcome-2': {
    subject: () => 'Добавьте портфолио — получайте больше заявок!',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Мастера с портфолио получают в <strong>3 раза больше заявок</strong>!</p>
      <p>Загрузите фото ваших работ «до/после» — это лучший способ показать свой уровень.</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/dashboard/portfolio" class="btn">Добавить портфолио →</a>
      </p>
    `,
    text: (ctx) => `Добавьте портфолио: ${ctx.frontendUrl}/dashboard/portfolio`,
  },

  // ---- BOOKING REMINDER ----
  'booking-reminder-24h': {
    subject: () => 'Напоминание: завтра у вас запись 📆',
    html: (ctx) => `
      <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
      <p>Напоминаем, что <strong>завтра</strong> у вас запись${ctx.masterName ? ` к мастеру <strong>${ctx.masterName}</strong>` : ''}.</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.frontendUrl}/client-dashboard/bookings" class="btn">Мои записи →</a>
      </p>
    `,
    text: (ctx) =>
      `Завтра у вас запись${ctx.masterName ? ` к мастеру ${ctx.masterName}` : ''}. ${ctx.frontendUrl}/client-dashboard/bookings`,
  },

  // ---- PASSWORD RESET (replacing old inline HTML) ----
  'password-reset': {
    subject: () => 'MoldMasters: Сброс пароля',
    html: (ctx) => `
      <p>Здравствуйте.</p>
      <p>Вы запросили сброс пароля. Перейдите по ссылке (действует 1 час):</p>
      <p style="text-align:center; margin-top:24px;">
        <a href="${ctx.resetLink}" class="btn">Сбросить пароль →</a>
      </p>
      <p style="margin-top:16px; font-size:12px; color:#999;">Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
    `,
    text: (ctx) => `Сброс пароля: ${ctx.resetLink}. Ссылка действует 1 час.`,
  },
};
