import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AvailabilityStatus } from '@prisma/client';
import { LeadStatus } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TariffType } from '../../../../common/constants';
import { getEffectiveTariff } from '../../../../common/helpers/plans';
import type { UpdateAvailabilityStatusDto } from '../dto/update-availability-status.dto';

export type InvalidateMasterCacheFn = (
  masterId: string,
  slug?: string | null,
) => Promise<void>;

/**
 * Централизованный сервис для управления доступностью мастеров и счётчиками лидов.
 */
@Injectable()
export class MastersAvailabilityService {
  private readonly logger = new Logger(MastersAvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Увеличить счётчик активных лидов и перевести в BUSY если лимит достигнут.
   */
  async incrementActiveLeads(masterId: string) {
    try {
      const master = await this.prisma.master.update({
        where: { id: masterId },
        data: {
          leadsReceivedToday: { increment: 1 },
          currentActiveLeads: { increment: 1 },
        },
        select: {
          id: true,
          currentActiveLeads: true,
          maxActiveLeads: true,
          availabilityStatus: true,
        },
      });

      if (
        master.currentActiveLeads >= master.maxActiveLeads &&
        master.availabilityStatus === AvailabilityStatus.AVAILABLE
      ) {
        await this.prisma.master.update({
          where: { id: masterId },
          data: { availabilityStatus: AvailabilityStatus.BUSY },
        });
      }

      return master;
    } catch (err) {
      this.logger.error('incrementActiveLeads failed', err);
      throw err;
    }
  }

  /**
   * Уменьшить счётчик активных лидов и перевести в AVAILABLE если место освободилось.
   */
  async decrementActiveLeads(masterId: string) {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        select: {
          id: true,
          currentActiveLeads: true,
          maxActiveLeads: true,
          availabilityStatus: true,
        },
      });

      if (!master || master.currentActiveLeads <= 0) return master;

      const updatedMaster = await this.prisma.master.update({
        where: { id: masterId },
        data: {
          currentActiveLeads: { decrement: 1 },
        },
        select: {
          id: true,
          currentActiveLeads: true,
          maxActiveLeads: true,
          availabilityStatus: true,
        },
      });

      // Если был занят и место освободилось — делаем доступным
      if (
        updatedMaster.availabilityStatus === AvailabilityStatus.BUSY &&
        updatedMaster.currentActiveLeads < updatedMaster.maxActiveLeads
      ) {
        await this.prisma.master.update({
          where: { id: masterId },
          data: { availabilityStatus: AvailabilityStatus.AVAILABLE },
        });
        return {
          ...updatedMaster,
          availabilityStatus: AvailabilityStatus.AVAILABLE,
        };
      }

