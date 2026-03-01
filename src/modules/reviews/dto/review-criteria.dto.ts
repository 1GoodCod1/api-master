import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class ReviewCriteriaDto {
  @ApiProperty({
    description: 'Criteria name',
    enum: ['quality', 'speed', 'price', 'politeness'],
    example: 'quality',
  })
  @IsString()
  @IsNotEmpty()
  criteria: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}
