import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseJointsDto {
  @ApiProperty({
    minimum: 1,
    maximum: 1000,
    description: 'Number of joints to purchase',
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  amount: number;
}
