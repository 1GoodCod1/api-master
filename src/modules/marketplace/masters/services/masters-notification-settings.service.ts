import { Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { LeadNotifyChannel } from '../../../../common/constants';
import { isVipOrPremiumTariff } from '../../../../common/constants';
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
    if (!master)
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);
    return {
      ...master,
      leadNotifyChannel: master.leadNotifyChannel
        ? master.leadNotifyChannel.toLowerCase()
        : null,
    };
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    const master = await this.prisma.master.findUnique({
      where: { userId },
      select: { id: true, tariffType: true },
    });
    if (!master)
      throw AppErrors.notFound(AppErrorMessages.MASTER_PROFILE_NOT_FOUND);

    const isPremium = isVipOrPremiumTariff(master.tariffType);
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

    const updated = await this.prisma.master.update({
      where: { userId },
      data,
      select: {
        telegramChatId: true,
        whatsappPhone: true,
        leadNotifyChannel: true,
        notifyTariffSms: true,
        notifyTariffInApp: true,
      },
    });
    return {
      ...updated,
      leadNotifyChannel: updated.leadNotifyChannel
        ? updated.leadNotifyChannel.toLowerCase()
        : null,
    };
  }
}
