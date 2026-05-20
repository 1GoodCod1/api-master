import { TariffType } from '@prisma/client';

/** PLUS / PRO — платные тарифы с датой окончания подписки. */
export const SUBSCRIPTION_TARIFF_TYPES: ReadonlyArray<TariffType> = [
  TariffType.PLUS,
  TariffType.PRO,
];

/** Подмножество тарифов с подпиской (для типов DTO / claim free plan). */
export type SubscriptionTariffType = (typeof SUBSCRIPTION_TARIFF_TYPES)[number];
