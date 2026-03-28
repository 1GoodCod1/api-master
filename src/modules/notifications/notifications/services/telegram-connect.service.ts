import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';
import { isVipOrPremiumTariff } from '../../../shared/constants/tariff.constants';
import { randomBytes } from 'crypto';
import axios from 'axios';

const TOKEN_TTL_MINUTES = 15;
const CONNECT_PREFIX = 'connect_';

export interface TelegramConnectLink {
  link: string;
  expiresAt: string;
}

export interface TelegramWebhookBody {
  update_id?: number;
  message?: {
    message_id?: number;
    from?: { id: number; username?: string; first_name?: string };
    chat?: { id: number; type?: string };
    text?: string;
    date?: number;
  };
}

@Injectable()
export class TelegramConnectService {
  private readonly logger = new Logger(TelegramConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a one-time token and return the Telegram connect link.
   * Premium (VIP/PREMIUM) masters only.
   */
  async createConnectLink(userId: string): Promise<TelegramConnectLink> {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, tariffType: true },
    });
    if (!master) throw new ForbiddenException('Master profile not found');

    const isPremium = isVipOrPremiumTariff(master.tariffType);
    if (!isPremium) {
      throw new ForbiddenException(
        'Telegram connect is available for VIP and PREMIUM plans only',
      );
    }

    const botUsername = this.configService.get<string>('telegram.botUsername');
    if (!botUsername) {
      throw new ForbiddenException('Telegram bot is not configured');
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await this.prisma.telegramConnectToken.create({
      data: { token, masterId: master.id, expiresAt },
    });

    const link = `https://t.me/${botUsername.replace('@', '')}?start=${CONNECT_PREFIX}${token}`;

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
    const message = update.message;
    if (!message?.text?.startsWith('/start') || !message?.chat) return;

    const text = message.text.trim();
    const chatId = String(message.chat.id);

    if (!text.startsWith(`/start ${CONNECT_PREFIX}`)) {
      void this.sendTelegramReply(
        chatId,
        'Привет! Нажмите «Подключить Telegram» в настройках уведомлений на сайте, затем перейдите по полученной ссылке.',
      ).catch((e) => this.logger.warn('sendTelegramReply failed', e));
      return;
    }

    const tokenValue = text.slice(`/start ${CONNECT_PREFIX}`.length).trim();
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
