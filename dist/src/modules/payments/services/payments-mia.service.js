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
exports.PaymentsMiaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../shared/database/prisma.service");
const tariffs_service_1 = require("../../tariffs/tariffs.service");
const constants_1 = require("../../../common/constants");
const plans_1 = require("../../../common/helpers/plans");
const payments_webhook_service_1 = require("./payments-webhook.service");
let PaymentsMiaService = class PaymentsMiaService {
    prisma;
    configService;
    tariffsService;
    webhookService;
    tokenCache = null;
    constructor(prisma, configService, tariffsService, webhookService) {
        this.prisma = prisma;
        this.configService = configService;
        this.tariffsService = tariffsService;
        this.webhookService = webhookService;
    }
    isMiaApiConfigured() {
        const clientId = this.configService.get('mia.clientId')?.trim();
        const clientSecret = this.configService
            .get('mia.clientSecret')
            ?.trim();
        const baseUrl = this.configService.get('mia.baseUrl')?.trim();
        const terminalId = this.configService.get('mia.terminalId')?.trim();
        const sandbox = this.configService.get('mia.sandbox');
        const hasRequired = !!(clientId && clientSecret && baseUrl);
        return sandbox ? hasRequired : !!(hasRequired && terminalId);
    }
    async getAccessToken() {
        const now = Date.now();
        if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
            return this.tokenCache.token;
        }
        const clientId = this.configService.get('mia.clientId');
        const clientSecret = this.configService.get('mia.clientSecret');
        const baseUrl = this.configService
            .get('mia.baseUrl')
            ?.replace(/\/$/, '');
        const authPath = this.configService.get('mia.authPath');
        if (!clientId || !clientSecret || !baseUrl || !authPath) {
            throw new common_1.BadRequestException('MIA payment is not configured');
        }
        const url = `${baseUrl}${authPath.startsWith('/') ? authPath : `/${authPath}`}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, clientSecret }),
        });
        const data = (await res.json());
        if (!data.ok || !data.result?.accessToken) {
            throw new common_1.BadRequestException('MIA auth failed');
        }
        const expiresIn = (data.result.expiresIn ?? 300) * 1000;
        this.tokenCache = {
            token: data.result.accessToken,
            expiresAt: now + expiresIn,
        };
        return this.tokenCache.token;
    }
    async createTariffQrPayment(dto, userId) {
        const { masterId, tariffType } = dto;
        const master = await this.prisma.master.findUnique({
            where: { id: masterId },
            include: { user: { select: { isVerified: true } } },
        });
        if (!master)
            throw new common_1.NotFoundException('Master not found');
        if (!master.user.isVerified) {
            throw new common_1.ForbiddenException('Account verification required to purchase tariffs.');
        }
        const currentEffectiveTariff = (0, plans_1.getEffectiveTariff)(master);
        if (currentEffectiveTariff === 'VIP' && tariffType === 'PREMIUM') {
            const canUpgrade = !master.tariffExpiresAt ||
                new Date(master.tariffExpiresAt).getTime() <= Date.now() ||
                new Date(master.tariffExpiresAt).getTime() - Date.now() <=
                    2 * 24 * 60 * 60 * 1000;
            if (!canUpgrade)
                throw new common_1.BadRequestException('Upgrade to PREMIUM available only when VIP expires soon.');
        }
        if (master.pendingUpgradeTo)
            throw new common_1.BadRequestException('Already have a pending upgrade.');
        const amount = await this.getAmount(tariffType);
        const days = await this.getDays(tariffType);
        const sandbox = this.configService.get('mia.sandbox');
        const frontendUrl = this.configService.get('frontendUrl')?.replace(/\/$/, '') ||
            'http://localhost:3000';
        if (sandbox && !this.isMiaApiConfigured()) {
            const payment = await this.prisma.payment.create({
                data: {
                    masterId,
                    userId,
                    amount,
                    currency: 'MDL',
                    tariffType,
                    status: constants_1.PaymentStatus.PENDING,
                    metadata: { provider: 'MIA', days },
                },
            });
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: {
                    metadata: {
                        provider: 'MIA',
                        qrId: payment.id,
                        days,
                    },
                },
            });
            return {
                qrUrl: `${frontendUrl}/plans/checkout/success?orderId=${payment.id}`,
                qrId: payment.id,
                orderId: payment.id,
                paymentId: payment.id,
            };
        }
        const terminalIdRaw = this.configService
            .get('mia.terminalId')
            ?.trim();
        const terminalId = terminalIdRaw || (sandbox ? 'P011111' : undefined);
        const apiUrl = this.configService.get('apiUrl')?.replace(/\/$/, '');
        const missing = [];
        if (!terminalId)
            missing.push('MIA_TERMINAL_ID');
        if (!apiUrl)
            missing.push('API_URL');
        if (!frontendUrl)
            missing.push('FRONTEND_URL');
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`MIA or app URL not configured. Set in .env: ${missing.join(', ')}`);
        }
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        const payment = await this.prisma.payment.create({
            data: {
                masterId,
                userId,
                amount,
                currency: 'MDL',
                tariffType,
                status: constants_1.PaymentStatus.PENDING,
                metadata: {
                    provider: 'MIA',
                    days,
                },
            },
        });
        const token = await this.getAccessToken();
        const baseUrl = this.configService
            .get('mia.baseUrl')
            ?.replace(/\/$/, '');
        const createQrPath = this.configService.get('mia.createQrPath') || '/v1/qr/create';
        const createUrl = `${baseUrl}${createQrPath.startsWith('/') ? createQrPath : `/${createQrPath}`}`;
        const body = {
            type: 'Dynamic',
            expiresAt: expiresAt.toISOString(),
            amountType: 'Fixed',
            amount: Number(payment.amount),
            currency: 'MDL',
            description: `Tariff ${tariffType}`,
            orderId: payment.id,
            callbackUrl: `${apiUrl}/payments/mia-callback`,
            redirectUrl: `${frontendUrl}/plans/checkout/success?orderId=${payment.id}`,
            terminalId: terminalId,
        };
        const qrRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const qrData = (await qrRes.json());
        if (!qrData.ok || !qrData.result?.url) {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: constants_1.PaymentStatus.FAILED },
            });
            throw new common_1.BadRequestException(qrData?.result
                ? 'MIA QR creation failed'
                : 'MIA payment is not configured');
        }
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                metadata: {
                    ...(payment.metadata || {}),
                    provider: 'MIA',
                    qrId: qrData.result.qrId,
                    days,
                },
            },
        });
        return {
            qrUrl: qrData.result.url,
            qrId: qrData.result.qrId,
            orderId: payment.id,
            paymentId: payment.id,
        };
    }
    async getAmount(tariffType) {
        try {
            const tariff = await this.tariffsService.findByType(tariffType);
            return Number(tariff.amount);
        }
        catch {
            return { BASIC: 0, VIP: 199, PREMIUM: 399 }[tariffType] ?? 0;
        }
    }
    async getDays(tariffType) {
        try {
            const tariff = await this.tariffsService.findByType(tariffType);
            return tariff.days;
        }
        catch {
            return 30;
        }
    }
    async simulateSandboxPayment(paymentId, userId) {
        const sandbox = this.configService.get('mia.sandbox');
        if (!sandbox) {
            throw new common_1.BadRequestException('MIA sandbox simulation is disabled');
        }
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        if (payment.userId !== userId) {
            throw new common_1.ForbiddenException('This payment does not belong to you');
        }
        if (payment.status !== 'PENDING') {
            throw new common_1.BadRequestException('Payment is not pending');
        }
        const meta = payment.metadata ?? {};
        const provider = meta.provider;
        const qrId = meta.qrId;
        if (provider !== 'MIA') {
            throw new common_1.BadRequestException('Not a MIA payment. Call create-mia-checkout first.');
        }
        if (!this.isMiaApiConfigured()) {
            await this.webhookService.completeMiaTariffPayment(paymentId);
            return { ok: true, orderId: paymentId, qrStatus: 'Paid' };
        }
        if (!qrId) {
            throw new common_1.BadRequestException('qrId missing in payment metadata.');
        }
        const baseUrl = this.configService
            .get('mia.baseUrl')
            ?.replace(/\/$/, '');
        const testPayPath = this.configService.get('mia.testPayPath') || '/v2/mia/test-pay';
        const url = `${baseUrl}${testPayPath.startsWith('/') ? testPayPath : `/${testPayPath}`}`;
        const token = await this.getAccessToken();
        const body = {
            qrId,
            amount: Number(payment.amount),
            iban: 'MD88AG000000011621810140',
            currency: 'MDL',
            payerName: 'Sandbox Test',
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
        const data = (await res.json());
        if (!data.ok || data.result?.qrStatus !== 'Paid') {
            const msg = data.errors?.[0]?.errorMessage ||
                data.result?.qrStatus ||
                'MIA test-pay failed';
            throw new common_1.BadRequestException(msg);
        }
        await this.webhookService.completeMiaTariffPayment(paymentId);
        return { ok: true, orderId: paymentId, qrStatus: data.result?.qrStatus };
    }
};
exports.PaymentsMiaService = PaymentsMiaService;
exports.PaymentsMiaService = PaymentsMiaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        tariffs_service_1.TariffsService,
        payments_webhook_service_1.PaymentsWebhookService])
], PaymentsMiaService);
//# sourceMappingURL=payments-mia.service.js.map