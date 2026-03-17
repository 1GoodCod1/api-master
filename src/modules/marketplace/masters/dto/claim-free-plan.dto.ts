import { IsIn } from 'class-validator';

export class ClaimFreePlanDto {
  @IsIn(['VIP', 'PREMIUM'])
  tariffType: 'VIP' | 'PREMIUM';
}
