import { Injectable } from '@nestjs/common';
import { TariffsQueryService } from './services/tariffs-query.service';
import { TariffsActionService } from './services/tariffs-action.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { TariffType } from '@prisma/client';

/**
 * TariffsService — координатор модуля тарифов.
 * Управляет процессами получения данных и изменения тарифов через специализированные сервисы.
 */
@Injectable()
export class TariffsService {
  constructor(
    private readonly queryService: TariffsQueryService,
    private readonly actionService: TariffsActionService,
  ) {}

  /**
   * Получить список всех тарифов
   */
  async findAll(filters: { isActive?: boolean } = {}) {
    return this.queryService.findAll(filters);
  }

  /**
   * Получить тариф по ID
   */
  async findOne(id: string) {
    return this.queryService.findOne(id);
  }

  /**
   * Найти тариф по типу
   */
  async findByType(type: TariffType) {
    return this.queryService.findByType(type);
  }

  /**
   * Создать новый тариф
   */
  async create(createTariffDto: CreateTariffDto, adminId?: string) {
    return this.actionService.create(createTariffDto, adminId);
  }

  /**
   * Обновить существующий тариф
   */
  async update(id: string, updateTariffDto: UpdateTariffDto, adminId?: string) {
    return this.actionService.update(id, updateTariffDto, adminId);
  }

  /**
   * Удалить тариф
   */
  async remove(id: string, adminId?: string) {
    return this.actionService.remove(id, adminId);
  }

  /**
   * Получить список активных тарифов для отображения пользователям
   */
  async getActiveTariffs() {
    return this.queryService.getActiveTariffs();
  }
}
