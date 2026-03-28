import { TariffType } from '@prisma/client';

/** VIP или PREMIUM — платные тарифы с датой окончания подписки. */
export function isVipOrPremiumTariff(
  tariffType: TariffType | null | undefined,
): boolean {
  return tariffType === TariffType.VIP || tariffType === TariffType.PREMIUM;
}

export function isPremiumTariff(
  tariffType: TariffType | null | undefined,
): boolean {
  return tariffType === TariffType.PREMIUM;
}
