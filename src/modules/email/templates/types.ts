import type { AppLocale } from '../../../common/constants';

export type EmailLang = AppLocale;

export interface TemplateContext {
  userName?: string;
  masterName?: string;
  leadId?: string;
  resetLink?: string;
  reviewLink?: string;
  dashboardLink?: string;
  frontendUrl?: string;
  lang?: EmailLang; // язык шаблона (из user.preferredLanguage)
  [key: string]: unknown;
}

export interface TemplateFn {
  subject: (ctx: TemplateContext) => string;
  html: (ctx: TemplateContext) => string;
  text: (ctx: TemplateContext) => string;
}
