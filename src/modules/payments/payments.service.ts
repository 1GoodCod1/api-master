import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../common/errors';
import { UserRole } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsMiaService } from './services/payments-mia.service';
import { PaymentsWebhookService } from './services/payments-webhook.service';
import { PaymentsQueryService } from './services/payments-query.service';
import { PaymentsUpgradeService } from './services/payments-upgrade.service';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';

/**
 * PaymentsService — координатор модуля платежей.
 * Делегирует выполнение специализированным сервисам и обрабатывает логику доступа.
 * Все платежи проходят через MIA.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly miaService: PaymentsMiaService,
    private readonly webhookService: PaymentsWebhookService,
    private readonly queryService: PaymentsQueryService,
    private readonly upgradeService: PaymentsUpgradeService,
  ) {}

  // ==================== СОЗДАНИЕ ПЛАТЕЖЕЙ ====================

  async createMiaCheckout(dto: CreatePaymentDto, userId: string) {
    return this.miaService.createTariffQrPayment(dto, userId);
  }

  async handleMiaCallback(orderId: string) {
    await this.webhookService.completeMiaTariffPayment(orderId);
    return { received: true };
  }

  async simulateMiaSandboxPayment(paymentId: string, userId: string) {
    return this.miaService.simulateSandboxPayment(paymentId, userId);
  }

  // ==================== ЗАПРОСЫ И СТАТИСТИКА ====================

  async getPaymentsForMaster(masterId: string, authUser: JwtUser) {
    this.validateMasterAccess(masterId, authUser);
    return this.queryService.getPaymentsForMaster(masterId);
  }

  async getPaymentStats(masterId: string, authUser: JwtUser) {
    this.validateMasterAccess(masterId, authUser);
    return this.queryService.getPaymentStats(masterId);
  }

  // ==================== УПРАВЛЕНИЕ АПГРЕЙДАМИ ====================

  async confirmPendingUpgrade(userId: string) {
    return this.upgradeService.confirmPendingUpgrade(userId);
  }

  async cancelPendingUpgrade(userId: string) {
    return this.upgradeService.cancelPendingUpgrade(userId);
  }

  async cancelTariffAtPeriodEnd(userId: string) {
    return this.upgradeService.cancelTariffAtPeriodEnd(userId);
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ====================

  private validateMasterAccess(masterId: string, authUser: JwtUser) {
    if (authUser.role === UserRole.ADMIN) return;

    const ownMasterId = authUser.masterProfile?.id;
    if (!ownMasterId || ownMasterId !== masterId) {
      throw AppErrors.forbidden(AppErrorMessages.PAYMENT_ACCESS_DENIED);
    }
  }
}
