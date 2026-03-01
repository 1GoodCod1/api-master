import { OnModuleInit } from '@nestjs/common';
import { CacheService } from '../shared/cache/cache.service';
import { MastersService } from '../masters/masters.service';
import { CategoriesService } from '../categories/categories.service';
import { CitiesService } from '../cities/cities.service';
import { TariffsService } from '../tariffs/tariffs.service';
export declare class CacheWarmingService implements OnModuleInit {
    private readonly cache;
    private readonly mastersService;
    private readonly categoriesService;
    private readonly citiesService;
    private readonly tariffsService;
    private readonly logger;
    constructor(cache: CacheService, mastersService: MastersService, categoriesService: CategoriesService, citiesService: CitiesService, tariffsService: TariffsService);
    onModuleInit(): void;
    private warmCriticalCache;
    warmCache(): Promise<void>;
    private warmPopularMasters;
    private warmNewMasters;
    private warmSearchFilters;
    private warmCategoriesAndCities;
    private warmTariffs;
    private warmTopMasters;
    warmCacheManual(): Promise<void>;
    private warmLandingStats;
}
