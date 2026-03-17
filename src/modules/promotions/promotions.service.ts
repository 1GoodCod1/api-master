import { Injectable, BadRequestException } from '@nestjs/common';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsActionService } from './services/promotions-action.service';
import { PromotionsQueryService } from './services/promotions-query.service';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * PromotionsService — фасад модуля акций.
 * Делегирует мутации в PromotionsActionService, чтение — в PromotionsQueryService.
 * Извлекает masterId из контекста пользователя, парсит query-параметры.
 */
@Injectable()
export class PromotionsService {
  constructor(
    private readonly actionService: PromotionsActionService,
    private readonly queryService: PromotionsQueryService,
  ) {}

  async createForUser(user: JwtUser, dto: CreatePromotionDto) {
    const masterId = this.resolveMasterId(user);
    return this.actionService.create(masterId, dto);
  }

  async findMyPromotionsForUser(user: JwtUser) {
    const masterId = this.resolveMasterId(user);
    return this.queryService.findMyPromotions(masterId);
  }

  async updateForUser(id: string, user: JwtUser, dto: UpdatePromotionDto) {
    const masterId = this.resolveMasterId(user);
    return this.actionService.update(id, masterId, dto);
  }

  async removeForUser(id: string, user: JwtUser) {
    const masterId = this.resolveMasterId(user);
    return this.actionService.remove(id, masterId);
  }

  async findActivePromotions(limit?: string | number) {
    return this.queryService.findActivePromotions(this.parseLimit(limit));
  }

  async findActivePromotionsForMaster(masterId: string) {
    return this.queryService.findActivePromotionsForMaster(masterId);
  }

  private resolveMasterId(user: JwtUser): string {
    const masterId = user.masterProfile?.id;
    if (!masterId) {
      throw new BadRequestException('Master profile not found');
    }
    return masterId;
  }

  private parseLimit(limit?: string | number): number {
    if (limit === undefined || limit === null) return DEFAULT_LIMIT;
    const num = typeof limit === 'number' ? limit : parseInt(limit, 10);
    return Number.isNaN(num)
      ? DEFAULT_LIMIT
      : Math.min(MAX_LIMIT, Math.max(1, num));
  }
}
