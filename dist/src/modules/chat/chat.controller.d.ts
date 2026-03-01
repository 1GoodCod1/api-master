import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateConversationDto, SendMessageDto } from './dto';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';
export declare class ChatController {
    private readonly chatService;
    private readonly chatGateway;
    constructor(chatService: ChatService, chatGateway: ChatGateway);
    getConversations(req: RequestWithUser): Promise<{
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
    getUnreadCount(req: RequestWithUser): Promise<{
        count: number;
    }>;
    getConversationByLeadId(leadId: string, req: RequestWithUser): Promise<({
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
    getConversation(id: string, req: RequestWithUser): Promise<{
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
    getMessages(id: string, req: RequestWithUser, page?: string, limit?: string, cursor?: string): Promise<{
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
    createConversation(dto: CreateConversationDto, req: RequestWithUser): Promise<{
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
    sendMessage(id: string, dto: SendMessageDto, req: RequestWithUser): Promise<import("./chat.service").OutgoingChatMessage>;
    markAsRead(id: string, req: RequestWithUser): Promise<{
        count: number;
    }>;
    closeConversation(id: string, req: RequestWithUser): Promise<{
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
}
