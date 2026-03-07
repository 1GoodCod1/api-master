import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeStrict } from '../../shared/utils/sanitize-html.util';

export class CreateLeadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  masterId: string;

  @ApiProperty({
    example: '+37360000000',
    required: false,
    description:
      'Deprecated: client phone is now taken from authenticated client profile',
  })
  @IsString()
  @IsOptional()
  clientPhone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  clientName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  message: string;

  @ApiProperty({ required: false, type: [String], maxItems: 10 })
  @IsArray()
  @ArrayMaxSize(10)
  @IsOptional()
  fileIds?: string[];

  @ApiProperty({
    required: false,
    description: 'Payment session or order ID for premium lead validation',
  })
  @IsString()
  @IsOptional()
  paymentSessionId?: string;

  @ApiProperty({
    required: false,
    description: 'reCAPTCHA token for bot protection',
  })
  @IsString()
  @IsOptional()
  recaptchaToken?: string;
}
