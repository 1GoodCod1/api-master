import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Cum să găsiți meșterul ideal — 3 pași simpli',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Vă explicăm cum să găsiți rapid meșterul potrivit:</p>
    <p><strong>Pasul 1:</strong> Alegeți categoria și orașul</p>
    <p><strong>Pasul 2:</strong> Consultați profilurile, ratingurile și portofoliul</p>
    <p><strong>Pasul 3:</strong> Trimiteți o cerere cu descrierea sarcinii</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/how-it-works" class="btn">Cum funcționează →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `3 pași: 1) Categorie + oraș 2) Ratinguri și portofoliu 3) Trimiteți cererea. ${ctx.frontendUrl}/how-it-works`,
  },
  ru: {
    subject: 'Как найти идеального мастера — 3 простых шага',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Расскажем, как быстро найти нужного мастера:</p>
    <p><strong>Шаг 1:</strong> Выберите категорию и город</p>
    <p><strong>Шаг 2:</strong> Просмотрите профили, рейтинги и портфолио</p>
    <p><strong>Шаг 3:</strong> Отправьте заявку с описанием задачи</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/how-it-works" class="btn">Как это работает →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `3 шага для поиска мастера: 1) Категория + город 2) Рейтинги и портфолио 3) Отправьте заявку. ${ctx.frontendUrl}/how-it-works`,
  },
  en: {
    subject: 'How to find the perfect master — 3 simple steps',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Here's how to quickly find the right master:</p>
    <p><strong>Step 1:</strong> Choose category and city</p>
    <p><strong>Step 2:</strong> Browse profiles, ratings and portfolio</p>
    <p><strong>Step 3:</strong> Send a request with task description</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/how-it-works" class="btn">How it works →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `3 steps: 1) Category + city 2) Ratings and portfolio 3) Send request. ${ctx.frontendUrl}/how-it-works`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const welcome2: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
