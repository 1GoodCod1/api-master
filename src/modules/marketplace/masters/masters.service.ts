import { Injectable, Logger } from '@nestjs/common';

/**
 * Центральный координатор мастеров. Делегирует вызовы специализированным сервисам.
 * @see MastersSearchService — поиск (findAll)
 * @see MastersSuggestService — автодополнение
 * @see MastersListingService — листинг главной (popular, new, filters)
 * @see MastersProfileService — профили
 * @see MastersPhotosService — фото
 * @see MastersStatsService — статистика
 * @see MastersAvailabilityService — онлайн/доступность
 * @see MastersTariffService — тарифы
 */
@Injectable()
export class MastersService {
  private readonly logger = new Logger(MastersService.name);

  constructor() {}
}
