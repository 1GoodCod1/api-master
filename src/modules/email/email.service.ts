import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
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
   * Если SMTP не настроен — в development логирует ссылку с токеном для тестов.
   */
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const from =
      this.configService.get<string>('email.from') || 'noreply@moldmasters.md';

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject: 'MoldMasters: Сброс пароля',
          html: `
            <p>Здравствуйте.</p>
            <p>Вы запросили сброс пароля. Перейдите по ссылке (действует 1 час):</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
            <p>— MoldMasters</p>
          `,
          text: `Сброс пароля: ${resetLink}. Ссылка действует 1 час.`,
        });
        this.logger.log(`Password reset email sent to ${to}`);
      } catch (err: any) {
        this.logger.error(`Failed to send password reset email to ${to}:`, err);
        throw err;
      }
      return;
    }

    // SMTP не настроен: в development логируем ссылку для отладки
    if (this.configService.get<string>('nodeEnv') === 'development') {
      this.logger.warn(
        `[EMAIL NOT CONFIGURED] Password reset link for ${to}: ${resetLink}`,
      );
    }
  }

  /**
   * Generic method to send any email.
   * Used by drip campaigns, notifications, and other modules.
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    const from =
      this.configService.get<string>('email.from') || 'noreply@moldmasters.md';

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

    // SMTP not configured: log in development
    if (this.configService.get<string>('nodeEnv') === 'development') {
      this.logger.warn(
        `[EMAIL NOT CONFIGURED] Would send to ${to}: "${subject}"`,
      );
    }
  }
}
