import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/database/prisma.service';
import { TariffsService } from '../../tariffs/tariffs.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentsWebhookService } from './payments-webhook.service';
export declare class PaymentsMiaService {
    private readonly prisma;
    private readonly configService;
    private readonly tariffsService;
    private readonly webhookService;
    private tokenCache;
    constructor(prisma: PrismaService, configService: ConfigService, tariffsService: TariffsService, webhookService: PaymentsWebhookService);
    private isMiaApiConfigured;
    private getAccessToken;
    createTariffQrPayment(dto: CreatePaymentDto, userId: string): Promise<{
        qrUrl: string;
        qrId: string;
        orderId: string;
        paymentId: string;
    }>;
    private getAmount;
    private getDays;
    simulateSandboxPayment(paymentId: string, userId: string): Promise<{
        ok: boolean;
        orderId: string;
        qrStatus: string;
    }>;
}
