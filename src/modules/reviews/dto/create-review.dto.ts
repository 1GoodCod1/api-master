import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  Matches,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReviewCriteriaDto } from './review-criteria.dto';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  masterId: string;

  @ApiProperty({ description: 'ID of the closed lead this review is for' })
  @IsString()
  @IsNotEmpty()
  leadId: string;

  @ApiProperty({
    example: '+37360000000',
    required: false,
    description: 'Optional for authenticated CLIENT (uses user.phone)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^(\+373|0)\d{8}$/)
  clientPhone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string | undefined =>
    typeof value === 'string' ? sanitizeStrict(value) : undefined,
  )
  clientName?: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ required: false, maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  @Transform(({ value }: { value: unknown }): string | undefined =>
    typeof value === 'string' ? sanitizeStrict(value) : undefined,
  )
  comment?: string;

  @ApiProperty({
    required: false,
    description: 'Detailed criteria ratings',
    type: [ReviewCriteriaDto],
    example: [
      { criteria: 'quality', rating: 5 },
      { criteria: 'speed', rating: 4 },
      { criteria: 'price', rating: 3 },
      { criteria: 'politeness', rating: 5 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewCriteriaDto)
  criteria?: ReviewCriteriaDto[];

  @ApiProperty({
    required: false,
    description: 'Photo file IDs for review (max 5)',
    type: [String],
    maxItems: 5,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  fileIds?: string[];
}
