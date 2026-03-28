import { IsIn } from 'class-validator';
import {
  SUBSCRIPTION_TARIFF_TYPES,
  type SubscriptionTariffType,
} from '../../../../common/constants';

export class ClaimFreePlanDto {
  @IsIn([...SUBSCRIPTION_TARIFF_TYPES])
  tariffType: SubscriptionTariffType;
}
