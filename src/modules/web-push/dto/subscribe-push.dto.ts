import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SubscribePushDto {
    @ApiProperty({ description: 'Push subscription endpoint URL' })
    @IsString()
    @IsNotEmpty()
    endpoint: string;

    @ApiProperty({ description: 'Public key (p256dh) from PushSubscription' })
    @IsString()
    @IsNotEmpty()
    p256dh: string;

    @ApiProperty({ description: 'Auth secret from PushSubscription' })
    @IsString()
    @IsNotEmpty()
    auth: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    userAgent?: string;
}
