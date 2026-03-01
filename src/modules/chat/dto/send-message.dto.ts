import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Array of file IDs to attach' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}

export class SendMessageWsDto extends SendMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;
}
