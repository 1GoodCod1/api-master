import type { TemplateContext, TemplateFn } from './types';

const T = {
  ro: {
    subject: 'Bun venit la faber.md! 🎉',
    html: (ctx: TemplateContext) => `
    <p>Bună ziua${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Suntem bucuroși că v-ați alăturat faber.md — platforma pentru găsirea celor mai buni meșteri din Moldova.</p>
    <p><strong>Ce puteți face:</strong></p>
    <ul>
      <li>🔍 Găsiți un meșter după categorie și oraș</li>
      <li>📩 Trimiteți o cerere de serviciu</li>
      <li>💬 Scrieți meșterului în chat</li>
      <li>⭐ Lăsați o recenzie sinceră</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Găsiți un meșter →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Bun venit${ctx.userName ? `, ${ctx.userName}` : ''}! Începeți căutarea: ${ctx.frontendUrl}/masters`,
  },
  ru: {
    subject: 'Добро пожаловать в faber.md! 🎉',
    html: (ctx: TemplateContext) => `
    <p>Здравствуйте${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>Мы рады, что вы присоединились к faber.md — платформе для поиска лучших мастеров Молдовы.</p>
    <p><strong>Что вы можете сделать:</strong></p>
    <ul>
      <li>🔍 Найти мастера по категории и городу</li>
      <li>📩 Отправить заявку на услугу</li>
      <li>💬 Написать мастеру в чат</li>
      <li>⭐ Оставить честный отзыв</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Найти мастера →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Добро пожаловать${ctx.userName ? `, ${ctx.userName}` : ''}! Начните поиск мастера: ${ctx.frontendUrl}/masters`,
  },
  en: {
    subject: 'Welcome to faber.md! 🎉',
    html: (ctx: TemplateContext) => `
    <p>Hello${ctx.userName ? `, ${ctx.userName}` : ''}!</p>
    <p>We're glad you joined faber.md — the platform for finding the best masters in Moldova.</p>
    <p><strong>What you can do:</strong></p>
    <ul>
      <li>🔍 Find a master by category and city</li>
      <li>📩 Send a service request</li>
      <li>💬 Chat with the master</li>
      <li>⭐ Leave an honest review</li>
    </ul>
    <p style="text-align:center; margin-top:24px;">
      <a href="${ctx.frontendUrl}/masters" class="btn">Find a master →</a>
    </p>
  `,
    text: (ctx: TemplateContext) =>
      `Welcome${ctx.userName ? `, ${ctx.userName}` : ''}! Start your search: ${ctx.frontendUrl}/masters`,
  },
};

const get = (ctx: TemplateContext) =>
  T[(ctx.lang as keyof typeof T) || 'ro'] ?? T.ro;

export const welcome1: TemplateFn = {
  subject: (ctx) => get(ctx).subject,
  html: (ctx) => get(ctx).html(ctx),
  text: (ctx) => get(ctx).text(ctx),
};
