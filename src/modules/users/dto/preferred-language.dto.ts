import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class PreferredLanguageDto {
  @ApiProperty({ enum: ['en', 'ru', 'ro'], example: 'ro' })
  @IsIn(['en', 'ru', 'ro'])
  lang!: 'en' | 'ru' | 'ro';
}
