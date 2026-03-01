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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NotificationsSenderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsSenderService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bull_1 = require("@nestjs/bull");
const twilio_1 = __importDefault(require("twilio"));
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const notifications_action_service_1 = require("./notifications-action.service");
let NotificationsSenderService = NotificationsSenderService_1 = class NotificationsSenderService {
    configService;
    actionService;
    smsQueue;
    telegramQueue;
    logger = new common_1.Logger(NotificationsSenderService_1.name);
    twilioClient;
    constructor(configService, actionService, smsQueue, telegramQueue) {
        this.configService = configService;
        this.actionService = actionService;
        this.smsQueue = smsQueue;
        this.telegramQueue = telegramQueue;
        const sid = this.configService.get('twilio.accountSid');
        const auth = this.configService.get('twilio.authToken');
        if (sid && auth) {
            this.twilioClient = (0, twilio_1.default)(sid, auth);
        }
    }
    async sendSMS(to, message, options) {
        const smsConfig = this.configService.get('sms');
        if (!smsConfig?.enabled) {
            this.logger.log(`[SMS DISABLED] To ${to}: ${message.substring(0, 50)}...`);
            return;
        }
        const provider = smsConfig.provider || 'log';
        switch (provider) {
            case 'twilio':
                await this.sendViaTwilio(to, message, options);
                break;
            case 'http':
                await this.sendViaHttpProvider(to, message, options);
                break;
            case 'log':
            default:
                this.logger.log(`[SMS LOG] To: ${to}, Message: ${message}`);
                break;
        }
    }
    async sendTelegram(message, options) {
        const telegramEnabled = this.configService.get('notifications.telegramEnabled');
        if (!telegramEnabled) {
            this.logger.log(`[TELEGRAM DISABLED] Would send: ${message.substring(0, 50)}...`);
            return;
        }
        const botToken = this.configService.get('telegram.botToken');
        const chatId = options?.chatId ?? this.configService.get('telegram.chatId');
        if (!botToken || !chatId) {
            this.logger.warn('Telegram bot token or chat id not configured');
            return;
        }
        try {
            await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_notification: options?.silent || false,
            });
            this.logger.log('Telegram message sent successfully');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to send Telegram message: ${msg}`);
            if (this.configService.get('nodeEnv') === 'development') {
                this.logger.log(`[DEV] Telegram message would be: ${message}`);
            }
        }
    }
    async sendWhatsApp(to, message) {
        const enabled = this.configService.get('whatsapp.enabled');
        if (!enabled) {
            this.logger.log(`[WHATSAPP DISABLED] Would send to ${to}: ${message.substring(0, 50)}...`);
            return;
        }
        const senderId = this.configService.get('whatsapp.senderId');
        if (!this.twilioClient || !senderId) {
            this.logger.warn('Twilio client or WhatsApp sender ID not configured');
            return;
        }
        const normalizedTo = to.startsWith('whatsapp:')
            ? to
            : `whatsapp:${to.replace(/\s+/g, '')}`;
        try {
            await this.twilioClient.messages.create({
                body: message,
                to: normalizedTo,
                from: senderId,
            });
            this.logger.log('WhatsApp message sent successfully');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to send WhatsApp message: ${msg}`);
            if (this.configService.get('nodeEnv') === 'development') {
                this.logger.log(`[DEV] WhatsApp message would be: ${message}`);
            }
        }
    }
    async sendLeadNotification(to, leadData, options) {
        const msg = (leadData.message ?? '').toString();
        const text = `Новая заявка! Клиент: ${leadData.clientName || 'Без имени'}, Телефон: ${leadData.clientPhone}. Сообщение: ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`;
        const fullMessage = `📞 Новая заявка #${leadData.leadId}\n${text}`;
        await this.sendSMS(to, text);
        const globalChatId = this.configService.get('telegram.chatId');
        if (options?.telegramChatId) {
            await this.sendTelegram(fullMessage, { chatId: options.telegramChatId });
        }
        if (globalChatId && options?.telegramChatId !== globalChatId) {
            await this.sendTelegram(fullMessage, { chatId: globalChatId });
        }
        else if (!options?.telegramChatId && globalChatId) {
            await this.sendTelegram(fullMessage);
        }
        if (options?.whatsappPhone) {
            await this.sendWhatsApp(options.whatsappPhone, fullMessage);
        }
    }
    async sendPaymentConfirmation(to, paymentData) {
        const message = `Платеж успешно проведен! Тариф: ${paymentData.tariffType}, Сумма: ${paymentData.amount} MDL. Спасибо!`;
        await this.sendSMS(to, message);
    }
    async processSMSJob(job) {
        try {
            const { to, message } = job.data;
            if (this.isQuietHours()) {
                this.logger.log(`Queuing SMS for ${to} until morning (Quiet Hours)`);
                await this.delayUntilMorning(job);
                return;
            }
            if (this.twilioClient) {
                await this.twilioClient.messages.create({
                    body: message,
                    to,
                    from: this.configService.get('twilio.phoneNumber'),
                });
            }
            else {
                await this.sendViaHttpProvider(to, message);
            }
            this.logger.log(`SMS job ${job.id} sent to ${to}`);
            await this.actionService.saveNotification({
                type: client_1.NotificationType.SMS,
                recipient: to,
                message,
                status: client_1.NotificationStatus.SENT,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to execute SMS job ${job.id}:`, error);
            await this.actionService.saveNotification({
                type: client_1.NotificationType.SMS,
                recipient: job.data.to,
                message: job.data.message,
                status: client_1.NotificationStatus.FAILED,
                metadata: { error: errMsg },
            });
            throw error;
        }
    }
    async processTelegramJob(job) {
        try {
            const { message, options } = job.data;
            const botToken = this.configService.get('telegram.botToken');
            const chatId = options?.chatId || this.configService.get('telegram.chatId');
            if (!botToken || !chatId) {
                throw new Error('Telegram bot token or chat ID not configured');
            }
            await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: options?.parseMode || 'HTML',
                disable_notification: options?.disableNotification || false,
            });
            this.logger.log(`Telegram job ${job.id} sent`);
            await this.actionService.saveNotification({
                type: client_1.NotificationType.TELEGRAM,
                recipient: chatId,
                message,
                status: client_1.NotificationStatus.SENT,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to execute Telegram job ${job.id}:`, error);
            await this.actionService.saveNotification({
                type: client_1.NotificationType.TELEGRAM,
                recipient: 'admin',
                message: job.data.message,
                status: client_1.NotificationStatus.FAILED,
                metadata: { error: errMsg },
            });
            throw error;
        }
    }
    async sendViaTwilio(to, message, _options) {
        if (!this.twilioClient) {
            this.logger.warn('Twilio client not initialized, skipping SMS');
            return;
        }
        try {
            await this.twilioClient.messages.create({
                body: message,
                to,
                from: this.configService.get('twilio.phoneNumber'),
            });
            this.logger.log(`SMS sent via Twilio to ${to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send SMS via Twilio to ${to}:`, error);
            throw error;
        }
    }
    async sendViaHttpProvider(to, message, _options) {
        const httpConfig = this.configService.get('sms.httpProvider');
        if (!httpConfig?.url) {
            this.logger.warn('HTTP SMS provider URL not configured');
            return;
        }
        try {
            const params = {
                api_id: httpConfig.apiId ?? '',
                to: to.replace('+', ''),
                msg: message,
                json: 1,
            };
            if (httpConfig.apiKey)
                params.api_key = httpConfig.apiKey;
            await axios_1.default.post(httpConfig.url, null, {
                params,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            this.logger.log(`SMS sent via HTTP provider to ${to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send SMS via HTTP provider to ${to}:`, error);
            throw error;
        }
    }
    isQuietHours() {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 23 || hour < 8;
    }
    async delayUntilMorning(job) {
        const now = new Date();
        const morning = new Date();
        morning.setHours(8, 0, 0, 0);
        if (now > morning)
            morning.setDate(morning.getDate() + 1);
        await job.moveToDelayed(morning.getTime());
    }
};
exports.NotificationsSenderService = NotificationsSenderService;
exports.NotificationsSenderService = NotificationsSenderService = NotificationsSenderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bull_1.InjectQueue)('sms')),
    __param(3, (0, bull_1.InjectQueue)('telegram')),
    __metadata("design:paramtypes", [config_1.ConfigService,
        notifications_action_service_1.NotificationsActionService, Object, Object])
], NotificationsSenderService);
//# sourceMappingURL=notifications-sender.service.js.map