import { PrismaService } from '../shared/database/prisma.service';
import { RedisService } from '../shared/redis/redis.service';
import { CreateConversationDto, SendMessageDto } from './dto';
import { Prisma } from '@prisma/client';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CacheService } from '../shared/cache/cache.service';
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
export declare class ChatService {
    private readonly prisma;
    private readonly redis;
    private readonly cache;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService, cache: CacheService);
    private readonly autoresponderWindowSeconds;
    private readonly defaultAutoresponderMessage;
    getConversations(user: ChatUser): Promise<{
        id: string;
        leadId: string;
        lead: {
            id: string;
            message: string;
            status: import("@prisma/client").$Enums.LeadStatus;
            clientName: string | null;
            clientPhone: string;
        };
        master: {
            id: string;
            avatarFile: {
                path: string;
            } | null;
            user: {
                firstName: string | null;
                lastName: string | null;
            };
            isOnline: boolean;
            lastActivityAt: Date | null;
        };
        client: {
            id: string;
            email: string;
            avatarFile: {
                path: string;
            } | null;
        } | null;
        clientPhone: string | null;
        lastMessage: {
            id: string;
            createdAt: Date;
            readAt: Date | null;
            content: string;
            senderType: import("@prisma/client").$Enums.SenderType;
        };
        unreadCount: number;
        createdAt: Date;
        updatedAt: Date;
        closedAt: Date | null;
    }[]>;
    getConversation(conversationId: string, user: ChatUser): Promise<{
        master: {
            id: string;
            avatarFile: {
                path: string;
            } | null;
            user: {
                firstName: string | null;
                lastName: string | null;
            };
            userId: string;
            isOnline: boolean;
            lastActivityAt: Date | null;
        };
        lead: {
            id: string;
            message: string;
            status: import("@prisma/client").$Enums.LeadStatus;
            clientName: string | null;
            clientPhone: string;
        };
        client: {
            id: string;
            email: string;
            avatarFile: {
                path: string;
            } | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clientPhone: string | null;
        masterId: string;
        clientId: string | null;
        leadId: string;
        lastMessageAt: Date | null;
        closedAt: Date | null;
    }>;
    getMessages(conversationId: string, user: ChatUser, page?: number, limit?: number, cursor?: string): Promise<{
        messages: ({
            files: ({
                file: {
                    path: string;
                    id: string;
                    filename: string;
                    mimetype: string;
                    size: number;
                };
            } & {
                id: string;
                createdAt: Date;
                messageId: string;
                fileId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            readAt: Date | null;
            content: string;
            conversationId: string;
            senderId: string;
            senderType: import("@prisma/client").$Enums.SenderType;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            nextCursor: string | null;
        };
    }>;
    createConversation(dto: CreateConversationDto, user: ChatUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clientPhone: string | null;
        masterId: string;
        clientId: string | null;
        leadId: string;
        lastMessageAt: Date | null;
        closedAt: Date | null;
    }>;
    sendMessage(conversationId: string, dto: SendMessageDto, user: ChatUser): Promise<SendMessageOutcome>;
    private reserveAutoresponder;
    private createMasterMessage;
    markAsRead(conversationId: string, user: ChatUser): Promise<{
        count: number;
    }>;
    getConversationByLeadId(leadId: string, user: ChatUser): Promise<({
        master: {
            id: string;
            avatarFile: {
                path: string;
            } | null;
            user: {
                firstName: string | null;
                lastName: string | null;
            };
            userId: string;
            isOnline: boolean;
            lastActivityAt: Date | null;
        };
        lead: {
            id: string;
            message: string;
            status: import("@prisma/client").$Enums.LeadStatus;
            clientName: string | null;
            clientPhone: string;
        };
        client: {
            id: string;
            email: string;
            avatarFile: {
                path: string;
            } | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clientPhone: string | null;
        masterId: string;
        clientId: string | null;
        leadId: string;
        lastMessageAt: Date | null;
        closedAt: Date | null;
    }) | null>;
    closeConversation(conversationId: string, user: ChatUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        clientPhone: string | null;
        masterId: string;
        clientId: string | null;
        leadId: string;
        lastMessageAt: Date | null;
        closedAt: Date | null;
    }>;
    getUnreadCount(user: ChatUser): Promise<{
        count: number;
    }>;
    private checkConversationAccess;
    private checkLeadTransition;
}
export {};
