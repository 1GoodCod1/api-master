import { Injectable } from '@nestjs/common';
import { VerificationQueryService } from './services/verification-query.service';
import { VerificationActionService } from './services/verification-action.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

/**
 * VerificationService — координатор модуля верификации.
 * Управляет процессами подачи и проверки заявок на верификацию через специализированные сервисы.
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly queryService: VerificationQueryService,
    private readonly actionService: VerificationActionService,
  ) {}

  /**
   * Подать заявку на верификацию (только для мастеров)
   */
  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    return this.actionService.submit(userId, dto);
  }

  /**
   * Получить статус верификации для текущего мастера
   */
  async getMyVerificationStatus(userId: string) {
    return this.queryService.getMyStatus(userId);
  }

  /**
   * Получить список заявок на верификацию (для админа)
   */
  async getPendingVerifications(page: number = 1, limit: number = 20) {
    return this.queryService.getPendingRequests(page, limit);
  }

  /**
   * Статистика верификаций: сколько одобрено из первых 100 (для автовыдачи премиума)
   */
  async getVerificationStats() {
    const approvedCount = await this.queryService.getApprovedCount();
    const first100Limit = 100;
    return { approvedCount, first100Limit };
  }

  /**
   * Получить детали заявки на верификацию (для админа), с флагом «попадёт в первые 100»
   */
  async getVerificationDetails(verificationId: string) {
    const [detail, approvedCount] = await Promise.all([
      this.queryService.getDetails(verificationId),
      this.queryService.getApprovedCount(),
    ]);
    const first100Limit = 100;
    const willReceivePremium = approvedCount < first100Limit;
    return {
      ...detail,
      approvedCount,
      first100Limit,
      willReceivePremium,
      nextSlotNumber: approvedCount + 1,
    };
  }

  /**
   * Рассмотреть заявку на верификацию (для админа)
   */
  async reviewVerification(
    verificationId: string,
    adminId: string,
    dto: ReviewVerificationDto,
  ) {
    return this.actionService.review(verificationId, adminId, dto);
  }
}
