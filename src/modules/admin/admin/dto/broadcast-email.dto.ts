import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export const BROADCAST_SEGMENTS = [
  'all_masters',
  'new_masters',
  'all_clients',
  'digest_subscribers',
] as const;

export type BroadcastSegmentDto = (typeof BROADCAST_SEGMENTS)[number];

export class BroadcastEmailDto {
  @ApiProperty({
    description: 'Target segment',
    enum: BROADCAST_SEGMENTS,
  })
  @IsEnum(BROADCAST_SEGMENTS)
  segment!: BroadcastSegmentDto;

  @ApiProperty({
    description: 'Template name (e.g. new-feature-masters)',
    example: 'new-feature-masters',
  })
  @IsString()
  templateName!: string;

  @ApiPropertyOptional({
    description:
      'For new_masters: ISO date - only masters registered after this date. Default: 30 days ago.',
    example: '2025-02-01',
  })
  @IsOptional()
  @IsString()
  sinceDate?: string;
}
