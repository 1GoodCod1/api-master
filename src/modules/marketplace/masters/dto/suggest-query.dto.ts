import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max } from 'class-validator';

export class SuggestQueryDto {
  @ApiProperty({ required: true, description: 'Search query for suggestions' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;

  @ApiProperty({ required: false, default: 8, maximum: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number = 8;

  @ApiProperty({
    required: false,
    description: 'City ID or slug to boost local results',
  })
  @IsString()
  @IsOptional()
  cityId?: string;
}
