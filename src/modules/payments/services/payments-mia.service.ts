import { Injectable } from '@nestjs/common';
import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../../common/errors';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/database/prisma.service';
import { TariffsService } from '../../marketplace/tariffs/tariffs.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { Prisma } from '@prisma/client';
import { PaymentStatus, TariffType } from '../../../common/constants';
import { getEffectiveTariff } from '../../../common/helpers/plans';
import { PaymentsWebhookService } from './payments-webhook.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-action.enum';
import { AuditEntityType } from '../../audit/audit-entity-type.enum';
import type {
  MiaAuthResponse,
  MiaCreateQrRequest,
  MiaCreateQrResponse,
  MiaTestPayRequest,
  MiaTestPayResponse,
} from '../types';

@Injectable()
export class PaymentsMiaService {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tariffsService: TariffsService,
    private readonly webhookService: PaymentsWebhookService,
    private readonly auditService: AuditService,
  ) {}

  /** MIA API доступен (для реальных платежей и test-pay). В sandbox terminalId необязателен. */
  private isMiaApiConfigured(): boolean {
    const clientId = this.configService.get<string>('mia.clientId')?.trim();
    const clientSecret = this.configService
      .get<string>('mia.clientSecret')
      ?.trim();
    const baseUrl = this.configService.get<string>('mia.baseUrl')?.trim();
    const terminalId = this.configService.get<string>('mia.terminalId')?.trim();
    const sandbox = this.configService.get<boolean>('mia.sandbox');
    const hasRequired = !!(clientId && clientSecret && baseUrl);
    return sandbox ? hasRequired : !!(hasRequired && terminalId);
  }

  /**
   * Get Bearer token (cached until ~1 min before expiry)
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.token;
    }

    const clientId = this.configService.get<string>('mia.clientId');
    const clientSecret = this.configService.get<string>('mia.clientSecret');
    const baseUrl = this.configService
      .get<string>('mia.baseUrl')
      ?.replace(/\/$/, '');
    const authPath = this.configService.get<string>('mia.authPath');

    if (!clientId || !clientSecret || !baseUrl || !authPath) {
      throw AppErrors.badRequest(AppErrorMessages.MIA_NOT_CONFIGURED);
    }

    const url = `${baseUrl}${authPath.startsWith('/') ? authPath : `/${authPath}`}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    const data = (await res.json()) as MiaAuthResponse;
    if (!data.ok || !data.result?.accessToken) {
      throw AppErrors.badRequest(AppErrorMessages.MIA_AUTH_FAILED);
    }

    const expiresIn = (data.result.expiresIn ?? 300) * 1000;
    this.tokenCache = {
      token: data.result.accessToken,
      expiresAt: now + expiresIn,
    };
    return this.tokenCache.token;
  }

  /**
   * Create MIA QR payment for tariff. Creates Payment in DB, then calls MIA API.
   */
  async createTariffQrPayment(dto: CreatePaymentDto, userId: string) {
    const { masterId, tariffType } = dto;

    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      include: { user: { select: { isVerified: true } } },
    });

    if (!master) throw AppErrors.notFound(AppErrorMessages.MASTER_NOT_FOUND);
    if (!master.user.isVerified) {
      throw AppErrors.forbidden(AppErrorMessages.MIA_VERIFICATION_REQUIRED);
    }

    const currentEffectiveTariff = getEffectiveTariff(master);
    if (
      currentEffectiveTariff === TariffType.VIP &&
      tariffType === TariffType.PREMIUM
    ) {
      const canUpgrade =
        !master.tariffExpiresAt ||
        new Date(master.tariffExpiresAt).getTime() <= Date.now() ||
        new Date(master.tariffExpiresAt).getTime() - Date.now() <=
          2 * 24 * 60 * 60 * 1000;
      if (!canUpgrade)
        throw AppErrors.badRequest(AppErrorMessages.UPGRADE_VIP_PREMIUM_WINDOW);
    }
    if (master.pendingUpgradeTo)
      throw AppErrors.badRequest(AppErrorMessages.MIA_PENDING_UPGRADE);

    const amount = await this.getAmount(tariffType);
    const days = await this.getDays(tariffType);
    const sandbox = this.configService.get<boolean>('mia.sandbox');
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');
    const fromConfig = this.configService
      .get<string>('frontendUrl')
      ?.replace(/\/$/, '');
    const frontendUrl =
      fromConfig || (nodeEnv === 'production' ? '' : 'http://localhost:3000');

    // Sandbox без конфига MIA: мок-платёж, симуляция через POST /payments/mia-sandbox-simulate
    if (sandbox && !this.isMiaApiConfigured()) {
      const payment = await this.prisma.payment.create({
        data: {
          masterId,
          userId,
          amount,
          currency: 'MDL',
          tariffType,
          status: PaymentStatus.PENDING,
          metadata: { provider: 'MIA', days } as object,
        },
      });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            provider: 'MIA',
            qrId: payment.id,
            days,
          } as object,
        },
      });

      // Audit log: создание платежа (sandbox)
      await this.auditService.log({
        userId: userId,
        action: AuditAction.PAYMENT_CREATED,
        entityType: AuditEntityType.Payment,
        entityId: payment.id,
        newData: {
          amount,
          tariffType,
          sandbox: true,
        } satisfies Prisma.InputJsonValue,
      });

      return {
        qrUrl: `${frontendUrl}/plans/checkout/success?orderId=${payment.id}`,
        qrId: payment.id,
        orderId: payment.id,
        paymentId: payment.id,
      };
    }

    const terminalIdRaw = this.configService
      .get<string>('mia.terminalId')
      ?.trim();
    const terminalId = terminalIdRaw || (sandbox ? 'P011111' : undefined);
    const apiUrl = this.configService.get<string>('apiUrl')?.replace(/\/$/, '');
    const missing: string[] = [];
    if (!terminalId) missing.push('MIA_TERMINAL_ID');
    if (!apiUrl) missing.push('API_URL');
    if (!frontendUrl) missing.push('FRONTEND_URL');
    if (missing.length > 0) {
      throw AppErrors.badRequest(
        AppErrorTemplates.miaUrlMissing(missing.join(', ')),
      );
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
        status: PaymentStatus.PENDING,
        metadata: {
          provider: 'MIA',
          days,
        } as object,
      },
    });

    const token = await this.getAccessToken();
    const baseUrl = this.configService
      .get<string>('mia.baseUrl')
      ?.replace(/\/$/, '');
    const createQrPath =
      this.configService.get<string>('mia.createQrPath') || '/v1/qr/create';
    const createUrl = `${baseUrl}${createQrPath.startsWith('/') ? createQrPath : `/${createQrPath}`}`;

    const body: MiaCreateQrRequest = {
      type: 'Dynamic',
      expiresAt: expiresAt.toISOString(),
      amountType: 'Fixed',
      amount: Number(payment.amount),
      currency: 'MDL',
      description: `Tariff ${tariffType}`,
      orderId: payment.id,
      callbackUrl: `${apiUrl}/payments/mia-callback`,
      redirectUrl: `${frontendUrl}/plans/checkout/success?orderId=${payment.id}`,
      terminalId: terminalId as string,
    };

    const qrRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const qrData = (await qrRes.json()) as MiaCreateQrResponse;
    if (!qrData.ok || !qrData.result?.url) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw AppErrors.badRequest(
        AppErrorTemplates.miaQrCreationFailed(!!qrData?.result),
      );
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...((payment.metadata as object) || {}),
          provider: 'MIA',
          qrId: qrData.result.qrId,
          days,
        } as object,
      },
    });

    // Audit log: создание платежа
    await this.auditService.log({
      userId: userId,
      action: AuditAction.PAYMENT_CREATED,
      entityType: AuditEntityType.Payment,
      entityId: payment.id,
      newData: {
        amount,
        tariffType,
        qrId: qrData.result.qrId,
      } satisfies Prisma.InputJsonValue,
    });

    return {
      qrUrl: qrData.result.url,
      qrId: qrData.result.qrId,
      orderId: payment.id,
      paymentId: payment.id,
    };
  }

  private async getAmount(tariffType: TariffType): Promise<number> {
    try {
      const tariff = await this.tariffsService.findByType(tariffType);
      return Number(tariff.amount);
    } catch {
      return { BASIC: 0, VIP: 199, PREMIUM: 399 }[tariffType] ?? 0;
    }
  }

  private async getDays(tariffType: TariffType): Promise<number> {
    try {
      const tariff = await this.tariffsService.findByType(tariffType);
      return tariff.days;
    } catch {
      return 30;
    }
  }

  /**
   * Только sandbox: симуляция оплаты через MIA POST /v2/mia/test-pay.
   * Вызывать после create-mia-checkout — paymentId из ответа.
   * При успехе завершает платёж и активирует тариф (как callback).
   */
  async simulateSandboxPayment(paymentId: string, userId: string) {
    const sandbox = this.configService.get<boolean>('mia.sandbox');
    if (!sandbox) {
      throw AppErrors.badRequest(AppErrorMessages.MIA_SANDBOX_DISABLED);
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw AppErrors.notFound(AppErrorMessages.PAYMENT_NOT_FOUND);
    if (payment.userId !== userId) {
      throw AppErrors.forbidden(AppErrorMessages.PAYMENT_NOT_BELONG_TO_USER);
    }
    if (payment.status !== 'PENDING') {
      throw AppErrors.badRequest(AppErrorMessages.PAYMENT_NOT_PENDING);
    }

    const meta = (payment.metadata as Record<string, unknown> | null) ?? {};
    const provider = meta.provider as string | undefined;
    const qrId = meta.qrId as string | undefined;
    if (provider !== 'MIA') {
      throw AppErrors.badRequest(AppErrorMessages.MIA_NOT_MIA_PAYMENT);
    }

    // Sandbox без конфига MIA: завершаем платёж локально, без вызова MIA test-pay
    if (!this.isMiaApiConfigured()) {
      await this.webhookService.completeMiaTariffPayment(paymentId);
      return { ok: true, orderId: paymentId, qrStatus: 'Paid' };
    }

    if (!qrId) {
      throw AppErrors.badRequest(AppErrorMessages.MIA_QR_ID_MISSING);
    }

    const baseUrl = this.configService
      .get<string>('mia.baseUrl')
      ?.replace(/\/$/, '');
    const testPayPath =
      this.configService.get<string>('mia.testPayPath') || '/v2/mia/test-pay';
    const url = `${baseUrl}${testPayPath.startsWith('/') ? testPayPath : `/${testPayPath}`}`;
    const token = await this.getAccessToken();

    const body: MiaTestPayRequest = {
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

    const data = (await res.json()) as MiaTestPayResponse;
    if (!data.ok || data.result?.qrStatus !== 'Paid') {
      const msg =
        data.errors?.[0]?.errorMessage ||
        data.result?.qrStatus ||
        'MIA test-pay failed';
      throw AppErrors.badRequest(msg);
    }

    await this.webhookService.completeMiaTariffPayment(paymentId);
    return { ok: true, orderId: paymentId, qrStatus: data.result?.qrStatus };
  }
}
