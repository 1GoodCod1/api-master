import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { Prisma } from '@prisma/client';
import type { ChatUser } from '../chat.types';
import { CreateConversationDto } from '../dto';
import { decodeId } from '../../shared/utils/id-encoder';
import { checkConversationAccess } from '../utils/chat-access.util';
import {
  LEAD_SELECT_BASIC,
  CLIENT_SELECT_BASIC,
} from '../constants/chat-prisma.constants';

@Injectable()
export class ChatConversationService {
  private readonly logger = new Logger(ChatConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConversations(user: ChatUser) {
    const where: Prisma.ConversationWhereInput = {};

    if (user.role === 'MASTER') {
      const master = await this.prisma.master.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!master) {
        throw new NotFoundException('Master profile not found');
      }
      where.masterId = master.id;
    } else if (user.role === 'CLIENT') {
      where.clientId = user.id;
    } else if (user.role === 'ADMIN') {
      // ADMIN sees all conversations; no extra filter
    } else {
      throw new ForbiddenException('Invalid role');
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        lead: { select: LEAD_SELECT_BASIC },
        master: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
            isOnline: true,
            lastActivityAt: true,
            avatarFile: { select: { path: true } },
          },
        },
        client: { select: CLIENT_SELECT_BASIC },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            senderType: true,
            createdAt: true,
            readAt: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                readAt: null,
                ...(user.role === 'MASTER'
                  ? { senderType: 'CLIENT' }
                  : user.role === 'CLIENT'
                    ? { senderType: 'MASTER' }
                    : {}),
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      leadId: conv.leadId,
      lead: conv.lead,
      master: conv.master,
      client: conv.client,
      clientPhone: conv.clientPhone,
      lastMessage: conv.messages[0] || null,
      unreadCount: conv._count.messages,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      closedAt: conv.closedAt,
    }));
  }

  async getConversation(conversationId: string, user: ChatUser) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: { select: LEAD_SELECT_BASIC },
        master: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true } },
            isOnline: true,
            lastActivityAt: true,
            avatarFile: { select: { path: true } },
          },
        },
        client: { select: CLIENT_SELECT_BASIC },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    checkConversationAccess(conversation, user);

    return conversation;
  }

  async getConversationByLeadId(leadIdOrEncoded: string, user: ChatUser) {
    const leadId = decodeId(leadIdOrEncoded) || leadIdOrEncoded;
    const conversation = await this.prisma.conversation.findUnique({
      where: { leadId },
      include: {
        lead: { select: LEAD_SELECT_BASIC },
        master: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true } },
            isOnline: true,
            lastActivityAt: true,
            avatarFile: { select: { path: true } },
          },
        },
        client: { select: CLIENT_SELECT_BASIC },
      },
    });

    if (!conversation) {
      return null;
    }

    checkConversationAccess(conversation, user);

    return conversation;
  }

  async createConversation(dto: CreateConversationDto, user: ChatUser) {
    const leadId = decodeId(dto.leadId) || dto.leadId;
    const existing = await this.prisma.conversation.findUnique({
      where: { leadId },
    });

    if (existing) {
      return existing;
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        master: { select: { id: true, userId: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const isClient = user.role === 'CLIENT' && lead.clientId === user.id;
    const isMaster = user.role === 'MASTER' && lead.master.userId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isClient && !isMaster && !isAdmin) {
      throw new ForbiddenException('Access denied to this lead');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        leadId,
        masterId: lead.masterId,
        clientId: lead.clientId,
        clientPhone: lead.clientPhone,
      },
      include: {
        lead: { select: LEAD_SELECT_BASIC },
        master: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
            avatarFile: { select: { path: true } },
          },
        },
        client: { select: CLIENT_SELECT_BASIC },
      },
    });

    this.logger.log(
      `Conversation created: ${conversation.id} for lead ${dto.leadId}`,
    );

    return conversation;
  }

  async closeConversation(conversationId: string, user: ChatUser) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        master: { select: { id: true, userId: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMaster =
      user.role === 'MASTER' && conversation.master.userId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isMaster && !isAdmin) {
      throw new ForbiddenException(
        'Only master or admin can close conversation',
      );
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { closedAt: new Date() },
    });

    this.logger.log(`Conversation ${conversationId} closed by ${user.id}`);

    return updated;
  }

  async getUnreadCount(user: ChatUser) {
    const where: Prisma.MessageWhereInput = { readAt: null };

    if (user.role === 'MASTER') {
      const master = await this.prisma.master.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!master) return { count: 0 };

      where.conversation = { masterId: master.id };
      where.senderType = 'CLIENT';
    } else if (user.role === 'CLIENT') {
      where.conversation = { clientId: user.id };
      where.senderType = 'MASTER';
    } else {
      return { count: 0 };
    }

    const count = await this.prisma.message.count({ where });
    return { count };
  }
}
