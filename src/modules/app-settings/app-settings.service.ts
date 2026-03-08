import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';

const KEY_REFERRALS_ENABLED = 'referrals_enabled';
const KEY_DIGEST_ANNOUNCEMENT = 'digest_announcement';

@Injectable()
export class AppSettingsService {
  private readonly logger = new Logger(AppSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async isReferralsEnabled(): Promise<boolean> {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: KEY_REFERRALS_ENABLED },
    });
    return row?.value === 'true';
  }

  async setReferralsEnabled(enabled: boolean): Promise<boolean> {
    const value = enabled ? 'true' : 'false';
    await this.prisma.appSetting.upsert({
      where: { key: KEY_REFERRALS_ENABLED },
      create: { key: KEY_REFERRALS_ENABLED, value },
      update: { value },
    });
    this.logger.log(`Referrals program ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
  }

  async getDigestAnnouncement(): Promise<string> {
    const row = await this.prisma.appSetting.findUnique({
      where: { key: KEY_DIGEST_ANNOUNCEMENT },
    });
    return row?.value ?? '';
  }

  async setDigestAnnouncement(value: string): Promise<string> {
    const trimmed = (value ?? '').trim();
    await this.prisma.appSetting.upsert({
      where: { key: KEY_DIGEST_ANNOUNCEMENT },
      create: { key: KEY_DIGEST_ANNOUNCEMENT, value: trimmed },
      update: { value: trimmed },
    });
    return trimmed;
  }
}
