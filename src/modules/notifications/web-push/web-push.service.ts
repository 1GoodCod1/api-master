import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../../shared/database/prisma.service';
import type { PushPayload } from '../types';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly enabled: boolean;

  private readonly publicKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    let publicKey = this.configService.get<string>('webPush.publicKey', '');
    let privateKey = this.configService.get<string>('webPush.privateKey', '');
    const email = this.configService.get<string>(
      'webPush.email',
      'admin@faber.md',
    );

    if (!publicKey || !privateKey) {
      const isDev =
        this.configService.get<string>('nodeEnv', 'development') ===
        'development';
      if (isDev) {
        const keys = webpush.generateVAPIDKeys();
        publicKey = keys.publicKey;
        privateKey = keys.privateKey;
        this.logger.warn(
          'Web Push: VAPID keys not configured. Using auto-generated keys for development. ' +
            'Run "npm run generate:secrets" and add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY to .env for production.',
        );
      }
    }

    this.publicKey = publicKey;

    if (publicKey && privateKey) {
      webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
      this.enabled = true;
      this.logger.log('Web Push VAPID configured');
    } else {
      this.enabled = false;
      this.logger.warn('Web Push disabled: VAPID keys not configured');
    }
  }

  /**
   * Сохранить push-подписку пользователя
   */
  async subscribe(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent?: string,
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth, userAgent },
      update: { userId, p256dh, auth, userAgent },
    });
  }

  /**
   * Удалить push-подписку
   */
  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
    return { success: true };
  }

  /**
   * Отправить push конкретному пользователю (все его устройства)
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.enabled) {
      this.logger.debug(
        `[PUSH DISABLED] Would send to user ${userId}: ${payload.title}`,
      );
      return 0;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return 0;

    let sent = 0;
    const staleIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
            { TTL: 86400 }, // 24 hours
          );
          sent++;
        } catch (error: unknown) {
          const statusCode =
            error && typeof error === 'object' && 'statusCode' in error
              ? (error as { statusCode?: number }).statusCode
              : undefined;

          if (statusCode === 410 || statusCode === 404) {
            // Подписка истекла или не найдена — помечаем на удаление
            staleIds.push(sub.id);
          } else {
            this.logger.warn(
              `Push notification failed for subscription ${sub.id}: ${String(error)}`,
            );
          }
        }
      }),
    );

    // Удаляем устаревшие подписки
    if (staleIds.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { id: { in: staleIds } },
      });
      this.logger.log(`Cleaned ${staleIds.length} stale push subscriptions`);
    }

    return sent;
  }

  /**
   * Публичный ключ VAPID для фронтенда
   */
  getPublicKey(): string {
    return this.publicKey;
  }
}
