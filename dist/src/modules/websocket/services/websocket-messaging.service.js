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
var WebsocketMessagingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketMessagingService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../shared/redis/redis.service");
const websocket_connection_service_1 = require("./websocket-connection.service");
let WebsocketMessagingService = WebsocketMessagingService_1 = class WebsocketMessagingService {
    redis;
    connectionService;
    logger = new common_1.Logger(WebsocketMessagingService_1.name);
    server;
    constructor(redis, connectionService) {
        this.redis = redis;
        this.connectionService = connectionService;
    }
    setServer(server) {
        this.server = server;
    }
    async sendToUser(userId, event, data) {
        if (this.connectionService.isUserOnline(userId)) {
            this.server.to(`user:${userId}`).emit(event, data);
            return true;
        }
        await this.saveOfflineNotification(userId, event, data);
        return false;
    }
    sendToMaster(masterId, event, data) {
        if (this.server) {
            this.server.to(`master:${masterId}`).emit(event, data);
        }
    }
    sendToAdmins(event, data) {
        if (this.server) {
            this.server.to('admins').emit(event, data);
        }
    }
    sendToAll(event, data) {
        if (this.server) {
            this.server.emit(event, data);
        }
    }
    async saveOfflineNotification(userId, event, data) {
        try {
            const redisClient = this.redis.getClient();
            if (redisClient.status !== 'ready' && redisClient.status !== 'connect') {
                this.logger.warn(`Redis not ready, skipping offline notification for user ${userId}`);
                return;
            }
            const notification = {
                event,
                data,
                timestamp: new Date().toISOString(),
            };
            await redisClient.lpush(`notifications:offline:${userId}`, JSON.stringify(notification));
            await redisClient.ltrim(`notifications:offline:${userId}`, 0, 49);
        }
        catch {
            this.logger.warn(`Failed to save offline notification for user ${userId}:`);
        }
    }
    async getOfflineNotifications(userId) {
        try {
            const redisClient = this.redis.getClient();
            if (redisClient.status !== 'ready' && redisClient.status !== 'connect') {
                this.logger.warn(`Redis not ready, returning empty notifications for user ${userId}`);
                return [];
            }
            const notifications = await redisClient.lrange(`notifications:offline:${userId}`, 0, -1);
            const parsed = notifications
                .map((n) => {
                try {
                    return JSON.parse(n);
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    this.logger.warn(`Failed to parse notification:`, msg);
                    return null;
                }
            })
                .filter((item) => Boolean(item));
            await redisClient.del(`notifications:offline:${userId}`);
            return parsed;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to get offline notifications for user ${userId}:`, msg);
            return [];
        }
    }
};
exports.WebsocketMessagingService = WebsocketMessagingService;
exports.WebsocketMessagingService = WebsocketMessagingService = WebsocketMessagingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        websocket_connection_service_1.WebsocketConnectionService])
], WebsocketMessagingService);
//# sourceMappingURL=websocket-messaging.service.js.map