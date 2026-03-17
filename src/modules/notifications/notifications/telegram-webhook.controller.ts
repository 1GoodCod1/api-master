import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  TelegramConnectService,
  type TelegramWebhookBody,
} from './services/telegram-connect.service';
import { TelegramWebhookSecretGuard } from '../../../common/guards/telegram-webhook-secret.guard';

@ApiTags('Webhook')
@Controller('webhook/telegram')
@UseGuards(TelegramWebhookSecretGuard)
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(private readonly telegramConnect: TelegramConnectService) {}

  @Post()
  @ApiOperation({ summary: 'Telegram bot webhook (public)' })
  async handleWebhook(@Body() body: TelegramWebhookBody) {
    try {
      await this.telegramConnect.handleWebhookUpdate(body);
    } catch (err) {
      this.logger.error('Telegram webhook error:', err);
    }
    return { ok: true };
  }
}
