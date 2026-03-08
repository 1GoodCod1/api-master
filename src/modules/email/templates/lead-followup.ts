import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Meșterul v-a răspuns la cerere?',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Ați trimis o cerere${ctx.masterName ? ` către meșterul <strong>${ctx.masterName}</strong>` : ''}.</p>
    <p>Meșterul a răspuns deja? Dacă da, discutați detaliile în chat. Dacă nu — puteți găsi alt meșter.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">Verificați statusul →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Meșterul a răspuns? Verificați: ${ctx.frontendUrl}/client-dashboard/leads`,
  },
  ru: {
    subject: 'Мастер ответил на вашу заявку?',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Вы отправляли заявку${ctx.masterName ? ` мастеру <strong>${ctx.masterName}</strong>` : ''}.</p>
    <p>Мастер уже ответил? Если да, обсудите детали в чате. Если нет — можно найти другого мастера.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">Проверить статус →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Мастер ответил? Проверьте: ${ctx.frontendUrl}/client-dashboard/leads`,
  },
  en: {
    subject: 'Did the master respond to your request?',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>You sent a request${ctx.masterName ? ` to master <strong>${ctx.masterName}</strong>` : ''}.</p>
    <p>Has the master responded? If yes, discuss details in chat. If not — you can find another master.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">Check status →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Master responded? Check: ${ctx.frontendUrl}/client-dashboard/leads`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const leadFollowup: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
