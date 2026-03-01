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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const chat_service_1 = require("./chat.service");
const chat_gateway_1 = require("./chat.gateway");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
let ChatController = class ChatController {
    chatService;
    chatGateway;
    constructor(chatService, chatGateway) {
        this.chatService = chatService;
        this.chatGateway = chatGateway;
    }
    async getConversations(req) {
        return this.chatService.getConversations(req.user);
    }
    async getUnreadCount(req) {
        return this.chatService.getUnreadCount(req.user);
    }
    async getConversationByLeadId(leadId, req) {
        return this.chatService.getConversationByLeadId(leadId, req.user);
    }
    async getConversation(id, req) {
        return this.chatService.getConversation(id, req.user);
    }
    async getMessages(id, req, page, limit, cursor) {
        return this.chatService.getMessages(id, req.user, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50, cursor);
    }
    async createConversation(dto, req) {
        return this.chatService.createConversation(dto, req.user);
    }
    async sendMessage(id, dto, req) {
        const { message: primary, autoReply } = await this.chatService.sendMessage(id, dto, req.user);
        this.chatGateway.emitToConversation(id, 'chat:message', {
            ...primary,
            conversationId: id,
        });
        this.chatGateway.notifyNewMessage(primary, id);
        if (autoReply) {
            this.chatGateway.emitToConversation(id, 'chat:message', {
                ...autoReply,
                conversationId: id,
            });
            this.chatGateway.notifyNewMessage(autoReply, id);
        }
        return primary;
    }
    async markAsRead(id, req) {
        return this.chatService.markAsRead(id, req.user);
    }
    async closeConversation(id, req) {
        return this.chatService.closeConversation(id, req.user);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all conversations for authenticated user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of conversations' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unread messages count' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Unread count' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('by-lead/:leadId'),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get conversation by lead ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Conversation details or null' }),
    __param(0, (0, common_1.Param)('leadId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversationByLeadId", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get conversation details' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Conversation details' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Get messages for a conversation' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({
        name: 'cursor',
        required: false,
        type: String,
        description: 'Cursor-based pagination: pass message id to fetch older messages',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of messages with pagination' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new conversation' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Conversation created' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateConversationDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Post)(':id/messages'),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message in a conversation' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Message sent' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, roles_decorator_1.Roles)('CLIENT', 'MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark messages as read' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Messages marked as read' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)(':id/close'),
    (0, roles_decorator_1.Roles)('MASTER', 'ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Close a conversation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Conversation closed' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "closeConversation", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, common_1.Controller)('conversations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        chat_gateway_1.ChatGateway])
], ChatController);
//# sourceMappingURL=chat.controller.js.map