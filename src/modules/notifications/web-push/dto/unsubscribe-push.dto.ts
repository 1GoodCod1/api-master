import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UnsubscribePushDto {
  @ApiProperty({ description: 'Push subscription endpoint URL to unsubscribe' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
