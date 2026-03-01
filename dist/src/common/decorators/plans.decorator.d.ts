import { TariffType } from '@prisma/client';
export declare const PLANS_KEY = "plans";
export declare const Plans: (...plans: TariffType[]) => import("@nestjs/common").CustomDecorator<string>;
