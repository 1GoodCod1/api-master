import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { TariffType } from '@prisma/client';

export class AdminUpdateMasterDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ required: false, enum: TariffType })
  @IsEnum(TariffType)
  @IsOptional()
  tariffType?: TariffType;
}
