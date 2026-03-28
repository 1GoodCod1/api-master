import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_DESC } from '../../../shared/constants/sort-order.constants';
import { RedisService } from '../../../shared/redis/redis.service';
import { Prisma, SenderType, UserRole } from '@prisma/client';
import type {
  ChatUser,
  ConversationInfo,
  MessageWithFiles,
  OutgoingChatMessage,
  SendMessageOutcome,
} from '../chat.types';
import { SendMessageDto } from '../dto';
import { sanitizeStrict } from '../../../shared/utils/sanitize-html.util';
import { checkConversationAccess } from '../utils/chat-access.util';
import { isOutOfHours } from '../utils/is-out-of-hours.util';
import { ChatBroadcastService } from '../chat-broadcast.service';
import { ChatLeadTransitionService } from './chat-lead-transition.service';
import { MESSAGE_INCLUDE_FILES } from '../constants/chat-prisma.constants';

@Injectable()
export class ChatMessageService {
  private readonly logger = new Logger(ChatMessageService.name);

  private readonly autoresponderWindowSeconds = 3 * 60 * 60; // 3h
  private readonly defaultAutoresponderMessage =
    'Спасибо за обращение! Сейчас я вне рабочих часов и отвечу в ближайшее время.';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly chatBroadcast: ChatBroadcastService,
    private readonly leadTransition: ChatLeadTransitionService,
  ) {}

  async getMessages(
    conversationId: string,
    user: ChatUser,
    page: number = 1,
    limit: number = 50,
    cursor?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        master: { select: { id: true, userId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    checkConversationAccess(conversation, user);

    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (Math.max(1, Number(page) || 1) - 1) * safeLimit;

    const baseWhere: Prisma.MessageWhereInput = { conversationId };
    let where: Prisma.MessageWhereInput = baseWhere;

    if (cursor && typeof cursor === 'string' && cursor.length >= 8) {
      const cursorMsg = await this.prisma.message.findUnique({
        where: { id: cursor },
        select: { id: true, createdAt: true },
      });
      if (cursorMsg) {
        where = {
          ...baseWhere,
          OR: [
            { createdAt: { lt: cursorMsg.createdAt } },
            { createdAt: cursorMsg.createdAt, id: { lt: cursorMsg.id } },
          ],
        };
      }
    }

    const [messagesDesc, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: MESSAGE_INCLUDE_FILES,
        orderBy: [{ createdAt: SORT_DESC }, { id: SORT_DESC }],
        ...(cursor ? { take: safeLimit + 1 } : { skip, take: safeLimit }),
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    let nextCursor: string | null = null;
    let pageMessages = messagesDesc;
    if (cursor) {
      if (pageMessages.length > safeLimit) {
        pageMessages = pageMessages.slice(0, safeLimit);
        nextCursor = pageMessages.at(-1)?.id ?? null;
      }
    }

    return {
      messages: pageMessages.reverse(),
      pagination: {
        page: cursor ? Math.floor(skip / safeLimit) + 1 : page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        nextCursor,
      },
    };
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    user: ChatUser,
  ): Promise<SendMessageOutcome> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: { select: { clientPhone: true, clientName: true } },
        master: {
          select: {
            id: true,
            userId: true,
            workStartHour: true,
            workEndHour: true,
            autoresponderEnabled: true,
            autoresponderMessage: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.closedAt) {
      throw new BadRequestException('Conversation is closed');
    }

    checkConversationAccess(conversation, user);

    const senderType: SenderType =
      user.role === UserRole.MASTER && conversation.master.userId === user.id
        ? SenderType.MASTER
        : SenderType.CLIENT;

    if (dto.fileIds?.length) {
      const filesCount = await this.prisma.file.count({
        where: {
          id: { in: dto.fileIds },
          uploadedById: user.id,
        },
      });

      if (filesCount !== dto.fileIds.length) {
        throw new ForbiddenException(
          'Invalid file IDs provided - some files do not belong to you',
        );
      }
    }

    const sanitizedContent = sanitizeStrict(dto.content?.trim() ?? '');

    const message: MessageWithFiles = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        senderType,
        content: sanitizedContent,
        files: dto.fileIds?.length
          ? {
              create: dto.fileIds.map((fileId) => ({ fileId })),
            }
          : undefined,
      },
      include: MESSAGE_INCLUDE_FILES,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(
      `Message sent in conversation ${conversationId} by ${senderType}`,
    );

    void this.leadTransition
      .checkAndTransition(conversationId)
      .catch((e) => this.logger.error('checkLeadTransition failed', e));

    const conversationInfo = this.buildConversationInfo(conversation);
    const primary: OutgoingChatMessage = {
      ...message,
      conversation: conversationInfo,
    };

    if (
      senderType === SenderType.CLIENT &&
      conversation.master.autoresponderEnabled === true &&
      isOutOfHours(
        conversation.master.workStartHour,
        conversation.master.workEndHour,
      )
    ) {
      const allowed = await this.reserveAutoresponder(conversationId);
      if (allowed) {
        const content =
          conversation.master.autoresponderMessage?.trim() ||
          this.defaultAutoresponderMessage;
        if (content) {
          const autoReply = await this.createMasterMessage(
            conversationId,
            conversation.master.userId,
            content,
            conversationInfo,
          );
          this.chatBroadcast.broadcastMessages(conversationId, {
            message: primary,
            autoReply,
          });
          return { message: primary, autoReply };
        }
      }
    }

    this.chatBroadcast.broadcastMessages(conversationId, { message: primary });
    return { message: primary };
  }

  async markAsRead(conversationId: string, user: ChatUser) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        master: { select: { id: true, userId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    checkConversationAccess(conversation, user);

    const senderTypeToMark: SenderType =
      user.role === UserRole.MASTER && conversation.master.userId === user.id
        ? SenderType.CLIENT
        : SenderType.MASTER;

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderType: senderTypeToMark,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    this.logger.log(
      `Marked ${result.count} messages as read in conversation ${conversationId}`,
    );

    return { count: result.count };
  }

  private async reserveAutoresponder(conversationId: string): Promise<boolean> {
    const key = `cache:chat:autoresponder:${conversationId}`;
    const n = await this.redis.incr(key);
    if (n !== 1) return false;
    await this.redis.expire(key, this.autoresponderWindowSeconds);
    return true;
  }

  private buildConversationInfo(conversation: {
    id: string;
    masterId: string;
    clientId: string | null;
    clientPhone: string | null;
    lead?: { clientPhone?: string | null; clientName?: string | null };
    master: {
      userId: string;
      user?: { firstName?: string | null; lastName?: string | null } | null;
    };
  }): ConversationInfo {
    const masterName = [
      conversation.master.user?.firstName,
      conversation.master.user?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    return {
      id: conversation.id,
      masterId: conversation.masterId,
      clientId: conversation.clientId,
      clientPhone:
        conversation.clientPhone ?? conversation.lead?.clientPhone ?? null,
      clientName: conversation.lead?.clientName ?? undefined,
      masterUserId: conversation.master.userId,
      masterName: masterName || undefined,
    };
  }

  private async createMasterMessage(
    conversationId: string,
    masterUserId: string,
    content: string,
    conversationInfo: ConversationInfo,
  ): Promise<OutgoingChatMessage> {
    const message: MessageWithFiles = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: masterUserId,
        senderType: SenderType.MASTER,
        content,
        isAutoresponder: true,
      },
      include: MESSAGE_INCLUDE_FILES,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    void this.leadTransition
      .checkAndTransition(conversationId)
      .catch((e) => this.logger.error('checkLeadTransition failed', e));

    return { ...message, conversation: conversationInfo };
  }
}
