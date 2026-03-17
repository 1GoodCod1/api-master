import {
  IsString,
  IsInt,
  IsDateString,
  Min,
  Max,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ description: 'Title of the promotion' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the promotion' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Discount percentage (1-100)' })
  @IsInt()
  @Min(1)
  @Max(100)
  discount: number;

  @ApiProperty({
    required: false,
    description:
      'Apply to specific service (master services[].title). If empty, applies to all services',
  })
  @IsOptional()
  @IsString()
  serviceTitle?: string;

  @ApiProperty({ description: 'Promotion start date' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ description: 'Promotion end date' })
  @IsDateString()
  validUntil: string;

  @ApiProperty({ required: false, description: 'Whether promotion is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
