import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { TariffType } from '../../../../common/constants';

export class AdminUpdateMasterDto {
  @ApiProperty({
    required: false,
    description: 'Pin master to featured section',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({
    required: false,
    enum: TariffType,
    description: 'Override master tariff plan',
  })
  @IsOptional()
  @IsEnum(TariffType)
  tariffType?: TariffType;
}
