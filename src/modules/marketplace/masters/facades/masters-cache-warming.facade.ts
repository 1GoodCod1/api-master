import { Injectable } from '@nestjs/common';
import { MastersListingService } from '../services/masters-listing.service';
import { MastersSearchService } from '../services/masters-search.service';
import { MastersLandingStatsService } from '../services/masters-landing-stats.service';
import type { SearchMastersDto } from '../dto/search-masters.dto';

/**
 * Публичный контракт модуля мастеров для предзагрузки кеша.
 */
@Injectable()
export class MastersCacheWarmingFacade {
  constructor(
    private readonly listingService: MastersListingService,
    private readonly searchService: MastersSearchService,
    private readonly landingStatsService: MastersLandingStatsService,
  ) {}

  getPopularMasters(limit: number) {
    return this.listingService.getPopularMasters(limit);
  }

  getNewMasters(limit: number) {
    return this.listingService.getNewMasters(limit);
  }

  getSearchFilters() {
    return this.listingService.getSearchFilters();
  }

  findAllForSearch(dto: SearchMastersDto) {
    return this.searchService.findAll(dto);
  }

  getLandingStats() {
    return this.landingStatsService.getLandingStats();
  }
}
