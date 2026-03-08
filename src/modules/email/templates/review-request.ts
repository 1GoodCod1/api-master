import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Cum a fost serviciul? Lăsați o recenzie ⭐',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Comanda dvs.${ctx.masterName ? ` la meșterul <strong>${ctx.masterName}</strong>` : ''} a fost finalizată.</p>
    <p>Vă rugăm să evaluați calitatea serviciului — ajută alți clienți și motivează meșterul.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.reviewLink || `${ctx.frontendUrl}/client-dashboard/leads`}" class="btn">Lăsați o recenzie ⭐</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Lăsați o recenzie${ctx.masterName ? ` pentru ${ctx.masterName}` : ''}: ${ctx.reviewLink || ctx.frontendUrl}`,
  },
  ru: {
    subject: 'Как прошла работа? Оставьте отзыв ⭐',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Ваш заказ${ctx.masterName ? ` у мастера <strong>${ctx.masterName}</strong>` : ''} выполнен.</p>
    <p>Пожалуйста, оцените качество работы — это поможет другим клиентам и мотивирует мастера.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.reviewLink || `${ctx.frontendUrl}/client-dashboard/leads`}" class="btn">Оставить отзыв ⭐</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Оставьте отзыв${ctx.masterName ? ` мастеру ${ctx.masterName}` : ''}: ${ctx.reviewLink || ctx.frontendUrl}`,
  },
  en: {
    subject: 'How was the service? Leave a review ⭐',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Your order${ctx.masterName ? ` with master <strong>${ctx.masterName}</strong>` : ''} is complete.</p>
    <p>Please rate the quality — it helps other clients and motivates the master.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.reviewLink || `${ctx.frontendUrl}/client-dashboard/leads`}" class="btn">Leave a review ⭐</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Leave a review${ctx.masterName ? ` for ${ctx.masterName}` : ''}: ${ctx.reviewLink || ctx.frontendUrl}`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const reviewRequest: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
