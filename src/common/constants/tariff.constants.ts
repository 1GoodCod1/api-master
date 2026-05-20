import { TariffType } from '@prisma/client';
import { SUBSCRIPTION_TARIFF_TYPES } from './subscription-tariff.constants';

/** PLUS или PRO — платные тарифы с датой окончания подписки. */
export function isPlusOrProTariff(
  tariffType: TariffType | null | undefined,
): boolean {
  return tariffType != null && SUBSCRIPTION_TARIFF_TYPES.includes(tariffType);
}

export function isProTariff(
  tariffType: TariffType | null | undefined,
): boolean {
  return tariffType === TariffType.PRO;
}
