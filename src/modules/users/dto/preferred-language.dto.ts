import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { APP_LOCALES, type AppLocale } from '../../../common/constants';

export class PreferredLanguageDto {
  @ApiProperty({ enum: [...APP_LOCALES], example: 'ro' })
  @IsIn([...APP_LOCALES])
  lang!: AppLocale;
}
