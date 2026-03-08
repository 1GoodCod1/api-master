import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Vă dorim! 💜 Noi meșteri vă așteaptă',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Nu ați mai intrat de mult? Avem meșteri noi și promoții!</p>
    <p>Aruncați o privire — poate găsiți exact meșterul pe care îl căutați.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Vedeți meșterii →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Nu ați mai intrat de mult? Vedeți meșterii noi: ${ctx.frontendUrl}/masters`,
  },
  ru: {
    subject: 'Мы скучаем! 💜 Новые мастера ждут вас',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Давно не заходили? У нас появились новые мастера и акции!</p>
    <p>Загляните — вдруг найдёте именно того мастера, которого искали.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Посмотреть мастеров →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Давно не заходили? Посмотрите новых мастеров: ${ctx.frontendUrl}/masters`,
  },
  en: {
    subject: 'We miss you! 💜 New masters are waiting',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Haven't visited in a while? We have new masters and promotions!</p>
    <p>Take a look — you might find exactly the master you've been looking for.</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">View masters →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Haven't visited? Check out new masters: ${ctx.frontendUrl}/masters`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const reengagement: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
