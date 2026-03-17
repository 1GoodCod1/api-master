import { Injectable } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import type { OutgoingChatMessage, SendMessageOutcome } from './chat.service';

/**
 * Отвечает за рассылку сообщений в реальном времени (WebSocket) и уведомления.
 * Вынесено из контроллера для соблюдения SRP.
 */
@Injectable()
export class ChatBroadcastService {
  constructor(private readonly chatGateway: ChatGateway) {}

  /**
   * Рассылает сообщения участникам чата: emit в room + уведомление офлайн-пользователям.
   */
  broadcastMessages(conversationId: string, outcome: SendMessageOutcome): void {
    const { message: primary, autoReply } = outcome;

    this.emitAndNotify(conversationId, primary);
    if (autoReply) {
      this.emitAndNotify(conversationId, autoReply);
    }
  }

  private emitAndNotify(
    conversationId: string,
    msg: OutgoingChatMessage,
  ): void {
    this.chatGateway.emitToConversation(conversationId, 'chat:message', {
      ...msg,
      conversationId,
    });
    this.chatGateway.notifyNewMessage(msg, conversationId);
  }
}
