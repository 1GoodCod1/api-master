import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Проверяет X-Telegram-Bot-Api-Secret-Token при вызове setWebhook.
 * Если TELEGRAM_WEBHOOK_SECRET задан — требует совпадения заголовка.
 * Если не задан (dev) — пропускает запрос.
 */
@Injectable()
export class TelegramWebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get<string>('telegram.webhookSecret', '');
    if (!secret) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['x-telegram-bot-api-secret-token'] as
      | string
      | undefined;

    if (header !== secret) {
      throw new ForbiddenException('Invalid webhook secret');
    }
    return true;
  }
}
