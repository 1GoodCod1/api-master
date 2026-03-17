import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeToAvailabilityDto {
  @ApiProperty({ description: 'Master ID to subscribe to' })
  @IsString()
  @IsNotEmpty()
  masterId: string;
}
