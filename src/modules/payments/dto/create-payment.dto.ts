import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { TariffType } from '../../../common/constants';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  masterId: string;

  @ApiProperty({ enum: TariffType })
  @IsEnum(TariffType)
  @IsNotEmpty()
  tariffType: TariffType;
}
