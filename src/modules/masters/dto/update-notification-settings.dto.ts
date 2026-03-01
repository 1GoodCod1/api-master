import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, ValidateIf } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiProperty({
    required: false,
    description: 'Telegram chat_id для уведомлений о заявках',
  })
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @Matches(/^-?\d+$/, {
    message: 'telegramChatId must be a numeric string (e.g. from @userinfobot)',
  })
  telegramChatId?: string | null;

  @ApiProperty({
    required: false,
    description: 'WhatsApp номер в международном формате (e.g. +37369123456)',
  })
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'whatsappPhone must be international format (e.g. +37369123456)',
  })
  whatsappPhone?: string | null;
}
