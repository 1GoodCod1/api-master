import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { SanitizedString } from '../../../../common/dto/sanitized-string.dto';

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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @SanitizedString()
  icon?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number = 0;
}
