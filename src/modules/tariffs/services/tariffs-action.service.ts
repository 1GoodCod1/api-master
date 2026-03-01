import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { CreateTariffDto } from '../dto/create-tariff.dto';
import { UpdateTariffDto } from '../dto/update-tariff.dto';
import { Decimal } from '@prisma/client-runtime-utils';

@Injectable()
export class TariffsActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Создать новый тариф
   * @param dto Данные тарифа
   */
  async create(dto: CreateTariffDto) {
    const existing = await this.prisma.tariff.findUnique({
      where: { type: dto.type },
    });
    if (existing) {
      throw new BadRequestException(`Тариф с типом ${dto.type} уже существует`);
    }

    const tariff = await this.prisma.tariff.create({
      data: {
        name: dto.name,
        type: dto.type,
        price: dto.price,
        amount: new Decimal(dto.amount),
        days: dto.days ?? 30,
        stripePriceId: dto.stripePriceId,
        description: dto.description,
        features: dto.features,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.invalidateCache(tariff.id, tariff.type);
    return tariff;
  }

  /**
   * Обновить существующий тариф
   * @param id ID тарифа
   * @param dto Данные для обновления
   */
  async update(id: string, dto: UpdateTariffDto) {
    const tariff = await this.prisma.tariff.findUnique({ where: { id } });
    if (!tariff) throw new NotFoundException('Тариф не найден');

    if (dto.type && dto.type !== tariff.type) {
      const existing = await this.prisma.tariff.findUnique({
        where: { type: dto.type },
      });
      if (existing)
        throw new BadRequestException(
          `Тариф с типом ${dto.type} уже существует`,
        );
    }

    const updated = await this.prisma.tariff.update({
      where: { id },
      data: {
        ...dto,
        amount: dto.amount ? new Decimal(dto.amount) : undefined,
      },
    });

    await this.invalidateCache(id, tariff.type, dto.type);
    return updated;
  }

  /**
   * Удалить тариф
   * @param id ID тарифа
   */
  async remove(id: string) {
    const tariff = await this.prisma.tariff.findUnique({ where: { id } });
    if (!tariff) throw new NotFoundException('Тариф не найден');

    const deleted = await this.prisma.tariff.delete({ where: { id } });

    await this.invalidateCache(id, tariff.type);
    return deleted;
  }

  private async invalidateCache(id: string, oldType: string, newType?: string) {
    await this.cache.del(this.cache.keys.tariffById(id));
    await this.cache.del(this.cache.keys.tariffByType(oldType));
    if (newType) await this.cache.del(this.cache.keys.tariffByType(newType));
    await this.cache.invalidate('cache:tariffs:all:*');
  }
}
