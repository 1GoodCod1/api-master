import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { UpdateScheduleSettingsDto } from '../dto/update-schedule-settings.dto';

export type InvalidateMasterCacheFn = (
  masterId: string,
  slug?: string | null,
) => Promise<void>;

@Injectable()
export class MastersScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async getScheduleSettings(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: {
        workStartHour: true,
        workEndHour: true,
        slotDurationMinutes: true,
      },
    });
    if (!master) throw new NotFoundException('Master profile not found');
    return master;
  }

  async updateScheduleSettings(
    userId: string,
    dto: UpdateScheduleSettingsDto,
    onInvalidate?: InvalidateMasterCacheFn,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, workStartHour: true, workEndHour: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const startHour = dto.workStartHour ?? master.workStartHour;
    const endHour = dto.workEndHour ?? master.workEndHour;

    if (startHour >= endHour) {
      throw new ForbiddenException(
        'Work start hour must be less than work end hour',
      );
    }

    const data: {
      workStartHour?: number;
      workEndHour?: number;
      slotDurationMinutes?: number;
    } = {};
    if (dto.workStartHour !== undefined) data.workStartHour = dto.workStartHour;
    if (dto.workEndHour !== undefined) data.workEndHour = dto.workEndHour;
    if (dto.slotDurationMinutes !== undefined)
      data.slotDurationMinutes = dto.slotDurationMinutes;

    const updated = await this.prisma.master.update({
      where: { userId },
      data,
      select: {
        workStartHour: true,
        workEndHour: true,
        slotDurationMinutes: true,
      },
    });

    if (onInvalidate) {
      await onInvalidate(master.id, master.slug);
    }

    return { success: true, ...updated };
  }
}
