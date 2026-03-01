import { TariffType } from '@prisma/client';
export declare class CreateTariffDto {
    name: string;
    type: TariffType;
    price: string;
    amount: number;
    days?: number;
    stripePriceId?: string;
    description?: string;
    features: string[];
    isActive?: boolean;
    sortOrder?: number;
}
