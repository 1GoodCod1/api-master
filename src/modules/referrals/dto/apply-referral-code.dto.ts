import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ApplyReferralCodeDto {
  @ApiProperty({ description: 'Referral code to apply' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;
}
