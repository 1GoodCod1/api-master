import { TariffType } from '@prisma/client';

/** VIP / PREMIUM — платные тарифы с датой окончания подписки. */
export const SUBSCRIPTION_TARIFF_TYPES: ReadonlyArray<TariffType> = [
  TariffType.VIP,
  TariffType.PREMIUM,
];

/** Подмножество тарифов с подпиской (для типов DTO / claim free plan). */
export type SubscriptionTariffType = (typeof SUBSCRIPTION_TARIFF_TYPES)[number];
