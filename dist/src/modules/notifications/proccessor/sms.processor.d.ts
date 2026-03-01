import type { Job } from 'bull';
import { NotificationsService } from '../notifications.service';
import { SMSJobData } from '../../shared/types/notification.types';
export declare class SmsProcessor {
    private readonly notificationsService;
    private readonly logger;
    constructor(notificationsService: NotificationsService);
    handleSMS(job: Job<SMSJobData>): Promise<void>;
    handleBulkSMS(job: Job<{
        recipients: string[];
        message: string;
    }>): Promise<void>;
}
