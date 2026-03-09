import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Master-Hub: Resetare parolă',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua.</p>
    <p>Ați solicitat resetarea parolei. Accesați linkul (valabil 1 oră):</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.resetLink}" class="btn">Resetați parola →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">Dacă nu ați solicitat resetarea, ignorați acest email.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Resetare parolă: ${ctx.resetLink}. Linkul este valabil 1 oră.`,
  },
  ru: {
    subject: 'Master-Hub: Сброс пароля',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте.</p>
    <p>Вы запросили сброс пароля. Перейдите по ссылке (действует 1 час):</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.resetLink}" class="btn">Сбросить пароль →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Сброс пароля: ${ctx.resetLink}. Ссылка действует 1 час.`,
  },
  en: {
    subject: 'Master-Hub: Password reset',
    html: (ctx: TemplateContext) => `
    <p>Hello.</p>
    <p>You requested a password reset. Follow the link (valid 1 hour):</p>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.resetLink}" class="btn">Reset password →</a>
    </p>
    <p style="margin-top:16px; font-size:12px; color:#999;">If you didn't request this, ignore this email.</p>
  `,
    text: (ctx: TemplateContext) =>
      `Password reset: ${ctx.resetLink}. Link valid for 1 hour.`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const passwordReset: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
