import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { DEFAULT_APP_LOCALE, type AppLocale } from '../../common/constants';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {
    const smtp = this.configService.get<{
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
    }>('email.smtp');
    const enabled = this.configService.get<boolean>('email.enabled');

    if (enabled && smtp?.host && smtp?.user) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth:
          smtp.user && smtp.pass
            ? { user: smtp.user, pass: smtp.pass }
            : undefined,
      });
      this.logger.log('Email SMTP transporter initialized');
    } else {
      this.logger.log(
        'Email disabled or SMTP not configured; reset links will be logged in development',
      );
    }
  }

  /**
   * Отправить письмо со ссылкой для сброса пароля.
   * Использует шаблон password-reset.
   * @param lang — язык шаблона (en|ru|ro), по умолчанию ro
   */
  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    lang: AppLocale = DEFAULT_APP_LOCALE,
  ): Promise<void> {
    const rendered = await this.templateService.render('password-reset', {
      resetLink,
      lang,
    });
    const devLog =
      !this.transporter &&
      this.configService.get<string>('nodeEnv') === 'development'
        ? `[EMAIL NOT CONFIGURED] Password reset link for ${to}: ${resetLink}`
        : undefined;
    await this.sendEmail(
      to,
      rendered.subject,
      rendered.html,
      rendered.text,
      devLog,
    );
  }

  /**
   * Generic method to send any email.
   * Used by drip campaigns, notifications, and other modules.
   * @param devLogWhenNotConfigured — custom log message when SMTP disabled (e.g. reset link for debugging)
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    devLogWhenNotConfigured?: string,
  ): Promise<void> {
    const from =
      this.configService.get<string>('email.from') || 'noreply@master-hub.md';

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to, subject, html, text });
        this.logger.log(`Email sent to ${to}: "${subject}"`);
      } catch (err: any) {
        this.logger.error(`Failed to send email to ${to}:`, err);
        throw err;
      }
      return;
    }

    // SMTP не настроен: логируем в development
    if (this.configService.get<string>('nodeEnv') === 'development') {
      this.logger.warn(
        devLogWhenNotConfigured ??
          `[EMAIL NOT CONFIGURED] Would send to ${to}: "${subject}"`,
      );
    }
  }
}
