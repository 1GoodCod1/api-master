import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { SanitizedString } from '../../../../common/dto/sanitized-string.dto';

export type CityTranslationPayload = {
  name?: string;
};

export class CreateCityDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @SanitizedString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @SanitizedString()
  slug: string;

  @ApiProperty({
    required: false,
    description: 'Переводы: { ro?: { name }, ru?: { name }, en?: { name } }',
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, CityTranslationPayload>;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
