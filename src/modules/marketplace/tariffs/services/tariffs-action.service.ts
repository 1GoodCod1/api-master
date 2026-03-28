import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { CreateTariffDto } from '../dto/create-tariff.dto';
import { UpdateTariffDto } from '../dto/update-tariff.dto';
import { Prisma, type Tariff } from '@prisma/client';
import { AuditService } from '../../../audit/audit.service';
import { AuditAction } from '../../../audit/audit-action.enum';
import { AuditEntityType } from '../../../audit/audit-entity-type.enum';

@Injectable()
export class TariffsActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Создать новый тариф
   * @param dto Данные тарифа
   * @param adminId ID администратора
   */
  async create(dto: CreateTariffDto, adminId?: string) {
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
        amount: new Prisma.Decimal(dto.amount),
        days: dto.days ?? 30,
        description: dto.description,
        features: dto.features as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.invalidateCache(tariff.id, tariff.type);

    if (adminId) {
      await this.auditService.log({
        userId: adminId,
        action: AuditAction.TARIFF_CREATED,
        entityType: AuditEntityType.Tariff,
        entityId: tariff.id,
        newData: TariffsActionService.tariffToAuditJson(tariff),
      });
    }

    return tariff;
  }

  /**
   * Обновить существующий тариф
   * @param id ID тарифа
   * @param dto Данные для обновления
   * @param adminId ID администратора
   */
  async update(id: string, dto: UpdateTariffDto, adminId?: string) {
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
        name: dto.name,
        type: dto.type,
        price: dto.price,
        amount: dto.amount ? new Prisma.Decimal(dto.amount) : undefined,
        days: dto.days,
        description: dto.description,
        features: dto.features as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });

    await this.invalidateCache(id, tariff.type, dto.type);

    if (adminId) {
      await this.auditService.log({
        userId: adminId,
        action: AuditAction.TARIFF_UPDATED,
        entityType: AuditEntityType.Tariff,
        entityId: updated.id,
        newData: TariffsActionService.tariffToAuditJson(updated),
      });
    }

    return updated;
  }

  /**
   * Удалить тариф
   * @param id ID тарифа
   * @param adminId ID администратора
   */
  async remove(id: string, adminId?: string) {
    const tariff = await this.prisma.tariff.findUnique({ where: { id } });
    if (!tariff) throw new NotFoundException('Тариф не найден');

    const deleted = await this.prisma.tariff.delete({ where: { id } });

    await this.invalidateCache(id, tariff.type);

    if (adminId) {
      await this.auditService.log({
        userId: adminId,
        action: AuditAction.TARIFF_DELETED,
        entityType: AuditEntityType.Tariff,
        entityId: id,
      });
    }

    return deleted;
  }

  /** Snapshot for audit log — JSON-safe (no Decimal/Date raw). */
  private static tariffToAuditJson(tariff: Tariff): Prisma.InputJsonValue {
    return {
      id: tariff.id,
      name: tariff.name,
      type: tariff.type,
      price: tariff.price,
      amount: tariff.amount.toString(),
      days: tariff.days,
      description: tariff.description,
      features: tariff.features as Prisma.InputJsonValue,
      isActive: tariff.isActive,
      sortOrder: tariff.sortOrder,
      createdAt: tariff.createdAt.toISOString(),
      updatedAt: tariff.updatedAt.toISOString(),
    } satisfies Prisma.InputJsonValue;
  }

  private async invalidateCache(id: string, oldType: string, newType?: string) {
    await this.cache.del(this.cache.keys.tariffById(id));
    await this.cache.del(this.cache.keys.tariffByType(oldType));
    if (newType) await this.cache.del(this.cache.keys.tariffByType(newType));
    await this.cache.invalidate(this.cache.patterns.tariffsAll());
  }
}
