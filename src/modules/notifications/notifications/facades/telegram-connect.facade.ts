import { Injectable } from '@nestjs/common';
import type { TelegramConnectLink } from '../../types';
import { TelegramConnectService } from '../services/telegram-connect.service';

/**
 * Публичный контракт для привязки Telegram (Premium мастера).
 */
@Injectable()
export class TelegramConnectFacade {
  constructor(private readonly telegramConnect: TelegramConnectService) {}

  createConnectLink(userId: string): Promise<TelegramConnectLink> {
    return this.telegramConnect.createConnectLink(userId);
  }
}
