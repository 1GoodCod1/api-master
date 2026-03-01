import type { Job } from 'bull';
import { NotificationsService } from '../notifications.service';
import { TelegramJobData, type TelegramBroadcastJobData } from '../../shared/types/notification.types';
export declare class TelegramProcessor {
    private readonly notificationsService;
    private readonly logger;
    constructor(notificationsService: NotificationsService);
    handleTelegram(job: Job<TelegramJobData>): Promise<void>;
    handleBroadcast(job: Job<TelegramBroadcastJobData>): Promise<void>;
}
