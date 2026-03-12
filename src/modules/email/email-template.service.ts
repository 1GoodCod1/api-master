import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/database/prisma.service';
import { sanitizeEmailHtml } from '../shared/utils/sanitize-html.util';
import { TEMPLATES } from './templates';
import type { TemplateContext } from './templates';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Recursively sanitize context values for safe HTML rendering.
 * Escapes strings at any nesting level; passes through primitives; recurses into objects/arrays.
 * Prevents XSS when templates render nested fields (e.g. metadata.foo).
 */
function sanitizeValue(v: unknown, visited = new WeakSet<object>()): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === 'string') return htmlEscape(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'object') {
    if (visited.has(v)) return v;
    visited.add(v);
    if (Array.isArray(v)) {
      return v.map((item) => sanitizeValue(item, visited));
    }
    if (Object.getPrototypeOf(v) === Object.prototype) {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] = sanitizeValue(val, visited);
      }
      return out;
    }
  }
  return v;
}

function sanitizeContext(ctx: TemplateContext): TemplateContext {
  return sanitizeValue(ctx, new WeakSet()) as TemplateContext;
}

/** Substitute {{placeholder}} in HTML with context values. Used for overrides. */
function substitutePlaceholders(
  html: string,
  ctx: Record<string, unknown>,
): string {
  const allowedKeys = [
    'resetLink',
    'frontendUrl',
    'userName',
    'masterName',
    'reviewLink',
    'dashboardLink',
  ];
  let result = html;
  for (const key of allowedKeys) {
    const val = ctx[key];
    if (val != null && typeof val === 'string') {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
  }
  return result;
}

@Injectable()
export class EmailTemplateService {
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    const fromConfig = this.configService.get<string>('frontendUrl', '');
    this.frontendUrl =
      fromConfig || (nodeEnv === 'production' ? '' : 'http://localhost:3000');
  }

  /**
   * Render email template by name.
   * Uses DB override if exists for (templateName, lang), else file template.
   * @param context.lang — язык (en|ru|ro), по умолчанию 'ro'
   */
  async render(
    templateName: string,
    context: TemplateContext = {},
  ): Promise<{ subject: string; html: string; text: string }> {
    const lang = (
      ['en', 'ru', 'ro'].includes(context.lang as string) ? context.lang : 'ro'
    ) as 'en' | 'ru' | 'ro';
    const raw = {
      ...context,
      frontendUrl: this.frontendUrl,
      lang,
    };
    const ctx = sanitizeContext(raw);

    const override = await this.prisma.emailTemplateOverride.findUnique({
      where: {
        templateId_lang: { templateId: templateName, lang },
      },
    });

    if (override && (override.subject != null || override.bodyHtml != null)) {
      const subject = override.subject ?? 'Master-Hub';
      let bodyHtml = override.bodyHtml
        ? sanitizeEmailHtml(override.bodyHtml)
        : '';
      bodyHtml = substitutePlaceholders(
        bodyHtml,
        ctx as Record<string, unknown>,
      );
      const text = bodyHtml ? stripHtml(bodyHtml) : '';
      return {
        subject,
        html: this.wrapLayout(bodyHtml || '<p></p>'),
        text: text || subject,
      };
    }

    const template = TEMPLATES[templateName];
    if (!template) {
      return {
        subject: 'Master-Hub',
        html: `<p>Шаблон не найден</p>`,
        text: `Template "${templateName}" not found`,
      };
    }
    return {
      subject: template.subject(ctx),
      html: this.wrapLayout(template.html(ctx)),
      text: template.text(ctx),
    };
  }

  /**
   * Render default template from file (no DB override).
   * Returns subject and bodyHtml (content only, no layout wrapper) for admin editing.
   */
  renderDefault(
    templateName: string,
    lang: 'en' | 'ru' | 'ro' = 'ro',
  ): { subject: string; bodyHtml: string } | null {
    const template = TEMPLATES[templateName];
    if (!template) return null;
    const ctx = sanitizeContext({
      frontendUrl: this.frontendUrl,
      lang,
      userName: undefined,
    });
    return {
      subject: template.subject(ctx),
      bodyHtml: template.html(ctx),
    };
  }

  /** List all template IDs available for overrides */
  getTemplateIds(): string[] {
    return Object.keys(TEMPLATES).sort();
  }

  private wrapLayout(bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 32px 24px; color: #333; line-height: 1.6; }
    .content p { margin: 0 0 16px; }
    .btn { display: inline-block; padding: 14px 32px; background: #f59e0b; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { padding: 24px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Master-Hub</h1></div>
    <div class="content">${bodyHtml}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MasterHub. Все права защищены.</p>
      <p><a href="${this.frontendUrl}" style="color:#f59e0b;">master-hub.md</a></p>
    </div>
  </div>
</body>
</html>`;
  }
}
