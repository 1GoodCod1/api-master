import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'faber.md: Digest — sfaturi și știri',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Digestul săptămânal faber.md — sfaturi și știri despre găsirea celor mai buni meșteri.</p>
    ${typeof ctx.announcement === 'string' && ctx.announcement ? `<div style="margin:20px 0; padding:16px; background:#fef3c7; border-radius:8px; border-left:4px solid #f59e0b;"><strong>🆕 Anunț:</strong><p style="margin:8px 0 0;">${ctx.announcement}</p></div>` : ''}
    <p><strong>În acest număr:</strong></p>
    <ul>
      <li>🔍 Cum să alegeți un meșter după recenzii și portofoliu</li>
      <li>📩 Sfaturi pentru formularea cererii — primiți răspuns mai rapid</li>
      <li>⭐ Meșteri noi în orașul dvs.</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Găsiți un meșter →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">V-ați abonat la digest în cabinet. Dezabonarea în setările profilului.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Digest faber.md${ctx.userName ? `, ${ctx.userName}` : ''}. Sfaturi despre meșteri: ${ctx.frontendUrl}/masters`,
  },
  ru: {
    subject: 'faber.md: Дайджест — советы и новости',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Ваш еженедельный дайджест faber.md — советы и новости о поиске лучших мастеров.</p>
    ${typeof ctx.announcement === 'string' && ctx.announcement ? `<div style="margin:20px 0; padding:16px; background:#fef3c7; border-radius:8px; border-left:4px solid #f59e0b;"><strong>🆕 Объявление:</strong><p style="margin:8px 0 0;">${ctx.announcement}</p></div>` : ''}
    <p><strong>В этом выпуске:</strong></p>
    <ul>
      <li>🔍 Как выбрать мастера по отзывам и портфолио</li>
      <li>📩 Советы по оформлению заявки — получите ответ быстрее</li>
      <li>⭐ Новые мастера в вашем городе</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Найти мастера →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">Вы подписались на дайджест в личном кабинете. Отписаться можно в настройках профиля.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Дайджест faber.md${ctx.userName ? `, ${ctx.userName}` : ''}. Советы о поиске мастеров: ${ctx.frontendUrl}/masters`,
  },
  en: {
    subject: 'faber.md: Digest — tips and news',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Your weekly faber.md digest — tips and news about finding the best masters.</p>
    ${typeof ctx.announcement === 'string' && ctx.announcement ? `<div style="margin:20px 0; padding:16px; background:#fef3c7; border-radius:8px; border-left:4px solid #f59e0b;"><strong>🆕 Announcement:</strong><p style="margin:8px 0 0;">${ctx.announcement}</p></div>` : ''}
    <p><strong>In this issue:</strong></p>
    <ul>
      <li>🔍 How to choose a master by reviews and portfolio</li>
      <li>📩 Tips for writing requests — get faster responses</li>
      <li>⭐ New masters in your city</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Find a master →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">You subscribed in your dashboard. Unsubscribe in profile settings.</p>
  `,
    text: (ctx: TemplateContext) =>
      `faber.md digest${ctx.userName ? `, ${ctx.userName}` : ''}. Tips: ${ctx.frontendUrl}/masters`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const digestClient: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
