import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { SORT_ASC } from '../../../shared/constants/sort-order.constants';
import type { UpdateQuickRepliesDto } from '../dto/update-quick-replies.dto';
import type { UpdateAutoresponderSettingsDto } from '../dto/update-autoresponder-settings.dto';

export type InvalidateMasterCacheFn = (
  masterId: string,
  slug?: string | null,
) => Promise<void>;

@Injectable()
export class MastersQuickRepliesService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuickReplies(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const items = await this.prisma.quickReply.findMany({
      where: { masterId: master.id },
      orderBy: [{ order: SORT_ASC }, { createdAt: SORT_ASC }],
      select: { id: true, text: true, order: true },
    });

    return { items };
  }

  async replaceQuickReplies(
    userId: string,
    dto: UpdateQuickRepliesDto,
    onInvalidate?: InvalidateMasterCacheFn,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const itemsWithOrder = dto.items.map((it, index) => ({
      text: it.text,
      order: it.order ?? index,
    }));

    await this.prisma.$transaction([
      this.prisma.quickReply.deleteMany({ where: { masterId: master.id } }),
      this.prisma.quickReply.createMany({
        data: itemsWithOrder.map((it) => ({
          masterId: master.id,
          text: it.text,
          order: it.order,
        })),
      }),
    ]);

    const updated = await this.prisma.quickReply.findMany({
      where: { masterId: master.id },
      orderBy: [{ order: SORT_ASC }, { createdAt: SORT_ASC }],
      select: { id: true, text: true, order: true },
    });

    if (onInvalidate) {
      await onInvalidate(master.id, master.slug);
    }

    return { success: true, items: updated };
  }

  async getAutoresponderSettings(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: {
        autoresponderEnabled: true,
        autoresponderMessage: true,
        workStartHour: true,
        workEndHour: true,
      },
    });
    if (!master) throw new NotFoundException('Master profile not found');
    return master;
  }

  async updateAutoresponderSettings(
    userId: string,
    dto: UpdateAutoresponderSettingsDto,
    onInvalidate?: InvalidateMasterCacheFn,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, slug: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const data: {
      autoresponderEnabled?: boolean;
      autoresponderMessage?: string | null;
    } = {};
    if (dto.enabled !== undefined) data.autoresponderEnabled = dto.enabled;
    if (dto.message !== undefined) data.autoresponderMessage = dto.message;

    const updated = await this.prisma.master.update({
      where: { userId },
      data,
      select: { autoresponderEnabled: true, autoresponderMessage: true },
    });

    if (onInvalidate) {
      await onInvalidate(master.id, master.slug);
    }

    return { success: true, ...updated };
  }
}
