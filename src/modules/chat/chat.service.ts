import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { RedisService } from '../shared/redis/redis.service';
import { CreateConversationDto, SendMessageDto } from './dto';
import { Prisma, SenderType } from '@prisma/client';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { isOutOfHours } from './utils/is-out-of-hours.util';
import { CacheService } from '../shared/cache/cache.service';
import { sanitizeStrict } from '../shared/utils/sanitize-html.util';
import { decodeId } from '../shared/utils/id-encoder';

/** Minimal user for chat - HTTP has full JwtUser, WebSocket has { id, role } */
type ChatUser = Pick<JwtUser, 'id' | 'role'>;

type MessageWithFiles = Prisma.MessageGetPayload<{
  include: {
    files: {
      include: {
        file: {
          select: {
            id: true;
            filename: true;
            path: true;
            mimetype: true;
            size: true;
          };
        };
      };
    };
  };
}>;

type ConversationInfo = {
  id: string;
  masterId: string;
  clientId: string | null;
  masterUserId: string;
};

export type OutgoingChatMessage = MessageWithFiles & {
  conversation: ConversationInfo;
};

export type SendMessageOutcome = {
  message: OutgoingChatMessage;
  autoReply?: OutgoingChatMessage;
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly cache: CacheService,
  ) {}

  private readonly autoresponderWindowSeconds = 3 * 60 * 60; // 3h
  private readonly defaultAutoresponderMessage =
    'Спасибо за обращение! Сейчас я вне рабочих часов и отвечу в ближайшее время.';

  /**
   * Get all conversations for a user (master or client)
   */
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
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            message: true,
            status: true,
          },
        },
        master: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
            isOnline: true,
            lastActivityAt: true,
            avatarFile: {
              select: { path: true },
            },
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            avatarFile: {
              select: { path: true },
            },
          },
        },
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

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string, user: ChatUser) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            message: true,
            status: true,
          },
        },
        master: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true } },
            isOnline: true,
            lastActivityAt: true,
            avatarFile: {
              select: { path: true },
            },
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            avatarFile: {
              select: { path: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    this.checkConversationAccess(conversation, user);

    return conversation;
  }

  /**
   * Get messages for a conversation with pagination
   */
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

    this.checkConversationAccess(conversation, user);

    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (Math.max(1, Number(page) || 1) - 1) * safeLimit;

    const baseWhere: Prisma.MessageWhereInput = { conversationId };
    let where: Prisma.MessageWhereInput = baseWhere;

    // Cursor-based: pass message id to fetch older messages
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

    const includeFiles = {
      files: {
        include: {
          file: {
            select: {
              id: true,
              filename: true,
              path: true,
              mimetype: true,
              size: true,
            },
          },
        },
      },
    } as const;

    const [messagesDesc, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: includeFiles,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(cursor ? { take: safeLimit + 1 } : { skip, take: safeLimit }),
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    // If cursor-based, we fetched limit+1 to know if there's more.
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

  /**
   * Create a new conversation for a lead
   */
  async createConversation(dto: CreateConversationDto, user: ChatUser) {
    const leadId = decodeId(dto.leadId) || dto.leadId;
    const existing = await this.prisma.conversation.findUnique({
      where: { leadId },
    });

    if (existing) {
      return existing;
    }

    // Get the lead
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
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            message: true,
            status: true,
          },
        },
        master: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
            avatarFile: {
              select: { path: true },
            },
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            avatarFile: {
              select: { path: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `Conversation created: ${conversation.id} for lead ${dto.leadId}`,
    );

    return conversation;
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    user: ChatUser,
  ): Promise<SendMessageOutcome> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        master: {
          select: {
            id: true,
            userId: true,
            workStartHour: true,
            workEndHour: true,
            autoresponderEnabled: true,
            autoresponderMessage: true,
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

    this.checkConversationAccess(conversation, user);

    const senderType: SenderType =
      user.role === 'MASTER' && conversation.master.userId === user.id
        ? 'MASTER'
        : 'CLIENT';

    // SECURITY: Validate that all fileIds belong to the current user
    // This prevents ID-shuffling attacks where one can attach other people's private files to a message.
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
              create: dto.fileIds.map((fileId) => ({
                fileId,
              })),
            }
          : undefined,
      },
      include: {
        files: {
          include: {
            file: {
              select: {
                id: true,
                filename: true,
                path: true,
                mimetype: true,
                size: true,
              },
            },
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(
      `Message sent in conversation ${conversationId} by ${senderType}`,
    );

    // Auto-transition lead status NEW -> IN_PROGRESS on first exchange
    void this.checkLeadTransition(conversationId);

    const conversationInfo: ConversationInfo = {
      id: conversation.id,
      masterId: conversation.masterId,
      clientId: conversation.clientId,
      masterUserId: conversation.master.userId,
    };
    const primary: OutgoingChatMessage = {
      ...message,
      conversation: conversationInfo,
    };

    if (
      senderType === 'CLIENT' &&
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
          return { message: primary, autoReply };
        }
      }
    }

    return { message: primary };
  }

  private async reserveAutoresponder(conversationId: string): Promise<boolean> {
    const key = `cache:chat:autoresponder:${conversationId}`;
    const n = await this.redis.incr(key);
    if (n !== 1) return false;
    await this.redis.expire(key, this.autoresponderWindowSeconds);
    return true;
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
      },
      include: {
        files: {
          include: {
            file: {
              select: {
                id: true,
                filename: true,
                path: true,
                mimetype: true,
                size: true,
              },
            },
          },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    void this.checkLeadTransition(conversationId);

    return { ...message, conversation: conversationInfo };
  }

  /**
   * Mark messages as read
   */
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

    this.checkConversationAccess(conversation, user);

    const senderTypeToMark: SenderType =
      user.role === 'MASTER' && conversation.master.userId === user.id
        ? 'CLIENT'
        : 'MASTER';

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

  /**
   * Get conversation by lead ID
   */
  async getConversationByLeadId(leadIdOrEncoded: string, user: ChatUser) {
    const leadId = decodeId(leadIdOrEncoded) || leadIdOrEncoded;
    const conversation = await this.prisma.conversation.findUnique({
      where: { leadId },
      include: {
        lead: {
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            message: true,
            status: true,
          },
        },
        master: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true } },
            isOnline: true,
            lastActivityAt: true,
            avatarFile: {
              select: { path: true },
            },
          },
        },
        client: {
          select: {
            id: true,
            email: true,
            avatarFile: {
              select: { path: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return null;
    }

    this.checkConversationAccess(conversation, user);

    return conversation;
  }

  /**
   * Close a conversation
   */
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

  /**
   * Get unread count for user
   */
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

  /**
   * Check if user has access to conversation
   */
  private checkConversationAccess(
    conversation: {
      masterId: string;
      clientId: string | null;
      master?: { userId: string };
    },
    user: ChatUser,
  ) {
    if (user.role === 'ADMIN') {
      return;
    }

    const masterUserId = conversation.master?.userId;

    if (user.role === 'MASTER') {
      if (masterUserId !== user.id) {
        throw new ForbiddenException('Access denied to this conversation');
      }
    } else if (user.role === 'CLIENT') {
      if (conversation.clientId !== user.id) {
        throw new ForbiddenException('Access denied to this conversation');
      }
    } else {
      throw new ForbiddenException('Invalid role');
    }
  }

  /**
   * Проверка возможности перевода лида NEW -> IN_PROGRESS при обмене сообщениями.
   */
  private async checkLeadTransition(conversationId: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          id: true,
          leadId: true,
          masterId: true,
          lead: {
            select: { status: true },
          },
        },
      });

      if (!conversation?.leadId || conversation.lead?.status !== 'NEW') {
        return;
      }

      // Проверяем наличие сообщений от обеих сторон
      const [msgMaster, msgClient] = await Promise.all([
        this.prisma.message.findFirst({
          where: { conversationId, senderType: SenderType.MASTER },
          select: { id: true },
        }),
        this.prisma.message.findFirst({
          where: { conversationId, senderType: SenderType.CLIENT },
          select: { id: true },
        }),
      ]);

      if (msgMaster && msgClient) {
        await this.prisma.lead.update({
          where: { id: conversation.leadId },
          data: {
            status: 'IN_PROGRESS',
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Lead ${conversation.leadId} auto-transitioned to IN_PROGRESS due to chat message exchange`,
        );

        // Инвалидация кеша (аналогично LeadsActionsService)
        await this.cache.invalidate(
          `cache:master:${conversation.masterId}:leads:*`,
        );
        await this.cache.del(
          this.cache.keys.masterStats(conversation.masterId),
        );
        await this.cache.invalidate(`cache:master:${conversation.masterId}:*`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to check lead transition for conversation ${conversationId}:`,
        error,
      );
    }
  }
}
