import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SetUserAvatarDto {
  @ApiProperty({
    description:
      'File ID to set as avatar. Send empty string or omit to remove avatar.',
    required: false,
    example: 'uuid-of-file',
    default: '',
  })
  @IsString()
  @IsOptional()
  fileId?: string;
}
