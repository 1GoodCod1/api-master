import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { JobType } from '@prisma/client';
import { sanitizeStrict } from '../../../shared/utils/sanitize-html.util';

export class CreateJobDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  title: string;

  @ApiProperty({ maxLength: 3000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  type: JobType;

  @ApiProperty({
    required: false,
    description: 'Budget in MDL for fixed price jobs',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  budget?: number;

  @ApiProperty({ required: false, description: 'Hourly rate in MDL' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  hourlyRate?: number;

  @ApiProperty({
    minimum: 1,
    maximum: 500,
    description: 'Minimum joints required to apply',
  })
  @IsNumber()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  minJoints: number;

  @ApiProperty({ required: false, description: 'City ID (optional location)' })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiProperty({ required: false, type: [String], maxItems: 10 })
  @IsArray()
  @ArrayMaxSize(10)
  @IsOptional()
  photoFileIds?: string[];
}
