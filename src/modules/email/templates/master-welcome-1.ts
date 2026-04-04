import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Bun venit, meșter! 🛠 Completați profilul',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>V-ați înregistrat ca meșter pe faber.md.</p>
    <p><strong>Pentru a primi cereri, completați profilul:</strong></p>
    <ul>
      <li>📸 Adăugați fotografii</li>
      <li>📝 Descrieți serviciile</li>
      <li>💰 Indicați prețurile</li>
      <li>🖼 Încărcați portofoliul</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/profile" class="btn">Completați profilul →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Completați profilul meșterului: ${ctx.frontendUrl}/dashboard/profile`,
  },
  ru: {
    subject: 'Добро пожаловать, мастер! 🛠 Заполните профиль',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Вы зарегистрировались как мастер на faber.md.</p>
    <p><strong>Чтобы получать заявки, заполните профиль:</strong></p>
    <ul>
      <li>📸 Добавьте фото</li>
      <li>📝 Опишите свои услуги</li>
      <li>💰 Укажите цены</li>
      <li>🖼 Загрузите портфолио</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/profile" class="btn">Заполнить профиль →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Заполните профиль мастера: ${ctx.frontendUrl}/dashboard/profile`,
  },
  en: {
    subject: 'Welcome, master! 🛠 Complete your profile',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>You registered as a master on faber.md.</p>
    <p><strong>To receive requests, complete your profile:</strong></p>
    <ul>
      <li>📸 Add photos</li>
      <li>📝 Describe your services</li>
      <li>💰 Set your prices</li>
      <li>🖼 Upload your portfolio</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/dashboard/profile" class="btn">Complete profile →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Complete master profile: ${ctx.frontendUrl}/dashboard/profile`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const masterWelcome1: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