      return updatedMaster;
    } catch (err) {
      this.logger.error('decrementActiveLeads failed', err);
      throw err;
    }
  }

  /**
   * Синхронизировать статус доступности на основе текущих активных лидов.
   * Полезно при ручных изменениях лимитов или удалении данных.
   */
  async syncAvailabilityStatus(masterId: string) {
    try {
      const master = await this.prisma.master.findUnique({
        where: { id: masterId },
        select: {
          id: true,
          currentActiveLeads: true,
          maxActiveLeads: true,
          availabilityStatus: true,
        },
      });

      if (!master) return;

      let newStatus: AvailabilityStatus = master.availabilityStatus;

      if (master.currentActiveLeads >= master.maxActiveLeads) {
        if (master.availabilityStatus === AvailabilityStatus.AVAILABLE) {
          newStatus = AvailabilityStatus.BUSY;
        }
      } else {
        if (master.availabilityStatus === AvailabilityStatus.BUSY) {
          newStatus = AvailabilityStatus.AVAILABLE;
        }
      }

      if (newStatus !== master.availabilityStatus) {
        await this.prisma.master.update({
          where: { id: masterId },
          data: { availabilityStatus: newStatus },
        });
      }
    } catch (err) {
      this.logger.error('syncAvailabilityStatus failed', err);
      throw err;
    }
  }

  /**
   * Обновить онлайн-статус мастера.
   */
  async updateOnlineStatus(
    userId: string,
    isOnline: boolean,
    onInvalidate?: InvalidateMasterCacheFn,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const updated = await this.prisma.master.update({
      where: { id: master.id },
      data: {
        isOnline,
        lastActivityAt: new Date(),
      },
      select: {
        id: true,
        isOnline: true,
        lastActivityAt: true,
      },
    });

    if (onInvalidate) {
      await onInvalidate(master.id, master.slug);
    }

    return {
      success: true,
      isOnline: updated.isOnline,
      lastActivityAt: updated.lastActivityAt,
    };
  }

  /**
   * Обновить статус доступности (AVAILABLE/BUSY/OFFLINE) и лимит активных лидов.
   */
  async updateAvailabilityStatus(
    userId: string,
    dto: UpdateAvailabilityStatusDto,
    onInvalidate?: InvalidateMasterCacheFn,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: {
        id: true,
        slug: true,
        availabilityStatus: true,
        tariffType: true,
        tariffExpiresAt: true,
      },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const isPremium = getEffectiveTariff(master) === TariffType.PREMIUM;
    if (!isPremium) {
      throw new ForbiddenException(
        'Availability status (Available/Busy) and max leads limit are PREMIUM features.',
      );
    }

    const updateData: {
      availabilityStatus: UpdateAvailabilityStatusDto['availabilityStatus'];
      lastActivityAt: Date;
      maxActiveLeads?: number;
    } = {
      availabilityStatus: dto.availabilityStatus,
      lastActivityAt: new Date(),
    };

    if (dto.maxActiveLeads !== undefined) {
      updateData.maxActiveLeads = dto.maxActiveLeads;
    }

    const needsNotification =
      dto.availabilityStatus === 'AVAILABLE' &&
      master.availabilityStatus !== 'AVAILABLE';

    const updated = await this.prisma.master.update({
      where: { id: master.id },
      data: updateData,
      select: {
        id: true,
        availabilityStatus: true,
        maxActiveLeads: true,
        currentActiveLeads: true,
        lastActivityAt: true,
      },
    });

    if (onInvalidate) {
      await onInvalidate(master.id, master.slug);
    }

    if (needsNotification) {
      this.eventEmitter.emit('master.available', { masterId: master.id });
    }

    return {
      success: true,
      ...updated,
    };
  }

  /**
   * Получить статус доступности мастера.
   */
  async getAvailabilityStatus(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const data = await this.prisma.master.findUnique({
      where: { id: master.id },
      select: {
        availabilityStatus: true,
        maxActiveLeads: true,
        currentActiveLeads: true,
        isOnline: true,
        lastActivityAt: true,
      },
    });

    if (!data) {
      throw new NotFoundException('Master availability data not found');
    }

    const actualActiveCount = await this.prisma.lead.count({
      where: {
        masterId: master.id,
        status: { in: [LeadStatus.NEW, LeadStatus.IN_PROGRESS] },
      },
    });

    let result = { ...data };
    if (actualActiveCount !== data.currentActiveLeads) {
      this.logger.warn(
        `Syncing currentActiveLeads for master ${master.id}: stored=${data.currentActiveLeads} actual=${actualActiveCount}`,
      );
      await this.prisma.master.update({
        where: { id: master.id },
        data: { currentActiveLeads: actualActiveCount },
      });
      await this.syncAvailabilityStatus(master.id);
      const updated = await this.prisma.master.findUnique({
        where: { id: master.id },
        select: {
          availabilityStatus: true,
          maxActiveLeads: true,
          currentActiveLeads: true,
          isOnline: true,
          lastActivityAt: true,
        },
      });
      if (updated) result = updated;
    }

    return {
      success: true,
      ...result,
      canAcceptLeads:
        result.availabilityStatus === 'AVAILABLE' &&
        result.currentActiveLeads < result.maxActiveLeads,
    };
  }

  /**
   * Обновить время последней активности мастера.
   */
  async updateLastActivity(userId: string) {
    try {
      const master = await this.prisma.master.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (master) {
        await this.prisma.master.update({
          where: { id: master.id },
          data: { lastActivityAt: new Date() },
        });
      }
    } catch {
      // Игнорируем ошибки обновления активности
    }
  }
}
