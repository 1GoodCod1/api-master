import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { SanitizedString } from '../../../../common/dto/sanitized-string.dto';

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

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
