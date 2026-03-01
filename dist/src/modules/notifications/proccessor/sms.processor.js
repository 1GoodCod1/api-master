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
var SmsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("../notifications.service");
let SmsProcessor = SmsProcessor_1 = class SmsProcessor {
    notificationsService;
    logger = new common_1.Logger(SmsProcessor_1.name);
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async handleSMS(job) {
        this.logger.debug(`Processing SMS job ${job.id} to ${job.data.to}`);
        try {
            await this.notificationsService.processSMSJob(job);
            this.logger.log(`SMS job ${job.id} completed successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to process SMS job ${job.id}:`, error);
            throw error;
        }
    }
    async handleBulkSMS(job) {
        this.logger.debug(`Processing bulk SMS job ${job.id}`);
        const { recipients, message } = job.data;
        for (const recipient of recipients) {
            try {
                await this.notificationsService.sendSMS(recipient, message);
                this.logger.log(`Bulk SMS sent to ${recipient}`);
            }
            catch (error) {
                this.logger.error(`Failed to send bulk SMS to ${recipient}:`, error);
            }
        }
    }
};
exports.SmsProcessor = SmsProcessor;
__decorate([
    (0, bull_1.Process)('send-sms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmsProcessor.prototype, "handleSMS", null);
__decorate([
    (0, bull_1.Process)('send-bulk-sms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SmsProcessor.prototype, "handleBulkSMS", null);
exports.SmsProcessor = SmsProcessor = SmsProcessor_1 = __decorate([
    (0, bull_1.Processor)('sms'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], SmsProcessor);
//# sourceMappingURL=sms.processor.js.map