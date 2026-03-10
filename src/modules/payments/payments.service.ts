import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly miaService: PaymentsMiaService,
    private readonly webhookService: PaymentsWebhookService,
    private readonly queryService: PaymentsQueryService,
    private readonly upgradeService: PaymentsUpgradeService,
  ) {}

  // ==================== СОЗДАНИЕ ПЛАТЕЖЕЙ ====================

  /**
   * Создать QR-платёж через MIA (MAIB)
   */
  async createMiaCheckout(dto: CreatePaymentDto, userId: string) {
    try {
      return await this.miaService.createTariffQrPayment(dto, userId);
    } catch (err) {
      this.logger.error('createMiaCheckout failed', err);
      throw err;
    }
  }

  async handleMiaCallback(orderId: string) {
    try {
      await this.webhookService.completeMiaTariffPayment(orderId);
      return { received: true };
    } catch (err) {
      this.logger.error('handleMiaCallback failed', err);
      throw err;
    }
  }

  async simulateMiaSandboxPayment(paymentId: string, userId: string) {
    try {
      return await this.miaService.simulateSandboxPayment(paymentId, userId);
    } catch (err) {
      this.logger.error('simulateMiaSandboxPayment failed', err);
      throw err;
    }
  }

  // ==================== ЗАПРОСЫ И СТАТИСТИКА ====================

  /**
   * Получить платежи мастера с проверкой прав (ADMIN или сам мастер)
   */
  async getPaymentsForMaster(masterId: string, authUser: JwtUser) {
    try {
      this.validateMasterAccess(masterId, authUser);
      return await this.queryService.getPaymentsForMaster(masterId);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.error('getPaymentsForMaster failed', err);
      throw err;
    }
  }

  /**
   * Получить статистику платежей с проверкой прав
   */
  async getPaymentStats(masterId: string, authUser: JwtUser) {
    try {
      this.validateMasterAccess(masterId, authUser);
      return await this.queryService.getPaymentStats(masterId);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.error('getPaymentStats failed', err);
      throw err;
    }
  }

  // ==================== УПРАВЛЕНИЕ АПГРЕЙДАМИ ====================

  async confirmPendingUpgrade(userId: string) {
    try {
      return await this.upgradeService.confirmPendingUpgrade(userId);
    } catch (err) {
      this.logger.error('confirmPendingUpgrade failed', err);
      throw err;
    }
  }

  async cancelPendingUpgrade(userId: string) {
    try {
      return await this.upgradeService.cancelPendingUpgrade(userId);
    } catch (err) {
      this.logger.error('cancelPendingUpgrade failed', err);
      throw err;
    }
  }

  async cancelTariffAtPeriodEnd(userId: string) {
    try {
      return await this.upgradeService.cancelTariffAtPeriodEnd(userId);
    } catch (err) {
      this.logger.error('cancelTariffAtPeriodEnd failed', err);
      throw err;
    }
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ ====================

  /**
   * Универсальная проверка прав доступа к финансовым данным мастера
   */
  private validateMasterAccess(masterId: string, authUser: JwtUser) {
    if (authUser.role === 'ADMIN') return;

    const ownMasterId = authUser.masterProfile?.id;
    if (!ownMasterId || ownMasterId !== masterId) {
      throw new ForbiddenException('Access to payment data denied');
    }
  }
}
