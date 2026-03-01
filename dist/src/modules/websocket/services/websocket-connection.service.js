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
var WebsocketConnectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketConnectionService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../../shared/redis/redis.service");
const prisma_service_1 = require("../../shared/database/prisma.service");
let WebsocketConnectionService = WebsocketConnectionService_1 = class WebsocketConnectionService {
    jwtService;
    configService;
    redis;
    prisma;
    logger = new common_1.Logger(WebsocketConnectionService_1.name);
    userConnections = new Map();
    constructor(jwtService, configService, redis, prisma) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.redis = redis;
        this.prisma = prisma;
    }
    async handleConnection(client) {
        try {
            const token = this.getTokenFromSocket(client);
            if (!token) {
                client.disconnect();
                return null;
            }
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('jwt.accessSecret'),
            });
            const userId = payload.sub;
            client.data.userId = userId;
            const userSockets = this.userConnections.get(userId) || [];
            userSockets.push(client.id);
            this.userConnections.set(userId, userSockets);
            await client.join(`user:${userId}`);
            if (payload.role === 'MASTER') {
                await client.join('masters');
                try {
                    const master = await this.prisma.master.findUnique({
                        where: { userId },
                        select: { id: true },
                    });
                    if (master) {
                        await client.join(`master:${master.id}`);
                        this.logger.log(`Мастер ${userId} подписан на комнату master:${master.id}`);
                    }
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.logger.warn(`Не удалось подписать мастера на комнату: ${msg}`);
                }
            }
            if (payload.role === 'ADMIN') {
                await client.join('admins');
            }
            try {
                const redisClient = this.redis.getClient();
                if (redisClient.status === 'ready' ||
                    redisClient.status === 'connect') {
                    await redisClient.sadd('online:users', userId);
                    await redisClient.hset(`user:${userId}:status`, {
                        online: 'true',
                        lastSeen: new Date().toISOString(),
                    });
                }
                else {
                    this.logger.warn(`Redis not ready, skipping status update for user ${userId}`);
                }
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to update Redis status for user ${userId}:`, msg);
            }
            this.logger.log(`Пользователь подключен: ${userId} (Socket: ${client.id})`);
            return userId;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Ошибка при подключении Websocket: ${msg}`);
            client.disconnect();
            return null;
        }
    }
    async handleDisconnect(client) {
        const userId = client.data.userId;
        if (userId) {
            const userSockets = this.userConnections.get(userId) || [];
            const updatedSockets = userSockets.filter((id) => id !== client.id);
            if (updatedSockets.length === 0) {
                this.userConnections.delete(userId);
                try {
                    const redisClient = this.redis.getClient();
                    if (redisClient.status === 'ready' ||
                        redisClient.status === 'connect') {
                        await redisClient.srem('online:users', userId);
                        await redisClient.hset(`user:${userId}:status`, {
                            online: 'false',
                            lastSeen: new Date().toISOString(),
                        });
                    }
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    this.logger.warn(`Failed to update Redis offline status for user ${userId}:`, msg);
                }
                this.logger.log(`Пользователь полностью отключен (оффлайн): ${userId}`);
                return { userId, isLastConnection: true };
            }
            else {
                this.userConnections.set(userId, updatedSockets);
                this.logger.log(`Закрыто одно из соединений пользователя: ${userId}`);
            }
        }
        return { userId, isLastConnection: false };
    }
    isUserOnline(userId) {
        const sockets = this.userConnections.get(userId);
        return !!sockets && sockets.length > 0;
    }
    async getOnlineUsers() {
        try {
            const redisClient = this.redis.getClient();
            if (redisClient.status !== 'ready' && redisClient.status !== 'connect') {
                this.logger.warn('Redis not ready, returning empty online users list');
                return [];
            }
            const userIds = await redisClient.smembers('online:users');
            const usersWithStatus = await Promise.all(userIds.map(async (userId) => {
                try {
                    const status = await redisClient.hgetall(`user:${userId}:status`);
                    return { userId, ...status };
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : String(error);
                    this.logger.warn(`Failed to get status for user ${userId}:`, msg);
                    return { userId };
                }
            }));
            return usersWithStatus;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn('Failed to get online users from Redis:', msg);
            return [];
        }
    }
    getTokenFromSocket(client) {
        const auth = client.handshake.auth;
        const authToken = auth?.token;
        const authHeader = client.handshake.headers?.authorization;
        const headerToken = typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;
        const token = (typeof authToken === 'string' ? authToken : null) ??
            (typeof headerToken === 'string' ? headerToken : null);
        return token;
    }
    onModuleDestroy() {
        this.userConnections.clear();
        this.logger.log('WebsocketConnectionService: cleared all user connections');
    }
};
exports.WebsocketConnectionService = WebsocketConnectionService;
exports.WebsocketConnectionService = WebsocketConnectionService = WebsocketConnectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        prisma_service_1.PrismaService])
], WebsocketConnectionService);
//# sourceMappingURL=websocket-connection.service.js.map