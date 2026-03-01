import { SetMetadata } from '@nestjs/common';
import { TariffType } from '@prisma/client';

export const PLANS_KEY = 'plans';
export const Plans = (...plans: TariffType[]) => SetMetadata(PLANS_KEY, plans);
