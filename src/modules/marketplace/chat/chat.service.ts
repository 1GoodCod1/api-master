import { Injectable } from '@nestjs/common';
import type { ChatUser } from './chat.types';
import { CreateConversationDto, SendMessageDto } from './dto';
import { ChatConversationService } from './services/chat-conversation.service';
import { ChatMessageService } from './services/chat-message.service';

/**
 * Facade for chat operations. Delegates to specialized services.
 * Keeps public API stable for ChatController and ChatGateway.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly conversationService: ChatConversationService,
    private readonly messageService: ChatMessageService,
  ) {}

  async getConversations(user: ChatUser) {
    return this.conversationService.getConversations(user);
  }

  async getConversation(conversationId: string, user: ChatUser) {
    return this.conversationService.getConversation(conversationId, user);
  }

  async getMessages(
    conversationId: string,
    user: ChatUser,
    page: number = 1,
    limit: number = 50,
    cursor?: string,
  ) {
    return this.messageService.getMessages(
      conversationId,
      user,
      page,
      limit,
      cursor,
    );
  }

  async createConversation(dto: CreateConversationDto, user: ChatUser) {
    return this.conversationService.createConversation(dto, user);
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    user: ChatUser,
  ) {
    return this.messageService.sendMessage(conversationId, dto, user);
  }

  async markAsRead(conversationId: string, user: ChatUser) {
    return this.messageService.markAsRead(conversationId, user);
  }

  async getConversationByLeadId(leadIdOrEncoded: string, user: ChatUser) {
    return this.conversationService.getConversationByLeadId(
      leadIdOrEncoded,
      user,
    );
  }

  async closeConversation(conversationId: string, user: ChatUser) {
    return this.conversationService.closeConversation(conversationId, user);
  }

  async getUnreadCount(user: ChatUser) {
    return this.conversationService.getUnreadCount(user);
  }
}
