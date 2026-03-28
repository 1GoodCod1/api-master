import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelegramConnectService } from './services/telegram-connect.service';
import type { TelegramWebhookBody } from '../types';
import { TelegramWebhookSecretGuard } from '../../../common/guards';
import { CONTROLLER_PATH } from '../../../common/constants';

@ApiTags('Webhook')
@Controller(CONTROLLER_PATH.telegramWebhook)
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
