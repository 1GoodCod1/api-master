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
var TelegramProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("../notifications.service");
let TelegramProcessor = TelegramProcessor_1 = class TelegramProcessor {
    notificationsService;
    logger = new common_1.Logger(TelegramProcessor_1.name);
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async handleTelegram(job) {
        this.logger.debug(`Processing Telegram job ${job.id}`);
        try {
            await this.notificationsService.processTelegramJob(job);
            this.logger.log(`Telegram job ${job.id} completed successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to process Telegram job ${job.id}:`, error);
            throw error;
        }
    }
    async handleBroadcast(job) {
        this.logger.debug(`Processing broadcast job ${job.id}`);
        const { message, options } = job.data;
        try {
            await this.notificationsService.sendTelegram(message, options);
            this.logger.log(`Broadcast job ${job.id} completed`);
        }
        catch (error) {
            this.logger.error(`Failed to process broadcast job ${job.id}:`, error);
            throw error;
        }
    }
};
exports.TelegramProcessor = TelegramProcessor;
__decorate([
    (0, bull_1.Process)('send-telegram'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramProcessor.prototype, "handleTelegram", null);
__decorate([
    (0, bull_1.Process)('send-broadcast'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramProcessor.prototype, "handleBroadcast", null);
exports.TelegramProcessor = TelegramProcessor = TelegramProcessor_1 = __decorate([
    (0, bull_1.Processor)('telegram'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], TelegramProcessor);
//# sourceMappingURL=telegram.processor.js.map