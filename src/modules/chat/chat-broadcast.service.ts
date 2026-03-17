import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { SendMessageOutcome } from './chat.types';

export const CHAT_BROADCAST_EVENT = 'chat.broadcast';

export interface ChatBroadcastPayload {
  conversationId: string;
  outcome: SendMessageOutcome;
}

/**
 * Отвечает за рассылку сообщений в реальном времени (WebSocket) и уведомления.
 * Emits events — ChatGateway subscribes and performs the actual WebSocket emit.
 * Event-based design breaks circular dep: ChatService -> ChatBroadcastService (no ChatGateway import).
 */
@Injectable()
export class ChatBroadcastService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Рассылает сообщения участникам чата: emit в room + уведомление офлайн-пользователям.
   */
  broadcastMessages(conversationId: string, outcome: SendMessageOutcome): void {
    this.eventEmitter.emit(CHAT_BROADCAST_EVENT, {
      conversationId,
      outcome,
    } satisfies ChatBroadcastPayload);
  }
}
