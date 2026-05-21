import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

const sanitize = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? sanitizeStrict(value) : (value as string);

export class UpdateCompanyLegalDto {
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

  @ApiProperty()
  @IsBoolean()
  isTvaPayer: boolean;

  @ApiProperty({ required: false, maxLength: 64 })
  @ValidateIf((dto: UpdateCompanyLegalDto) => dto.isTvaPayer)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(sanitize)
  tvaCode?: string;

  @ApiProperty({ required: false, maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  @Transform(sanitize)
  billingEmail?: string;

  @ApiProperty({ required: false, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(sanitize)
  billingPhone?: string;

  @ApiProperty({ required: false, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(sanitize)
  bankName?: string;

  @ApiProperty({ required: false, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(sanitize)
  bankAccount?: string;
}
