import { ApiProperty } from '@nestjs/swagger';
import { JobDocumentKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { sanitizeStrict } from '../../../shared/utils/sanitize-html.util';

export class CreateJobDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @ApiProperty({ enum: JobDocumentKind, default: JobDocumentKind.OTHER })
  @IsEnum(JobDocumentKind)
  @IsOptional()
  kind?: JobDocumentKind;

  @ApiProperty({ required: false, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : undefined,
  )
  label?: string;
}
