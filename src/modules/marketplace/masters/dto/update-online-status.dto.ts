import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOnlineStatusDto {
  @ApiProperty({
    description: 'Master online status',
    example: true,
  })
  @IsBoolean()
  isOnline: boolean;
}
