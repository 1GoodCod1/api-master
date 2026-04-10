import { Injectable } from '@nestjs/common';
import { MastersAvailabilityService } from '../services/masters-availability.service';

/**
 * Публичный контракт модуля мастеров для сценариев лидов и бронирований.
 */
@Injectable()
export class MastersAvailabilityFacade {
  constructor(
    private readonly availabilityService: MastersAvailabilityService,
  ) {}

  incrementActiveLeads(masterId: string) {
    return this.availabilityService.incrementActiveLeads(masterId);
  }

  decrementActiveLeads(masterId: string) {
    return this.availabilityService.decrementActiveLeads(masterId);
  }
}
