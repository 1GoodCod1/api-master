import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SetMasterAvatarDto {
  @ApiProperty({
    example: 'b3f2f0ad-8c7d-4c2a-b1a0-4b33e5e0c3e1',
    description: 'File ID (UUID) to set as master avatar',
  })
  @IsString()
  @IsUUID()
  fileId: string;
}
