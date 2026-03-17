import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class NotificationDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';
}
