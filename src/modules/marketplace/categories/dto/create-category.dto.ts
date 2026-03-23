import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';
import { SanitizedString } from '../../../../common/dto/sanitized-string.dto';

/** Локализованные поля категории (хранятся в JSON) */
export type CategoryTranslationPayload = {
  name?: string;
  description?: string;
};

export class CreateCategoryDto {
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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @SanitizedString()
  description?: string;

  @ApiProperty({ required: false, description: 'Emoji или короткий символ' })
  @IsString()
  @IsOptional()
  @SanitizedString()
  icon?: string;

  @ApiProperty({
    required: false,
    description: 'Имя иконки Lucide (PascalCase), напр. Droplets',
  })
  @IsString()
  @IsOptional()
  @SanitizedString()
  iconKey?: string;

  @ApiProperty({ required: false, description: 'URL картинки-иконки' })
  @IsString()
  @IsOptional()
  @SanitizedString()
  iconUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Переводы: { ro?: { name }, ru?: { name }, en?: { name } }',
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, CategoryTranslationPayload>;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number = 0;
}
