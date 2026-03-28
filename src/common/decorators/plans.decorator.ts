import { SetMetadata } from '@nestjs/common';
import type { TariffType } from '../constants';

/** Ключ метаданных для `@Plans()`. */
export const PLANS_KEY = 'plans';

/** Ограничение по типу тарифа (плану). */
export const Plans = (...plans: TariffType[]) => SetMetadata(PLANS_KEY, plans);
