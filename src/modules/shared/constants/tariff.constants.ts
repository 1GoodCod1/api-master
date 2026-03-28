import {
  SUBSCRIPTION_TARIFF_TYPES,
  TariffType,
} from '../../../common/constants';

/** VIP или PREMIUM — платные тарифы с датой окончания подписки. */
export function isVipOrPremiumTariff(
  tariffType: TariffType | null | undefined,
): boolean {
  return tariffType != null && SUBSCRIPTION_TARIFF_TYPES.includes(tariffType);
}

export function isPremiumTariff(
  tariffType: TariffType | null | undefined,
): boolean {
  return tariffType === TariffType.PREMIUM;
}
