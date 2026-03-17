import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { WebsocketConnectionService } from './services/websocket-connection.service';
import { WebsocketMessagingService } from './services/websocket-messaging.service';
import { WebsocketErrorHandlerService } from './services/websocket-error-handler.service';
import Redis from 'ioredis';
import { RedisService } from '../../shared/redis/redis.service';
import { Server, Socket } from 'socket.io';
import {
  sanitizeNotificationData,
  sanitizeLeadData,
  sanitizePaymentData,
  sanitizeReviewData,
} from './utils/websocket-sanitizer.util';

/**
 * WebsocketService — координатор модуля Real-time уведомлений.
 * Управляет процессами обмена сообщениями, отслеживанием статусов и интеграцией с Redis.
 */
@Injectable()
export class WebsocketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebsocketService.name);
  private redisSubscriber: Redis | null = null;

  constructor(
    private readonly connectionService: WebsocketConnectionService,
    private readonly messagingService: WebsocketMessagingService,
    private readonly redis: RedisService,
    private readonly errorHandler: WebsocketErrorHandlerService,
  ) {}

  private initTimeout: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.logger.log('WebsocketService onModuleInit вызван');
    // Используем сохранение ссылки на таймер для возможности отмены
    this.initTimeout = setTimeout(() => {
      this.logger.log('Запуск настройки Redis subscriptions...');
      this.setupRedisSubscriptions().catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to setup Redis subscriptions: ${msg}`);
      });
      this.initTimeout = null;
    }, 3000);
  }

  /**
   * Инициализация сервера (вызывается из Gateway)
   */
  initServer(server: Server) {
    this.messagingService.setServer(server);
    this.logger.log('Websocket Server проброшен в сервисы');
  }

  /**
   * Регистрация нового соединения
   */
  async handleConnection(client: Socket) {
    return this.connectionService.handleConnection(client);
  }

  /**
   * Регистрация отключения
   */
  async handleDisconnect(client: Socket) {
    const result = await this.connectionService.handleDisconnect(client);
    if (result && result.userId && result.isLastConnection) {
      this.messagingService.sendToAdmins('user:offline', {
        userId: result.userId,
      });
    }
    return result;
  }

  // --- Методы отправки сообщений ---

  async sendToUser(userId: string, event: string, data: any) {
    try {
      // Санитизируем данные перед отправкой
      const sanitizedData = sanitizeNotificationData(data);
      return this.messagingService.sendToUser(userId, event, sanitizedData);
    } catch (error) {
      this.errorHandler.handleError(error, 'sendToUser', userId);
      return false;
    }
  }

  sendToMaster(masterId: string, event: string, data: unknown) {
    try {
      // Санитизируем данные перед отправкой
      const sanitizedData = sanitizeNotificationData(data);
      return this.messagingService.sendToMaster(masterId, event, sanitizedData);
    } catch (error) {
      this.errorHandler.handleError(error, 'sendToMaster', masterId);
    }
  }

  sendToAdmins(event: string, data: unknown) {
    try {
      // Санитизируем данные перед отправкой
      const sanitizedData = sanitizeNotificationData(data);
      return this.messagingService.sendToAdmins(event, sanitizedData);
    } catch (error) {
      this.errorHandler.handleError(error, 'sendToAdmins');
    }
  }

  sendToAll(event: string, data: unknown) {
    try {
      // Санитизируем данные перед отправкой
      const sanitizedData = sanitizeNotificationData(data);
      return this.messagingService.sendToAll(event, sanitizedData);
    } catch (error) {
      this.errorHandler.handleError(error, 'sendToAll');
    }
  }

  async getOfflineNotifications(userId: string) {
    return this.messagingService.getOfflineNotifications(userId);
  }

  async getOnlineUsers() {
    return this.connectionService.getOnlineUsers();
  }

  // --- Бизнес-уведомления ---

  /** Уведомление о новой заявке (используется из Redis/каналов). Единый канал: event 'notification'. Мастеру — один раз в user:userId; админам — в комнату admins. */
  async sendNewLeadNotification(
    masterId: string,
    leadData: any,
    masterUserId?: string,
  ) {
    try {
      const sanitizedLeadData = sanitizeLeadData(leadData) as Record<
        string,
        unknown
      >;
      const clientName =
        typeof sanitizedLeadData.clientName === 'string'
          ? sanitizedLeadData.clientName
          : 'клиента';
      const notification = sanitizeNotificationData({
        type: 'NEW_LEAD',
        title: 'Новая заявка',
        message: `Новая заявка от ${clientName}`,
        messageKey: 'notifications.messages.newLeadFrom',
        messageParams: { clientName },
        data: sanitizedLeadData,
        timestamp: new Date().toISOString(),
        priority: 'high',
      });

      if (masterUserId) {
        await this.sendToUser(masterUserId, 'notification', notification);
      }
      this.sendToAdmins('notification', {
        ...(notification as Record<string, unknown>),
        type: 'ADMIN_NEW_LEAD',
        masterId,
      });
    } catch (error) {
      this.errorHandler.handleError(error, 'sendNewLeadNotification', masterId);
    }
  }

  /** Уведомление клиенту: заявка успешно отправлена мастеру */
  async sendLeadSentToClient(
    clientId: string,
    payload: { leadId: string; masterName: string },
  ) {
    try {
      const notification = sanitizeNotificationData({
        type: 'LEAD_SENT',
        title: 'Заявка отправлена',
        message: `Заявка отправлена мастеру ${payload.masterName || ''}`.trim(),
        messageKey: 'notifications.messages.leadSentTo',
        messageParams: { masterName: payload.masterName || '' },
        data: payload,
        timestamp: new Date().toISOString(),
      });
      await this.sendToUser(clientId, 'notification', notification);
    } catch (error) {
      this.errorHandler.handleError(error, 'sendLeadSentToClient', clientId);
    }
  }

  async sendPaymentNotification(userId: string, paymentData: any) {
    try {
      // Санитизируем данные платежа перед отправкой
      const sanitizedPaymentData = sanitizePaymentData(paymentData) as Record<
        string,
        unknown
      >;
      const tariffType =
        typeof sanitizedPaymentData.tariffType === 'string'
          ? sanitizedPaymentData.tariffType
          : '';

      const notification = sanitizeNotificationData({
        type: 'PAYMENT_SUCCESS',
        title: 'Платеж успешен',
        message: `Оплата тарифа ${tariffType} прошла успешно`,
        data: sanitizedPaymentData,
        timestamp: new Date().toISOString(),
      });

      await this.sendToUser(userId, 'notification', notification);
    } catch (error) {
      this.errorHandler.handleError(error, 'sendPaymentNotification', userId);
    }
  }

  sendReviewNotification(masterId: string, reviewData: any) {
    try {
      // Санитизируем данные отзыва перед отправкой
      const sanitizedReviewData = sanitizeReviewData(reviewData) as Record<
        string,
        unknown
      >;
      const rating =
        typeof sanitizedReviewData.rating === 'number'
          ? sanitizedReviewData.rating
          : 5;

      const notification = sanitizeNotificationData({
        type: 'NEW_REVIEW',
        title: 'Новый отзыв',
        message: `Пользователь оставил отзыв с оценкой ${rating}/5`,
        data: sanitizedReviewData,
        timestamp: new Date().toISOString(),
      });

      this.sendToMaster(masterId, 'notification', notification);
    } catch (error) {
      this.errorHandler.handleError(error, 'sendReviewNotification', masterId);
    }
  }

  // --- Redis Subscriptions ---

  private async setupRedisSubscriptions() {
    try {
      const redisClient = this.redis.getClient();
      if (redisClient.status !== 'connect' && redisClient.status !== 'ready') {
        this.logger.warn(
          `Redis not ready (status: ${redisClient.status}), waiting for connection...`,
        );
        let timeoutId: NodeJS.Timeout | undefined;
        try {
          const connectPromise = new Promise<void>((resolve, reject) => {
            let resolved = false;

            const readyHandler = () => {
              if (!resolved) {
                resolved = true;
                cleanup();
                resolve();
              }
            };

            const errorHandler = (err?: Error | string) => {
              if (!resolved) {
                resolved = true;
                cleanup();
                if (err instanceof Error) {
                  reject(err);
                } else if (typeof err === 'string') {
                  reject(new Error(err));
                } else {
                  reject(new Error('Redis connection error'));
                }
              }
            };

            const cleanup = () => {
              redisClient.removeListener('ready', readyHandler);
              redisClient.removeListener('error', errorHandler);
            };

            if (
              redisClient.status === 'connect' ||
              redisClient.status === 'ready'
            ) {
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
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error('Redis connection timeout')),
              10000,
            );
          });

          await Promise.race([connectPromise, timeoutPromise]).catch(
            (error: unknown) => {
              if (error instanceof Error) throw error;
              const msg =
                typeof error === 'string'
                  ? error
                  : 'Unknown Redis connection error';
              throw new Error(msg);
            },
          );
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Redis connection timeout, skipping subscriptions setup: ${msg}`,
          );
          return;
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }

      if (redisClient.status !== 'connect' && redisClient.status !== 'ready') {
        this.logger.warn(
          `Redis still not connected (status: ${redisClient.status}), skipping duplicate creation`,
        );
        return;
      }

      let redisSub: Redis;
      try {
        redisSub = redisClient.duplicate();
        this.redisSubscriber = redisSub;
      } catch (error: unknown) {
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

      // Обрабатываем ошибки подключения Redis subscriber
      redisSub.on('error', (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis subscriber error: ${msg}`);
      });

      redisSub.on('ready', () => {
        this.logger.log('Redis subscriber готов');
        channels.forEach((ch) => void redisSub.subscribe(ch));
        this.logger.log(
          `Подписка на Redis каналы оформлена: ${channels.join(', ')}`,
        );
      });

      redisSub.on('message', (channel: string, message: string) => {
        void (async () => {
          try {
            // Безопасный парсинг JSON с обработкой ошибок
            const data = this.errorHandler.parseJSONSafely<
              Record<string, unknown>
            >(message, `Redis message from ${channel}`);
            if (!data || typeof data !== 'object') {
              this.logger.warn(`Failed to parse Redis message from ${channel}`);
              return;
            }

            switch (channel) {
              case 'notifications:system':
                await this.errorHandler.handleAsyncError(
                  () => Promise.resolve(this.handleSystemNotification(data)),
                  `handleSystemNotification from ${channel}`,
                );
                break;
              case 'notifications:leads': {
                const masterId =
                  typeof data.masterId === 'string' ? data.masterId : null;
                if (masterId && data.lead) {
                  await this.errorHandler.handleAsyncError(
                    () => this.sendNewLeadNotification(masterId, data.lead),
                    `sendNewLeadNotification from ${channel}`,
                    undefined,
                  );
                } else {
                  this.logger.warn(
                    `Invalid lead notification data: missing masterId or lead`,
                  );
                }
                break;
              }
              case 'notifications:payments': {
                const userId =
                  typeof data.userId === 'string' ? data.userId : null;
                if (userId && data.payment) {
                  await this.errorHandler.handleAsyncError(
                    () => this.sendPaymentNotification(userId, data.payment),
                    `sendPaymentNotification from ${channel}`,
                    undefined,
                  );
                } else {
                  this.logger.warn(
                    `Invalid payment notification data: missing userId or payment`,
                  );
                }
                break;
              }
              case 'notifications:reviews': {
                const reviewMasterId =
                  typeof data.masterId === 'string' ? data.masterId : null;
                if (reviewMasterId && data.review) {
                  await this.errorHandler.handleAsyncError(
                    () =>
                      Promise.resolve(
                        this.sendReviewNotification(
                          reviewMasterId,
                          data.review,
                        ),
                      ),
                    `sendReviewNotification from ${channel}`,
                    undefined,
                  );
                } else {
                  this.logger.warn(
                    `Invalid review notification data: missing masterId or review`,
                  );
                }
                break;
              }
            }
          } catch (error: unknown) {
            this.errorHandler.handleError(
              error,
              `Redis message handler for ${channel}`,
            );
          }
        })();
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to setup Redis subscriptions: ${msg}`);
    }
  }

  private handleSystemNotification(data: Record<string, unknown>) {
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
    // Отменяем таймер инициализации, если он еще не выполнился
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
      this.logger.log('Таймаут настройки Redis subscriptions отменён');
    }

    if (this.redisSubscriber) {
      try {
        // Удаляем все обработчики событий перед закрытием для предотвращения утечек памяти
        this.redisSubscriber.removeAllListeners();
        await this.redisSubscriber.quit().catch(() => {});
        this.logger.log('Redis subscriber закрыт');
      } catch {
        this.logger.debug('Redis subscriber закрыт');
      } finally {
        this.redisSubscriber = null;
      }
    }
  }
}
