import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Master-Hub: Digest pentru meșteri — cereri și actualizări',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Digestul săptămânal pentru meșteri — cereri, recenzii și actualizări ale platformei.</p>
    ${typeof ctx.announcement === 'string' && ctx.announcement ? `<div style="margin:20px 0; padding:16px; background:#fef3c7; border-radius:8px; border-left:4px solid #f59e0b;"><strong>🆕 Anunț:</strong><p style="margin:8px 0 0;">${ctx.announcement}</p></div>` : ''}
    <p><strong>În acest număr:</strong></p>
    <ul>
      <li>📬 Cum să răspundeți mai rapid la cereri și să atrageți mai mulți clienți</li>
      <li>⭐ Importanța recenziilor — cum influențează ratingul</li>
      <li>🆕 Actualizări ale platformei și noi posibilități</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/leads" class="btn">Cererile mele →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">V-ați abonat la digest în cabinet.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Digest pentru meșteri${ctx.userName ? `, ${ctx.userName}` : ''}. ${ctx.frontendUrl}/dashboard/leads`,
  },
  ru: {
    subject: 'Master-Hub: Дайджест для мастеров — заявки и обновления',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Ваш еженедельный дайджест для мастеров — заявки, отзывы и обновления платформы.</p>
    ${typeof ctx.announcement === 'string' && ctx.announcement ? `<div style="margin:20px 0; padding:16px; background:#fef3c7; border-radius:8px; border-left:4px solid #f59e0b;"><strong>🆕 Объявление:</strong><p style="margin:8px 0 0;">${ctx.announcement}</p></div>` : ''}
    <p><strong>В этом выпуске:</strong></p>
    <ul>
      <li>📬 Как быстрее отвечать на заявки и получать больше клиентов</li>
      <li>⭐ Важность отзывов — как они влияют на рейтинг</li>
      <li>🆕 Обновления платформы и новые возможности</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/leads" class="btn">Мои заявки →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">Вы подписались на дайджест в личном кабинете.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Дайджест для мастеров${ctx.userName ? `, ${ctx.userName}` : ''}. ${ctx.frontendUrl}/dashboard/leads`,
  },
  en: {
    subject: 'Master-Hub: Digest for masters — requests and updates',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Your weekly digest for masters — requests, reviews and platform updates.</p>
    ${typeof ctx.announcement === 'string' && ctx.announcement ? `<div style="margin:20px 0; padding:16px; background:#fef3c7; border-radius:8px; border-left:4px solid #f59e0b;"><strong>🆕 Announcement:</strong><p style="margin:8px 0 0;">${ctx.announcement}</p></div>` : ''}
    <p><strong>In this issue:</strong></p>
    <ul>
      <li>📬 How to respond faster to requests and get more clients</li>
      <li>⭐ The importance of reviews — how they affect your rating</li>
      <li>🆕 Platform updates and new features</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/leads" class="btn">My requests →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">You subscribed in your dashboard.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Digest for masters${ctx.userName ? `, ${ctx.userName}` : ''}. ${ctx.frontendUrl}/dashboard/leads`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const digestMaster: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
