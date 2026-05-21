import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyServicePriceType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

export class CreateCompanyServiceDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  title: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description?: string;

  @ApiProperty({
    enum: CompanyServicePriceType,
    default: CompanyServicePriceType.NEGOTIABLE,
  })
  @IsEnum(CompanyServicePriceType)
  priceType: CompanyServicePriceType;

  @ApiPropertyOptional()
  @ValidateIf(
    (dto: CreateCompanyServiceDto) =>
      dto.priceType === CompanyServicePriceType.FIXED,
  )
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ default: 'MDL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateCompanyServiceDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  title?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description?: string;

  @ApiPropertyOptional({ enum: CompanyServicePriceType })
  @IsOptional()
  @IsEnum(CompanyServicePriceType)
  priceType?: CompanyServicePriceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}
