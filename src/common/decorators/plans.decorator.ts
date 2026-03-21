import { SetMetadata } from '@nestjs/common';
import type { TariffType } from '@prisma/client';

export const PLANS_KEY = 'plans';
export const Plans = (...plans: TariffType[]) => SetMetadata(PLANS_KEY, plans);
