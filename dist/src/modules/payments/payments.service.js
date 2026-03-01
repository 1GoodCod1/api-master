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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const payments_mia_service_1 = require("./services/payments-mia.service");
const payments_webhook_service_1 = require("./services/payments-webhook.service");
const payments_query_service_1 = require("./services/payments-query.service");
const payments_upgrade_service_1 = require("./services/payments-upgrade.service");
let PaymentsService = class PaymentsService {
    miaService;
    webhookService;
    queryService;
    upgradeService;
    constructor(miaService, webhookService, queryService, upgradeService) {
        this.miaService = miaService;
        this.webhookService = webhookService;
        this.queryService = queryService;
        this.upgradeService = upgradeService;
    }
    async createCheckoutSession(dto, userId) {
        return this.miaService.createTariffQrPayment(dto, userId);
    }
    async createMiaCheckout(dto, userId) {
        return this.miaService.createTariffQrPayment(dto, userId);
    }
    async handleMiaCallback(orderId) {
        await this.webhookService.completeMiaTariffPayment(orderId);
        return { received: true };
    }
    async simulateMiaSandboxPayment(paymentId, userId) {
        return this.miaService.simulateSandboxPayment(paymentId, userId);
    }
    async getPaymentsForMaster(masterId, authUser) {
        this.validateMasterAccess(masterId, authUser);
        return this.queryService.getPaymentsForMaster(masterId);
    }
    async getPaymentStats(masterId, authUser) {
        this.validateMasterAccess(masterId, authUser);
        return this.queryService.getPaymentStats(masterId);
    }
    async confirmPendingUpgrade(userId) {
        return this.upgradeService.confirmPendingUpgrade(userId);
    }
    async cancelPendingUpgrade(userId) {
        return this.upgradeService.cancelPendingUpgrade(userId);
    }
    async cancelTariffAtPeriodEnd(userId) {
        return this.upgradeService.cancelTariffAtPeriodEnd(userId);
    }
    validateMasterAccess(masterId, authUser) {
        if (authUser.role === 'ADMIN')
            return;
        const ownMasterId = authUser.masterProfile?.id;
        if (!ownMasterId || ownMasterId !== masterId) {
            throw new common_1.ForbiddenException('Access to payment data denied');
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payments_mia_service_1.PaymentsMiaService,
        payments_webhook_service_1.PaymentsWebhookService,
        payments_query_service_1.PaymentsQueryService,
        payments_upgrade_service_1.PaymentsUpgradeService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map