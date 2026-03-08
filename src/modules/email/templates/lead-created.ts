import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Cererea dvs. a fost trimisă ✅',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Cererea dvs.${ctx.masterName ? ` către meșterul <strong>${ctx.masterName}</strong>` : ''} a fost trimisă cu succes.</p>
    <p>Meșterul a primit notificarea și de obicei răspunde în 1-2 ore.</p>
    <p>Puteți urmări statusul cererii în cabinetul personal.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">Cererile mele →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Cererea${ctx.masterName ? ` către ${ctx.masterName}` : ''} a fost trimisă. Urmăriți: ${ctx.frontendUrl}/client-dashboard/leads`,
  },
  ru: {
    subject: 'Ваша заявка отправлена ✅',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Ваша заявка${ctx.masterName ? ` мастеру <strong>${ctx.masterName}</strong>` : ''} успешно отправлена.</p>
    <p>Мастер получил уведомление и обычно отвечает в течение 1-2 часов.</p>
    <p>Вы можете отслеживать статус заявки в личном кабинете.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">Мои заявки →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Заявка${ctx.masterName ? ` мастеру ${ctx.masterName}` : ''} отправлена. Отслеживайте: ${ctx.frontendUrl}/client-dashboard/leads`,
  },
  en: {
    subject: 'Your request has been sent ✅',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Your request${ctx.masterName ? ` to master <strong>${ctx.masterName}</strong>` : ''} has been sent successfully.</p>
    <p>The master received the notification and usually responds within 1-2 hours.</p>
    <p>You can track the request status in your dashboard.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/leads" class="btn">My requests →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Request${ctx.masterName ? ` to ${ctx.masterName}` : ''} sent. Track: ${ctx.frontendUrl}/client-dashboard/leads`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const leadCreated: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
