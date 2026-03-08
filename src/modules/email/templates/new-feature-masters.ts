import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'MoldMasters: Funcție nouă pentru meșteri 🚀',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Avem o nouă funcție pentru meșteri.</p>
    <p><strong>Ce e nou:</strong></p>
    <ul>
      <li>📊 Analiză extinsă — vedeți statistici pentru cereri și vizualizări</li>
      <li>📅 Rezervare convenabilă — clienții pot programa la o oră potrivită</li>
      <li>⭐ Recenzii îmbunătățite — mai multă încredere de la clienți</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard" class="btn">Mergi la cabinet →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">Cu stimă, echipa MoldMasters</p>
  `,
    text: (ctx: TemplateContext) =>
      `Funcție nouă pentru meșteri${ctx.userName ? `, ${ctx.userName}` : ''}! Mai multe: ${ctx.frontendUrl}/dashboard`,
  },
  ru: {
    subject: 'MoldMasters: Новая функция для мастеров 🚀',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>У нас появилась новая возможность для мастеров.</p>
    <p><strong>Что нового:</strong></p>
    <ul>
      <li>📊 Расширенная аналитика — смотрите статистику по заявкам и просмотрам</li>
      <li>📅 Удобное бронирование — клиенты могут записываться на удобное время</li>
      <li>⭐ Улучшенные отзывы — больше доверия от клиентов</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard" class="btn">Перейти в кабинет →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">С уважением, команда MoldMasters</p>
  `,
    text: (ctx: TemplateContext) =>
      `Новая функция для мастеров${ctx.userName ? `, ${ctx.userName}` : ''}! Подробнее: ${ctx.frontendUrl}/dashboard`,
  },
  en: {
    subject: 'MoldMasters: New feature for masters 🚀',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>We have a new feature for masters.</p>
    <p><strong>What's new:</strong></p>
    <ul>
      <li>📊 Extended analytics — view stats for requests and views</li>
      <li>📅 Convenient booking — clients can schedule at a convenient time</li>
      <li>⭐ Improved reviews — more trust from clients</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard" class="btn">Go to dashboard →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">Best regards, MoldMasters team</p>
  `,
    text: (ctx: TemplateContext) =>
      `New feature for masters${ctx.userName ? `, ${ctx.userName}` : ''}! More: ${ctx.frontendUrl}/dashboard`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const newFeatureMasters: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
