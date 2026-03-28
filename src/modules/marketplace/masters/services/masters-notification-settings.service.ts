import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadNotifyChannel } from '../../../../common/constants';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { UpdateNotificationSettingsDto } from '../dto/update-notification-settings.dto';

@Injectable()
export class MastersNotificationSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificationSettings(userId: string) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: {
        telegramChatId: true,
        whatsappPhone: true,
        leadNotifyChannel: true,
        notifyTariffSms: true,
        notifyTariffInApp: true,
      },
    });
    if (!master) throw new NotFoundException('Master profile not found');
    return master;
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, tariffType: true },
    });
    if (!master) throw new NotFoundException('Master profile not found');

    const isPremium =
      master.tariffType === 'VIP' || master.tariffType === 'PREMIUM';
    const data: {
      telegramChatId?: string | null;
      whatsappPhone?: string | null;
      leadNotifyChannel?: LeadNotifyChannel | null;
      notifyTariffSms?: boolean;
      notifyTariffInApp?: boolean;
    } = {};

    if (isPremium) {
      if (dto.telegramChatId !== undefined)
        data.telegramChatId = dto.telegramChatId;
      if (dto.whatsappPhone !== undefined)
        data.whatsappPhone = dto.whatsappPhone;
      if (dto.leadNotifyChannel !== undefined) {
        data.leadNotifyChannel = dto.leadNotifyChannel
          ? (dto.leadNotifyChannel.toUpperCase() as LeadNotifyChannel)
          : null;
      }
    }
    if (dto.notifyTariffSms !== undefined)
      data.notifyTariffSms = dto.notifyTariffSms;
    if (dto.notifyTariffInApp !== undefined)
      data.notifyTariffInApp = dto.notifyTariffInApp;

    return this.prisma.master.update({
      where: { userId },
      data,
    });
  }
}
