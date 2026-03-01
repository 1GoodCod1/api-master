import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { IntersectionType, PartialType } from '@nestjs/swagger';
import { CreateMasterDto } from './create-master.dto';

class TelegramChatIdDto {
  @ApiProperty({
    required: false,
    description: 'Telegram chat_id для уведомлений о заявках',
  })
  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/, {
    message: 'telegramChatId must be a numeric string (e.g. from @userinfobot)',
  })
  telegramChatId?: string;
}

class WhatsappPhoneDto {
  @ApiProperty({
    required: false,
    description: 'WhatsApp номер в международном формате (e.g. +37369123456)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'whatsappPhone must be international format (e.g. +37369123456)',
  })
  whatsappPhone?: string;
}

export class UpdateMasterDto extends IntersectionType(
  IntersectionType(PartialType(CreateMasterDto), TelegramChatIdDto),
  WhatsappPhoneDto,
) {}
