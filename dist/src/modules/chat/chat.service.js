"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../shared/database/prisma.service");
const redis_service_1 = require("../shared/redis/redis.service");
const client_1 = require("@prisma/client");
const is_out_of_hours_util_1 = require("./utils/is-out-of-hours.util");
const cache_service_1 = require("../shared/cache/cache.service");
const sanitize_html_util_1 = require("../shared/utils/sanitize-html.util");
let ChatService = ChatService_1 = class ChatService {
    prisma;
    redis;
    cache;
    logger = new common_1.Logger(ChatService_1.name);
    constructor(prisma, redis, cache) {
        this.prisma = prisma;
        this.redis = redis;
        this.cache = cache;
    }
    autoresponderWindowSeconds = 3 * 60 * 60;
    defaultAutoresponderMessage = 'Спасибо за обращение! Сейчас я вне рабочих часов и отвечу в ближайшее время.';
    async getConversations(user) {
        const where = {};
        if (user.role === 'MASTER') {
            const master = await this.prisma.master.findUnique({
                where: { userId: user.id },
                select: { id: true },
            });
            if (!master) {
                throw new common_1.NotFoundException('Master profile not found');
            }
            where.masterId = master.id;
        }
        else if (user.role === 'CLIENT') {
            where.clientId = user.id;
        }
        else if (user.role === 'ADMIN') {
        }
        else {
            throw new common_1.ForbiddenException('Invalid role');
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
    async getConversation(conversationId, user) {
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
            throw new common_1.NotFoundException('Conversation not found');
        }
        this.checkConversationAccess(conversation, user);
        return conversation;
    }
    async getMessages(conversationId, user, page = 1, limit = 50, cursor) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                master: { select: { id: true, userId: true } },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        this.checkConversationAccess(conversation, user);
        const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
        const skip = (Math.max(1, Number(page) || 1) - 1) * safeLimit;
        const baseWhere = { conversationId };
        let where = baseWhere;
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
        };
        const [messagesDesc, total] = await Promise.all([
            this.prisma.message.findMany({
                where,
                include: includeFiles,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                ...(cursor ? { take: safeLimit + 1 } : { skip, take: safeLimit }),
            }),
            this.prisma.message.count({ where: { conversationId } }),
        ]);
        let nextCursor = null;
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
    async createConversation(dto, user) {
        const existing = await this.prisma.conversation.findUnique({
            where: { leadId: dto.leadId },
        });
        if (existing) {
            return existing;
        }
        const lead = await this.prisma.lead.findUnique({
            where: { id: dto.leadId },
            include: {
                master: { select: { id: true, userId: true } },
            },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        const isClient = user.role === 'CLIENT' && lead.clientId === user.id;
        const isMaster = user.role === 'MASTER' && lead.master.userId === user.id;
        const isAdmin = user.role === 'ADMIN';
        if (!isClient && !isMaster && !isAdmin) {
            throw new common_1.ForbiddenException('Access denied to this lead');
        }
        const conversation = await this.prisma.conversation.create({
            data: {
                leadId: dto.leadId,
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
        this.logger.log(`Conversation created: ${conversation.id} for lead ${dto.leadId}`);
        return conversation;
    }
    async sendMessage(conversationId, dto, user) {
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
            throw new common_1.NotFoundException('Conversation not found');
        }
        if (conversation.closedAt) {
            throw new common_1.BadRequestException('Conversation is closed');
        }
        this.checkConversationAccess(conversation, user);
        const senderType = user.role === 'MASTER' && conversation.master.userId === user.id
            ? 'MASTER'
            : 'CLIENT';
        const sanitizedContent = (0, sanitize_html_util_1.sanitizeStrict)(dto.content?.trim() ?? '');
        const message = await this.prisma.message.create({
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
        this.logger.log(`Message sent in conversation ${conversationId} by ${senderType}`);
        void this.checkLeadTransition(conversationId);
        const conversationInfo = {
            id: conversation.id,
            masterId: conversation.masterId,
            clientId: conversation.clientId,
            masterUserId: conversation.master.userId,
        };
        const primary = {
            ...message,
            conversation: conversationInfo,
        };
        if (senderType === 'CLIENT' &&
            conversation.master.autoresponderEnabled === true &&
            (0, is_out_of_hours_util_1.isOutOfHours)(conversation.master.workStartHour, conversation.master.workEndHour)) {
            const allowed = await this.reserveAutoresponder(conversationId);
            if (allowed) {
                const content = conversation.master.autoresponderMessage?.trim() ||
                    this.defaultAutoresponderMessage;
                if (content) {
                    const autoReply = await this.createMasterMessage(conversationId, conversation.master.userId, content, conversationInfo);
                    return { message: primary, autoReply };
                }
            }
        }
        return { message: primary };
    }
    async reserveAutoresponder(conversationId) {
        const key = `cache:chat:autoresponder:${conversationId}`;
        const n = await this.redis.incr(key);
        if (n !== 1)
            return false;
        await this.redis.expire(key, this.autoresponderWindowSeconds);
        return true;
    }
    async createMasterMessage(conversationId, masterUserId, content, conversationInfo) {
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                senderId: masterUserId,
                senderType: client_1.SenderType.MASTER,
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
    async markAsRead(conversationId, user) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                master: { select: { id: true, userId: true } },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        this.checkConversationAccess(conversation, user);
        const senderTypeToMark = user.role === 'MASTER' && conversation.master.userId === user.id
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
        this.logger.log(`Marked ${result.count} messages as read in conversation ${conversationId}`);
        return { count: result.count };
    }
    async getConversationByLeadId(leadId, user) {
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
    async closeConversation(conversationId, user) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                master: { select: { id: true, userId: true } },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const isMaster = user.role === 'MASTER' && conversation.master.userId === user.id;
        const isAdmin = user.role === 'ADMIN';
        if (!isMaster && !isAdmin) {
            throw new common_1.ForbiddenException('Only master or admin can close conversation');
        }
        const updated = await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { closedAt: new Date() },
        });
        this.logger.log(`Conversation ${conversationId} closed by ${user.id}`);
        return updated;
    }
    async getUnreadCount(user) {
        const where = { readAt: null };
        if (user.role === 'MASTER') {
            const master = await this.prisma.master.findUnique({
                where: { userId: user.id },
                select: { id: true },
            });
            if (!master)
                return { count: 0 };
            where.conversation = { masterId: master.id };
            where.senderType = 'CLIENT';
        }
        else if (user.role === 'CLIENT') {
            where.conversation = { clientId: user.id };
            where.senderType = 'MASTER';
        }
        else {
            return { count: 0 };
        }
        const count = await this.prisma.message.count({ where });
        return { count };
    }
    checkConversationAccess(conversation, user) {
        if (user.role === 'ADMIN') {
            return;
        }
        const masterUserId = conversation.master?.userId;
        if (user.role === 'MASTER') {
            if (masterUserId !== user.id) {
                throw new common_1.ForbiddenException('Access denied to this conversation');
            }
        }
        else if (user.role === 'CLIENT') {
            if (conversation.clientId !== user.id) {
                throw new common_1.ForbiddenException('Access denied to this conversation');
            }
        }
        else {
            throw new common_1.ForbiddenException('Invalid role');
        }
    }
    async checkLeadTransition(conversationId) {
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
            const [msgMaster, msgClient] = await Promise.all([
                this.prisma.message.findFirst({
                    where: { conversationId, senderType: client_1.SenderType.MASTER },
                    select: { id: true },
                }),
                this.prisma.message.findFirst({
                    where: { conversationId, senderType: client_1.SenderType.CLIENT },
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
                this.logger.log(`Lead ${conversation.leadId} auto-transitioned to IN_PROGRESS due to chat message exchange`);
                await this.cache.invalidate(`cache:master:${conversation.masterId}:leads:*`);
                await this.cache.del(this.cache.keys.masterStats(conversation.masterId));
            }
        }
        catch (error) {
            this.logger.error(`Failed to check lead transition for conversation ${conversationId}:`, error);
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        cache_service_1.CacheService])
], ChatService);
//# sourceMappingURL=chat.service.js.map