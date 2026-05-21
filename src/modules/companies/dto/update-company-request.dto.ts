import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

export class UpdateCompanyRequestDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  title?: string;

  @ApiPropertyOptional({ maxLength: 3000 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description?: string;

  @ApiPropertyOptional({ enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional()
  @ValidateIf(
    (dto: UpdateCompanyRequestDto) => dto.type === JobType.FIXED_PRICE,
  )
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdateCompanyRequestDto) => dto.type === JobType.HOURLY)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  hourlyRate?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  minJoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  photoFileIds?: string[];
}
