import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type AuditCleanupMode = 'non_consent' | 'groups' | 'actions';

/** Preset groups of audit actions (checkboxes in admin UI). */
export const AUDIT_CLEANUP_GROUP_KEYS = [
  'auth',
  'security',
  'consent',
  'gdpr',
  'verification',
  'admin',
  'payments',
] as const;

export type AuditCleanupGroupKey = (typeof AUDIT_CLEANUP_GROUP_KEYS)[number];

export class AuditCleanupDto {
  @ApiPropertyOptional({
    description: 'If true, only return counts; no rows deleted.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    description:
      'Only delete logs with createdAt strictly before this ISO datetime (recommended).',
  })
  @IsOptional()
  @IsDateString()
  olderThan?: string;

  @ApiPropertyOptional({
    description:
      'Must be true when olderThan is omitted and dryRun is false (dangerous full delete for selected scope).',
  })
  @IsOptional()
  @IsBoolean()
  confirmDeleteWithoutDate?: boolean;

  @ApiProperty({ enum: ['non_consent', 'groups', 'actions'] })
  @IsEnum(['non_consent', 'groups', 'actions'])
  mode!: AuditCleanupMode;

  @ApiPropertyOptional({
    description:
      'When mode=groups: which groups to include (union of their actions).',
    isArray: true,
    enum: AUDIT_CLEANUP_GROUP_KEYS,
  })
  @ValidateIf((o: AuditCleanupDto) => o.mode === 'groups')
  @IsArray()
  @IsString({ each: true })
  groups?: string[];

  @ApiPropertyOptional({
    description:
      'When mode=actions: exact action strings (AuditAction values).',
    isArray: true,
  })
  @ValidateIf((o: AuditCleanupDto) => o.mode === 'actions')
  @IsArray()
  @IsString({ each: true })
  actions?: string[];
}
