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
var WebsocketService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketService = void 0;
const common_1 = require("@nestjs/common");
const websocket_connection_service_1 = require("./services/websocket-connection.service");
const websocket_messaging_service_1 = require("./services/websocket-messaging.service");
const websocket_error_handler_service_1 = require("./services/websocket-error-handler.service");
const redis_service_1 = require("../shared/redis/redis.service");
const websocket_sanitizer_util_1 = require("./utils/websocket-sanitizer.util");
let WebsocketService = WebsocketService_1 = class WebsocketService {
    connectionService;
    messagingService;
    redis;
    errorHandler;
    logger = new common_1.Logger(WebsocketService_1.name);
    redisSubscriber = null;
    constructor(connectionService, messagingService, redis, errorHandler) {
        this.connectionService = connectionService;
        this.messagingService = messagingService;
        this.redis = redis;
        this.errorHandler = errorHandler;
    }
    initTimeout = null;
    onModuleInit() {
        this.logger.log('WebsocketService onModuleInit called');
        this.initTimeout = setTimeout(() => {
            this.logger.log('Starting Redis subscriptions setup...');
            this.setupRedisSubscriptions().catch((error) => {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed to setup Redis subscriptions: ${msg}`);
            });
            this.initTimeout = null;
        }, 3000);
    }
    initServer(server) {
        this.messagingService.setServer(server);
        this.logger.log('Websocket Server проброшен в сервисы');
    }
    async handleConnection(client) {
        return this.connectionService.handleConnection(client);
    }
    async handleDisconnect(client) {
        const result = await this.connectionService.handleDisconnect(client);
        if (result.userId && result.isLastConnection) {
            this.messagingService.sendToAdmins('user:offline', {
                userId: result.userId,
            });
        }
        return result;
    }
    async sendToUser(userId, event, data) {
        try {
            const sanitizedData = (0, websocket_sanitizer_util_1.sanitizeNotificationData)(data);
            return this.messagingService.sendToUser(userId, event, sanitizedData);
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendToUser', userId);
            return false;
        }
    }
    sendToMaster(masterId, event, data) {
        try {
            const sanitizedData = (0, websocket_sanitizer_util_1.sanitizeNotificationData)(data);
            return this.messagingService.sendToMaster(masterId, event, sanitizedData);
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendToMaster', masterId);
        }
    }
    sendToAdmins(event, data) {
        try {
            const sanitizedData = (0, websocket_sanitizer_util_1.sanitizeNotificationData)(data);
            return this.messagingService.sendToAdmins(event, sanitizedData);
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendToAdmins');
        }
    }
    sendToAll(event, data) {
        try {
            const sanitizedData = (0, websocket_sanitizer_util_1.sanitizeNotificationData)(data);
            return this.messagingService.sendToAll(event, sanitizedData);
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendToAll');
        }
    }
    async getOfflineNotifications(userId) {
        return this.messagingService.getOfflineNotifications(userId);
    }
    async getOnlineUsers() {
        return this.connectionService.getOnlineUsers();
    }
    async sendNewLeadNotification(masterId, leadData, masterUserId) {
        try {
            const sanitizedLeadData = (0, websocket_sanitizer_util_1.sanitizeLeadData)(leadData);
            const clientName = typeof sanitizedLeadData.clientName === 'string'
                ? sanitizedLeadData.clientName
                : 'клиента';
            const notification = (0, websocket_sanitizer_util_1.sanitizeNotificationData)({
                type: 'NEW_LEAD',
                title: 'Новая заявка',
                message: `Новая заявка от ${clientName}`,
                data: sanitizedLeadData,
                timestamp: new Date().toISOString(),
                priority: 'high',
            });
            if (masterUserId) {
                await this.sendToUser(masterUserId, 'notification', notification);
            }
            this.sendToAdmins('notification', {
                ...notification,
                type: 'ADMIN_NEW_LEAD',
                masterId,
            });
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendNewLeadNotification', masterId);
        }
    }
    async sendLeadSentToClient(clientId, payload) {
        try {
            const notification = (0, websocket_sanitizer_util_1.sanitizeNotificationData)({
                type: 'LEAD_SENT',
                title: 'Заявка отправлена',
                message: `Заявка отправлена мастеру ${payload.masterName || ''}`.trim(),
                data: payload,
                timestamp: new Date().toISOString(),
            });
            await this.sendToUser(clientId, 'notification', notification);
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendLeadSentToClient', clientId);
        }
    }
    async sendPaymentNotification(userId, paymentData) {
        try {
            const sanitizedPaymentData = (0, websocket_sanitizer_util_1.sanitizePaymentData)(paymentData);
            const tariffType = typeof sanitizedPaymentData.tariffType === 'string'
                ? sanitizedPaymentData.tariffType
                : '';
            const notification = (0, websocket_sanitizer_util_1.sanitizeNotificationData)({
                type: 'PAYMENT_SUCCESS',
                title: 'Платеж успешен',
                message: `Оплата тарифа ${tariffType} прошла успешно`,
                data: sanitizedPaymentData,
                timestamp: new Date().toISOString(),
            });
            await this.sendToUser(userId, 'notification', notification);
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendPaymentNotification', userId);
        }
    }
    sendReviewNotification(masterId, reviewData) {
        try {
            const sanitizedReviewData = (0, websocket_sanitizer_util_1.sanitizeReviewData)(reviewData);
            const rating = typeof sanitizedReviewData.rating === 'number'
                ? sanitizedReviewData.rating
                : 5;
            const notification = (0, websocket_sanitizer_util_1.sanitizeNotificationData)({
                type: 'NEW_REVIEW',
                title: 'Новый отзыв',
                message: `Пользователь оставил отзыв с оценкой ${rating}/5`,
                data: sanitizedReviewData,
                timestamp: new Date().toISOString(),
            });
            this.sendToMaster(masterId, 'notification', notification);
        }
        catch (error) {
            this.errorHandler.handleError(error, 'sendReviewNotification', masterId);
        }
    }
    async setupRedisSubscriptions() {
        try {
            const redisClient = this.redis.getClient();
            if (redisClient.status !== 'connect' && redisClient.status !== 'ready') {
                this.logger.warn(`Redis not ready (status: ${redisClient.status}), waiting for connection...`);
                try {
                    await Promise.race([
                        new Promise((resolve, reject) => {
                            let resolved = false;
                            const readyHandler = () => {
                                if (!resolved) {
                                    resolved = true;
                                    cleanup();
                                    resolve();
                                }
                            };
                            const errorHandler = (err) => {
                                if (!resolved) {
                                    resolved = true;
                                    cleanup();
                                    if (err instanceof Error) {
                                        reject(err);
                                    }
                                    else if (typeof err === 'string') {
                                        reject(new Error(err));
                                    }
                                    else {
                                        reject(new Error('Redis connection error'));
                                    }
                                }
                            };
                            const cleanup = () => {
                                redisClient.removeListener('ready', readyHandler);
                                redisClient.removeListener('error', errorHandler);
                            };
                            if (redisClient.status === 'connect' ||
                                redisClient.status === 'ready') {
                                if (redisClient.status === 'ready') {
                                    if (!resolved) {
                                        resolved = true;
                                        cleanup();
                                        resolve();
                                    }
                                    return;
                                }
                                redisClient.once('ready', readyHandler);
                                redisClient.once('error', errorHandler);
                                return;
                            }
                            redisClient.once('ready', readyHandler);
                            redisClient.once('error', errorHandler);
                        }),
                        new Promise((_, reject) => {
                            setTimeout(() => {
                                reject(new Error('Redis connection timeout'));
                            }, 10000);
                        }),
                    ]).catch((error) => {
                        if (error instanceof Error) {
                            throw error;
                        }
                        const msg = typeof error === 'string'
                            ? error
                            : 'Unknown Redis connection error';
                        throw new Error(msg);
                    });
                }
                catch (error) {
                    const msg = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.warn(`Redis connection timeout, skipping subscriptions setup: ${msg}`);
                    return;
                }
            }
            if (redisClient.status !== 'connect' && redisClient.status !== 'ready') {
                this.logger.warn(`Redis still not connected (status: ${redisClient.status}), skipping duplicate creation`);
                return;
            }
            let redisSub;
            try {
                redisSub = redisClient.duplicate();
                this.redisSubscriber = redisSub;
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to create Redis duplicate: ${msg}`);
                return;
            }
            const channels = [
                'notifications:system',
                'notifications:leads',
                'notifications:payments',
                'notifications:reviews',
            ];
            redisSub.on('error', (err) => {
                this.logger.error(`Redis subscriber error: ${err.message}`);
            });
            redisSub.on('ready', () => {
                this.logger.log('Redis subscriber ready');
                channels.forEach((ch) => void redisSub.subscribe(ch));
                this.logger.log(`Подписка на Redis каналы оформлена: ${channels.join(', ')}`);
            });
            redisSub.on('message', (channel, message) => {
                void (async () => {
                    try {
                        const data = this.errorHandler.parseJSONSafely(message, `Redis message from ${channel}`);
                        if (!data || typeof data !== 'object') {
                            this.logger.warn(`Failed to parse Redis message from ${channel}`);
                            return;
                        }
                        switch (channel) {
                            case 'notifications:system':
                                await this.errorHandler.handleAsyncError(() => Promise.resolve(this.handleSystemNotification(data)), `handleSystemNotification from ${channel}`);
                                break;
                            case 'notifications:leads': {
                                const masterId = typeof data.masterId === 'string' ? data.masterId : null;
                                if (masterId && data.lead) {
                                    await this.errorHandler.handleAsyncError(() => this.sendNewLeadNotification(masterId, data.lead), `sendNewLeadNotification from ${channel}`, undefined);
                                }
                                else {
                                    this.logger.warn(`Invalid lead notification data: missing masterId or lead`);
                                }
                                break;
                            }
                            case 'notifications:payments': {
                                const userId = typeof data.userId === 'string' ? data.userId : null;
                                if (userId && data.payment) {
                                    await this.errorHandler.handleAsyncError(() => this.sendPaymentNotification(userId, data.payment), `sendPaymentNotification from ${channel}`, undefined);
                                }
                                else {
                                    this.logger.warn(`Invalid payment notification data: missing userId or payment`);
                                }
                                break;
                            }
                            case 'notifications:reviews': {
                                const reviewMasterId = typeof data.masterId === 'string' ? data.masterId : null;
                                if (reviewMasterId && data.review) {
                                    await this.errorHandler.handleAsyncError(() => Promise.resolve(this.sendReviewNotification(reviewMasterId, data.review)), `sendReviewNotification from ${channel}`, undefined);
                                }
                                else {
                                    this.logger.warn(`Invalid review notification data: missing masterId or review`);
                                }
                                break;
                            }
                        }
                    }
                    catch (error) {
                        this.errorHandler.handleError(error, `Redis message handler for ${channel}`);
                    }
                })();
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to setup Redis subscriptions: ${msg}`);
        }
    }
    handleSystemNotification(data) {
        if (typeof data.type === 'string' && data.type === 'BACKUP_COMPLETED') {
            this.sendToAdmins('system:notification', {
                type: 'BACKUP',
                title: 'Резервное копирование',
                message: 'Резервное копирование завершено успешно',
                data,
                timestamp: new Date().toISOString(),
            });
        }
    }
    async onModuleDestroy() {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
            this.logger.log('Cancelled Redis subscriptions setup timeout');
        }
        if (this.redisSubscriber) {
            try {
                this.redisSubscriber.removeAllListeners();
                await this.redisSubscriber.quit().catch(() => { });
                this.logger.log('Redis subscriber closed');
            }
            catch {
                this.logger.debug('Redis subscriber closed');
            }
            finally {
                this.redisSubscriber = null;
            }
        }
    }
};
exports.WebsocketService = WebsocketService;
exports.WebsocketService = WebsocketService = WebsocketService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [websocket_connection_service_1.WebsocketConnectionService,
        websocket_messaging_service_1.WebsocketMessagingService,
        redis_service_1.RedisService,
        websocket_error_handler_service_1.WebsocketErrorHandlerService])
], WebsocketService);
//# sourceMappingURL=websocket.service.js.map