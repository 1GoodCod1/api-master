import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TariffType } from '../../../../common/constants';
import { SORT_DESC } from '../../../../common/constants';

export class SearchMastersDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cityId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ enum: TariffType, required: false })
  @IsEnum(TariffType)
  @IsOptional()
  tariffType?: TariffType;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  isFeatured?: boolean;

  @ApiProperty({ required: false, minimum: 0, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @ApiProperty({
    required: false,
    description: 'Minimum price from services JSON',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiProperty({
    required: false,
    description: 'Maximum price from services JSON',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiProperty({
    required: false,
    description:
      'Filter masters who are currently available (isOnline + AVAILABLE status)',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  availableNow?: boolean;

  @ApiProperty({
    required: false,
    description: 'Filter masters who have an active promotion',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  hasPromotion?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    required: false,
    description:
      'Cursor-based pagination offset (number of items to skip). If provided, overrides page.',
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  cursor?: number;

  @ApiProperty({ required: false, default: 20, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiProperty({
    required: false,
    enum: ['rating', 'createdAt', 'price'],
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'rating';

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = SORT_DESC;
}
