import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';
import {
  isVipOrPremiumTariff,
  TELEGRAM_CONNECT_START_PREFIX,
  TELEGRAM_CONNECT_TOKEN_TTL_MINUTES,
  CONTROLLER_PATH,
} from '../../../../common/constants';
import { API_GLOBAL_PREFIX } from '../../../../config/http-app';
import { randomBytes } from 'crypto';
import axios from 'axios';
import type {
  TelegramConnectLink,
  TelegramWebhookBody,
  TelegramChatMemberUpdate,
} from '../../types';

@Injectable()
export class TelegramConnectService implements OnModuleInit {
  private readonly logger = new Logger(TelegramConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerWebhook();
  }

  private async registerWebhook(): Promise<void> {
    const botToken = this.configService.get<string>('telegram.botToken');
    const apiUrl = this.configService.get<string>('apiUrl');
    const webhookSecret = this.configService.get<string>(
      'telegram.webhookSecret',
    );

    if (!botToken || !apiUrl) {
      this.logger.warn(
        'Telegram webhook not registered: missing botToken or apiUrl',
      );
      return;
    }

    const webhookUrl = `${apiUrl}/${API_GLOBAL_PREFIX}/${CONTROLLER_PATH.telegramWebhook}`;

    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          url: webhookUrl,
          allowed_updates: ['message', 'my_chat_member'],
          ...(webhookSecret ? { secret_token: webhookSecret } : {}),
        },
        { timeout: 10000 },
      );
      this.logger.log(`Telegram webhook registered: ${webhookUrl}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to register Telegram webhook: ${msg}`);
    }
  }

  /**
   * Create a one-time token and return the Telegram connect link.
   * Premium (VIP/PREMIUM) masters only.
   */
  async createConnectLink(userId: string): Promise<TelegramConnectLink> {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, tariffType: true },
    });
    if (!master)
      throw AppErrors.forbidden(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);

    const isPremium = isVipOrPremiumTariff(master.tariffType);
    if (!isPremium) {
      throw AppErrors.forbidden(AppErrorMessages.TELEGRAM_PREMIUM_ONLY);
    }

    const botUsername = this.configService.get<string>('telegram.botUsername');
    if (!botUsername) {
      throw AppErrors.forbidden(AppErrorMessages.TELEGRAM_BOT_NOT_CONFIGURED);
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(
      Date.now() + TELEGRAM_CONNECT_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.prisma.telegramConnectToken.create({
      data: { token, masterId: master.id, expiresAt },
    });

    const link = `https://t.me/${botUsername.replace('@', '')}?start=${TELEGRAM_CONNECT_START_PREFIX}${token}`;

    return {
      link,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Handle incoming Telegram webhook update.
   * On /start connect_XXX: validate token, update master.telegramChatId, reply.
   */
  async handleWebhookUpdate(update: TelegramWebhookBody): Promise<void> {
    if (update.my_chat_member) {
      await this.handleChatMemberUpdate(update.my_chat_member);
      return;
    }

    const message = update.message;
    if (!message?.text?.startsWith('/start') || !message?.chat) return;

    const text = message.text.trim();
    const chatId = String(message.chat.id);

    if (!text.startsWith(`/start ${TELEGRAM_CONNECT_START_PREFIX}`)) {
      void this.sendTelegramReply(
        chatId,
        'Привет! Нажмите «Подключить Telegram» в настройках уведомлений на сайте, затем перейдите по полученной ссылке.',
      ).catch((e) => this.logger.warn('sendTelegramReply failed', e));
      return;
    }

    const tokenValue = text
      .slice(`/start ${TELEGRAM_CONNECT_START_PREFIX}`.length)
      .trim();
    if (!tokenValue) return;

    const record = await this.prisma.telegramConnectToken.findUnique({
      where: { token: tokenValue },
      select: { id: true, masterId: true, expiresAt: true },
    });

    if (!record) {
      void this.sendTelegramReply(
        chatId,
        'Ссылка недействительна или уже использована. Получите новую ссылку в настройках уведомлений.',
      ).catch((e) => this.logger.warn('sendTelegramReply failed', e));
      return;
    }

    if (new Date() > record.expiresAt) {
      await this.prisma.telegramConnectToken.delete({
        where: { id: record.id },
      });
      void this.sendTelegramReply(
        chatId,
        'Ссылка истекла. Получите новую ссылку в настройках уведомлений.',
      ).catch((e) => this.logger.warn('sendTelegramReply failed', e));
      return;
    }

    await this.prisma.$transaction([
      this.prisma.master.update({
        where: { id: record.masterId },
        data: { telegramChatId: chatId },
      }),
      this.prisma.telegramConnectToken.delete({
        where: { id: record.id },
      }),
    ]);

    this.logger.log(`Telegram connected for master ${record.masterId}`);
    void this.sendTelegramReply(
      chatId,
      '✅ Telegram подключен! Теперь вы будете получать уведомления о новых заявках здесь.',
    ).catch((e) => this.logger.warn('sendTelegramReply failed', e));
  }

  private async handleChatMemberUpdate(
    member: TelegramChatMemberUpdate,
  ): Promise<void> {
    if (!member.chat?.id || !member.new_chat_member) return;

    const { status } = member.new_chat_member;
    const chatId = String(member.chat.id);

    if (status === 'kicked' || status === 'left' || status === 'banned') {
      const updated = await this.prisma.master.updateMany({
        where: { telegramChatId: chatId },
        data: { telegramChatId: null },
      });
      if (updated.count > 0) {
        this.logger.log(
          `Telegram disconnected (bot ${status}) for chatId ${chatId}`,
        );
      }
    }
  }

  private async sendTelegramReply(chatId: string, text: string): Promise<void> {
    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) return;

    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        },
        { timeout: 5000 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to send Telegram reply: ${msg}`);
    }
  }
}
