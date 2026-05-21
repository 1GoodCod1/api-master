import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CompanyMode } from '@prisma/client';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

const sanitize = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? sanitizeStrict(value) : (value as string);

export class CreateCompanyDto {
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @Transform(sanitize)
  name: string;

  @ApiProperty({ maxLength: 240 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  @Transform(sanitize)
  legalName: string;

  @ApiProperty({ description: 'Moldovan fiscal IDNO, 13 digits' })
  @IsString()
  @Matches(/^\d{13}$/)
  idno: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(sanitize)
  legalAddress: string;

  @ApiProperty({ enum: CompanyMode, default: CompanyMode.PROVIDER })
  @IsEnum(CompanyMode)
  @IsOptional()
  mode?: CompanyMode;

  @ApiProperty({ default: false })
  @IsBoolean()
  isTvaPayer: boolean;

  @ApiProperty({ required: false, maxLength: 64 })
  @ValidateIf((dto: CreateCompanyDto) => dto.isTvaPayer)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(sanitize)
  tvaCode?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(sanitize)
  contactPhone?: string;

  @ApiProperty({ required: false, maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  @Transform(sanitize)
  contactEmail?: string;
}
