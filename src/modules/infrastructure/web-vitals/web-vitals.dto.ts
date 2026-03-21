import { IsString, IsNumber, IsOptional } from 'class-validator';

export class WebVitalDto {
  @IsString()
  name: string;

  @IsNumber()
  value: number;

  @IsString()
  rating: string;

  @IsNumber()
  delta: number;

  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  navigationType?: string;
}
