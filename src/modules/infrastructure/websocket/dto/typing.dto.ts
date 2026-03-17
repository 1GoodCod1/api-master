import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

export class WsTypingDto {
  @ApiProperty()
  @IsString()
  masterId: string;

  @ApiProperty()
  @IsBoolean()
  isTyping: boolean;
}
