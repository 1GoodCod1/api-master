import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Допустимые action для /track (view/favorite пишет только бэкенд при реальных действиях) */
const ALLOWED_ACTIONS = ['filter', 'search'] as const;

export class TrackActivityDto {
  @ApiPropertyOptional({ enum: ALLOWED_ACTIONS, example: 'filter' })
  @IsIn(ALLOWED_ACTIONS, {
    message: `action must be one of: ${ALLOWED_ACTIONS.join(', ')}`,
  })
  action: (typeof ALLOWED_ACTIONS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  searchQuery?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cityId?: string;
}
