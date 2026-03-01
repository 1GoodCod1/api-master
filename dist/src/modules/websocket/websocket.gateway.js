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
var WebsocketGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const websockets_2 = require("@nestjs/websockets");
const ws_jwt_guard_1 = require("../../common/guards/ws-jwt.guard");
const websocket_service_1 = require("./websocket.service");
const websocket_error_handler_service_1 = require("./services/websocket-error-handler.service");
const prisma_service_1 = require("../shared/database/prisma.service");
const websocket_sanitizer_util_1 = require("./utils/websocket-sanitizer.util");
let WebsocketGateway = WebsocketGateway_1 = class WebsocketGateway {
    websocketService;
    moduleRef;
    errorHandler;
    server;
    logger = new common_1.Logger(WebsocketGateway_1.name);
    prisma = null;
    constructor(websocketService, moduleRef, errorHandler) {
        this.websocketService = websocketService;
        this.moduleRef = moduleRef;
        this.errorHandler = errorHandler;
        this.logger.log('Websocket Gateway constructor called');
    }
    getPrismaService() {
        if (!this.prisma) {
            try {
                this.prisma = this.moduleRef.get(prisma_service_1.PrismaService, { strict: false });
                if (!this.prisma) {
                    this.logger.warn('PrismaService not found in module');
                    return null;
                }
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(`Failed to get PrismaService: ${msg}`);
                return null;
            }
        }
        return this.prisma;
    }
    afterInit(server) {
        this.logger.log('Websocket Gateway afterInit called');
        try {
            this.websocketService.initServer(server);
            this.logger.log('Websocket Gateway инициализирован успешно');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Ошибка при инициализации Gateway: ${msg}`);
        }
    }
    async handleConnection(client) {
        try {
            const userId = await this.websocketService.handleConnection(client);
            if (userId) {
                try {
                    const offlineNotifications = await this.websocketService.getOfflineNotifications(userId);
                    client.emit('connected', {
                        message: 'Успешное подключение к уведомлениям',
                        userId,
                        timestamp: new Date().toISOString(),
                        offlineCount: offlineNotifications.length,
                    });
                    for (const notification of offlineNotifications) {
                        if (typeof notification.event === 'string') {
                            client.emit(notification.event, notification.data);
                        }
                    }
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.error(`Error getting offline notifications: ${msg}`);
                    client.emit('connected', {
                        message: 'Успешное подключение к уведомлениям',
                        userId,
                        timestamp: new Date().toISOString(),
                        offlineCount: 0,
                    });
                }
            }
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error in handleConnection: ${msg}`);
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        try {
            await this.websocketService.handleDisconnect(client);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error in handleDisconnect: ${msg}`);
        }
    }
    async handleSubscribeToMaster(client, data) {
        try {
            const userId = client.data.userId;
            this.errorHandler.validateInput(data, {
                masterId: (value) => typeof value === 'string' && value.trim().length > 0,
            }, 'handleSubscribeToMaster');
            const sanitizedMasterId = (0, websocket_sanitizer_util_1.sanitizeMasterId)(data.masterId);
            if (!sanitizedMasterId) {
                throw this.errorHandler.handleError(new Error('Invalid masterId format'), 'handleSubscribeToMaster', userId);
            }
            const prisma = this.getPrismaService();
            if (!prisma) {
                this.logger.warn('PrismaService not available, skipping validation');
                await client.join(`master:${sanitizedMasterId}`);
                return { success: true, masterId: sanitizedMasterId };
            }
            const user = await this.errorHandler.handleAsyncError(() => prisma.user.findUnique({
                where: { id: userId },
                include: { masterProfile: true },
            }), 'handleSubscribeToMaster - findUser', userId);
            if (!user) {
                throw this.errorHandler.handleError(new Error('User not found'), 'handleSubscribeToMaster', userId);
            }
            const isMasterOwner = user.role === 'MASTER' && user.masterProfile?.id === sanitizedMasterId;
            const isAdmin = user.role === 'ADMIN';
            if (!isMasterOwner && !isAdmin) {
                this.logger.warn(`Unauthorized subscribe attempt: userId=${userId}, masterId=${sanitizedMasterId}`);
                throw this.errorHandler.handleError(new Error('Unauthorized to subscribe to this master'), 'handleSubscribeToMaster', userId);
            }
            await client.join(`master:${sanitizedMasterId}`);
            this.logger.log(`User ${userId} subscribed to master:${sanitizedMasterId}`);
            return { success: true, masterId: sanitizedMasterId };
        }
        catch (error) {
            if (error instanceof websockets_2.WsException) {
                throw error;
            }
            throw this.errorHandler.handleError(error, 'handleSubscribeToMaster', client.data.userId);
        }
    }
    async handleUnsubscribeFromMaster(client, data) {
        await client.leave(`master:${data.masterId}`);
        return { success: true, masterId: data.masterId };
    }
    handleTyping(client, data) {
        const userId = client.data.userId;
        this.server.to(`master:${data.masterId}`).emit('user:typing', {
            userId,
            isTyping: data.isTyping,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.WebsocketGateway = WebsocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Function)
], WebsocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:master'),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleSubscribeToMaster", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe:master'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", Promise)
], WebsocketGateway.prototype, "handleUnsubscribeFromMaster", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, Object]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleTyping", null);
exports.WebsocketGateway = WebsocketGateway = WebsocketGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
        namespace: 'notifications',
        transports: ['websocket', 'polling'],
        allowEIO3: true,
    }),
    __metadata("design:paramtypes", [websocket_service_1.WebsocketService,
        core_1.ModuleRef,
        websocket_error_handler_service_1.WebsocketErrorHandlerService])
], WebsocketGateway);
//# sourceMappingURL=websocket.gateway.js.map