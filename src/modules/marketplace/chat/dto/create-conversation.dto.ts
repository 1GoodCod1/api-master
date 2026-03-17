import { IsString, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'Lead ID to create conversation for' })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  leadId: string;
}
