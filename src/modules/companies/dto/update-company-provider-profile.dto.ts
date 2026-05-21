import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

export class UpdateCompanyProviderProfileDto {
  @ApiPropertyOptional({ maxLength: 3000 })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  contactPhone?: string;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  logoFileId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coverFileId?: string | null;
}
