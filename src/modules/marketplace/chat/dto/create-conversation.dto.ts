import { IsString, IsUUID, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Lead ID to create conversation for',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  leadId?: string;

  @ApiProperty({
    description: 'Master user ID for job-based conversation',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  masterUserId?: string;

  @ValidateIf((o: CreateConversationDto) => !o.leadId && !o.masterUserId)
  @IsString({ message: 'Either leadId or masterUserId must be provided' })
  _requireOne?: never;
}
