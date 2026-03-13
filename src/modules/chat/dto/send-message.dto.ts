import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: 2000 })
  @IsString()
  @ValidateIf((o: SendMessageDto) => !o.fileIds?.length)
  @IsNotEmpty({ message: 'content should not be empty' })
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
