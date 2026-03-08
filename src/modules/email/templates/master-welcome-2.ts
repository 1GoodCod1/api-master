import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Adăugați portofoliul — primiți mai multe cereri!',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Meșterii cu portofoliu primesc de <strong>3 ori mai multe cereri</strong>!</p>
    <p>Încărcați fotografii «înainte/după» — cel mai bun mod de a demonstra nivelul.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/portfolio" class="btn">Adăugați portofoliul →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Adăugați portofoliul: ${ctx.frontendUrl}/dashboard/portfolio`,
  },
  ru: {
    subject: 'Добавьте портфолио — получайте больше заявок!',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Мастера с портфолио получают в <strong>3 раза больше заявок</strong>!</p>
    <p>Загрузите фото ваших работ «до/после» — это лучший способ показать свой уровень.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/portfolio" class="btn">Добавить портфолио →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Добавьте портфолио: ${ctx.frontendUrl}/dashboard/portfolio`,
  },
  en: {
    subject: 'Add your portfolio — get more requests!',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Masters with portfolio get <strong>3x more requests</strong>!</p>
    <p>Upload before/after photos — the best way to show your level.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/portfolio" class="btn">Add portfolio →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Add portfolio: ${ctx.frontendUrl}/dashboard/portfolio`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const masterWelcome2: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
