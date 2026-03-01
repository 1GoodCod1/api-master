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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const ws_jwt_guard_1 = require("../../common/guards/ws-jwt.guard");
const chat_service_1 = require("./chat.service");
const dto_1 = require("./dto");
const websocket_service_1 = require("../websocket/websocket.service");
const in_app_notification_service_1 = require("../notifications/services/in-app-notification.service");
const USER_ROLES = ['ADMIN', 'CLIENT', 'MASTER'];
function parseUserRole(value) {
    return USER_ROLES.includes(value)
        ? value
        : undefined;
}
let ChatGateway = ChatGateway_1 = class ChatGateway {
    chatService;
    websocketService;
    inAppNotifications;
    server;
    logger = new common_1.Logger(ChatGateway_1.name);
    userConversations = new Map();
    constructor(chatService, websocketService, inAppNotifications) {
        this.chatService = chatService;
        this.websocketService = websocketService;
        this.inAppNotifications = inAppNotifications;
    }
    afterInit(_server) {
        this.logger.log('Chat Gateway initialized');
    }
    handleConnection(client) {
        try {
            const token = (typeof client.handshake.auth?.token === 'string'
                ? client.handshake.auth.token
                : undefined) ??
                (typeof client.handshake.headers?.authorization === 'string'
                    ? client.handshake.headers.authorization.replace('Bearer ', '')
                    : undefined);
            if (!token) {
                this.logger.warn('Chat connection without token');
                client.disconnect();
                return;
            }
            this.logger.log(`Chat client connected: ${client.id}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Chat connection error: ${message}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const data = client.data;
        const userId = typeof data?.userId === 'string' ? data.userId : undefined;
        if (userId) {
            const userConvs = this.userConversations.get(userId);
            if (userConvs) {
                userConvs.forEach((convId) => {
                    void client.leave(`conversation:${convId}`);
                });
                this.userConversations.delete(userId);
            }
        }
        this.logger.log(`Chat client disconnected: ${client.id}`);
    }
    async handleJoinConversation(client, data) {
        try {
            const socketData = client.data;
            const userId = typeof socketData.userId === 'string' ? socketData.userId : undefined;
            const userRole = parseUserRole(typeof socketData.userRole === 'string' ? socketData.userRole : '');
            if (!userId || !userRole) {
                return { success: false, error: 'Unauthorized' };
            }
            const user = { id: userId, role: userRole };
            await this.chatService.getConversation(data.conversationId, user);
            void client.join(`conversation:${data.conversationId}`);
            if (!this.userConversations.has(userId)) {
                this.userConversations.set(userId, new Set());
            }
            this.userConversations.get(userId)?.add(data.conversationId);
            this.logger.log(`User ${userId} joined conversation ${data.conversationId}`);
            return { success: true, conversationId: data.conversationId };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error joining conversation: ${message}`);
            return { success: false, error: message };
        }
    }
    handleLeaveConversation(client, data) {
        const socketData = client.data;
        const userId = typeof socketData.userId === 'string' ? socketData.userId : undefined;
        void client.leave(`conversation:${data.conversationId}`);
        if (userId) {
            const userConvs = this.userConversations.get(userId);
            if (userConvs) {
                userConvs.delete(data.conversationId);
            }
        }
        this.logger.log(`User ${userId ?? 'unknown'} left conversation ${data.conversationId}`);
        return { success: true, conversationId: data.conversationId };
    }
    async handleSendMessage(client, data) {
        try {
            const socketData = client.data;
            const userId = typeof socketData.userId === 'string' ? socketData.userId : undefined;
            const userRole = parseUserRole(typeof socketData.userRole === 'string' ? socketData.userRole : '');
            if (!userId || !userRole) {
                return { success: false, error: 'Unauthorized' };
            }
            const user = { id: userId, role: userRole };
            const result = await this.chatService.sendMessage(data.conversationId, { content: data.content, fileIds: data.fileIds }, user);
            const { message, autoReply } = result;
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('chat:message', {
                ...message,
                conversationId: data.conversationId,
            });
            await this.notifyOfflineUser(message, data.conversationId);
            if (autoReply) {
                this.server
                    .to(`conversation:${data.conversationId}`)
                    .emit('chat:message', {
                    ...autoReply,
                    conversationId: data.conversationId,
                });
                await this.notifyOfflineUser(autoReply, data.conversationId);
            }
            this.logger.log(`Message sent in conversation ${data.conversationId}`);
            return { success: true, message };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error sending message: ${message}`);
            return { success: false, error: message };
        }
    }
    handleTyping(client, data) {
        const socketData = client.data;
        const userId = typeof socketData.userId === 'string' ? socketData.userId : undefined;
        const userRole = typeof socketData.userRole === 'string' ? socketData.userRole : undefined;
        client.to(`conversation:${data.conversationId}`).emit('chat:typing', {
            conversationId: data.conversationId,
            userId,
            userRole,
            isTyping: data.isTyping,
            timestamp: new Date().toISOString(),
        });
        return { success: true };
    }
    async handleMarkAsRead(client, data) {
        try {
            const socketData = client.data;
            const userId = typeof socketData.userId === 'string' ? socketData.userId : undefined;
            const userRole = parseUserRole(typeof socketData.userRole === 'string' ? socketData.userRole : '');
            if (!userId || !userRole) {
                return { success: false, error: 'Unauthorized' };
            }
            const user = { id: userId, role: userRole };
            const result = await this.chatService.markAsRead(data.conversationId, user);
            client.to(`conversation:${data.conversationId}`).emit('chat:read', {
                conversationId: data.conversationId,
                readBy: userId,
                timestamp: new Date().toISOString(),
            });
            return { success: true, ...result };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error marking as read: ${message}`);
            return { success: false, error: message };
        }
    }
    async notifyOfflineUser(message, conversationId) {
        try {
            const conversation = message.conversation;
            if (!conversation)
                return;
            const recipientUserId = message.senderType === 'MASTER'
                ? conversation.clientId
                : (conversation.masterUserId ?? null);
            if (recipientUserId) {
                await this.inAppNotifications
                    .notifyNewChatMessage(recipientUserId, {
                    conversationId,
                    messageId: message.id,
                    senderType: message.senderType,
                })
                    .catch((e) => {
                    const msg = e instanceof Error ? e.message : String(e);
                    this.logger.warn(`Failed to save in-app chat notification: ${msg}`);
                });
            }
        }
        catch (error) {
            const errMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error notifying offline user: ${errMessage}`);
        }
    }
    emitToConversation(conversationId, event, data) {
        this.server.to(`conversation:${conversationId}`).emit(event, data);
    }
    notifyNewMessage(message, conversationId) {
        void this.notifyOfflineUser(message, conversationId);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:join'),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:leave'),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:message'),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, dto_1.SendMessageWsDto]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing'),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, dto_1.TypingDto]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:read'),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkAsRead", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
        namespace: 'chat',
        transports: ['websocket', 'polling'],
        allowEIO3: true,
    }),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => websocket_service_1.WebsocketService))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => in_app_notification_service_1.InAppNotificationService))),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        websocket_service_1.WebsocketService,
        in_app_notification_service_1.InAppNotificationService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map