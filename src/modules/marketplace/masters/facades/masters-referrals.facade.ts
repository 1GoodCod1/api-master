import { Injectable } from '@nestjs/common';
import { MastersTariffService } from '../services/masters-tariff.service';
import { MastersProfileService } from '../services/masters-profile.service';
import { encodeId } from '../../../shared/utils/id-encoder';

/**
 * Публичный контракт модуля мастеров для реферальных начислений.
 */
@Injectable()
export class MastersReferralsFacade {
  constructor(
    private readonly tariffService: MastersTariffService,
    private readonly profileService: MastersProfileService,
  ) {}

  async extendTariffByDaysForReferralReward(
    masterId: string,
    days: number,
  ): Promise<void> {
    await this.tariffService.extendTariffByDays(masterId, days, (m, s) =>
      this.profileService.invalidateMasterCache(m, s, encodeId(m)),
    );
  }
}
