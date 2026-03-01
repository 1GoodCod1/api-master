import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

export class TypingDto {
  @ApiProperty()
  @IsString()
  masterId: string;

  @ApiProperty()
  @IsBoolean()
  isTyping: boolean;
}
