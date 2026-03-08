import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Memento: mâine aveți o programare 📆',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Vă reamintim că <strong>mâine</strong> aveți o programare${ctx.masterName ? ` la meșterul <strong>${ctx.masterName}</strong>` : ''}.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/bookings" class="btn">Programările mele →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Mâine aveți o programare${ctx.masterName ? ` la ${ctx.masterName}` : ''}. ${ctx.frontendUrl}/client-dashboard/bookings`,
  },
  ru: {
    subject: 'Напоминание: завтра у вас запись 📆',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Напоминаем, что <strong>завтра</strong> у вас запись${ctx.masterName ? ` к мастеру <strong>${ctx.masterName}</strong>` : ''}.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/bookings" class="btn">Мои записи →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Завтра у вас запись${ctx.masterName ? ` к мастеру ${ctx.masterName}` : ''}. ${ctx.frontendUrl}/client-dashboard/bookings`,
  },
  en: {
    subject: 'Reminder: you have a booking tomorrow 📆',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Reminder: <strong>tomorrow</strong> you have a booking${ctx.masterName ? ` with master <strong>${ctx.masterName}</strong>` : ''}.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/client-dashboard/bookings" class="btn">My bookings →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Tomorrow you have a booking${ctx.masterName ? ` with ${ctx.masterName}` : ''}. ${ctx.frontendUrl}/client-dashboard/bookings`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const bookingReminder24h: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
