import { IsString, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatTypingDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Whether user is typing' })
  @IsBoolean()
  isTyping: boolean;
}
