import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsEnum,
  ValidateIf,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

export enum MasterServicePriceType {
  FIXED = 'FIXED',
  NEGOTIABLE = 'NEGOTIABLE',
}

export enum MasterServiceCurrency {
  MDL = 'MDL',
  EUR = 'EUR',
  USD = 'USD',
}

export class MasterServiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  title!: string;

  @ApiProperty({ enum: MasterServicePriceType })
  @IsEnum(MasterServicePriceType)
  priceType!: MasterServicePriceType;

  @ApiProperty({ required: false })
  @ValidateIf(
    (o: MasterServiceDto) => o.priceType === MasterServicePriceType.FIXED,
  )
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false, enum: MasterServiceCurrency })
  @ValidateIf(
    (o: MasterServiceDto) => o.priceType === MasterServicePriceType.FIXED,
  )
  @IsIn(Object.values(MasterServiceCurrency))
  currency?: MasterServiceCurrency;
}

export class CreateMasterDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(50)
  @IsOptional()
  experienceYears?: number;

  @ApiProperty({ required: false, type: [MasterServiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterServiceDto)
  services?: MasterServiceDto[];

  @ApiProperty({ required: false, description: 'Latitude for map marker' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false, description: 'Longitude for map marker' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
