import { Injectable } from '@nestjs/common';
import { AvailabilityStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

/**
 * Централизованный сервис для управления доступностью мастеров и счётчиками лидов.
 */
@Injectable()
export class MastersAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Увеличить счётчик активных лидов и перевести в BUSY если лимит достигнут.
   */
  async incrementActiveLeads(masterId: string) {
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
  }

  /**
   * Уменьшить счётчик активных лидов и перевести в AVAILABLE если место освободилось.
   */
  async decrementActiveLeads(masterId: string) {
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
  }

  /**
   * Синхронизировать статус доступности на основе текущих активных лидов.
   * Полезно при ручных изменениях лимитов или удалении данных.
   */
  async syncAvailabilityStatus(masterId: string) {
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
  }
}
