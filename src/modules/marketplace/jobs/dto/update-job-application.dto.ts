import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { sanitizeStrict } from '../../../shared/utils/sanitize-html.util';
import { MilestoneDto } from './create-job-application.dto';

export class UpdateJobApplicationDto {
  @ApiProperty({ required: false, maxLength: 3000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description?: string;

  @ApiProperty({
    required: false,
    description: 'Boost: new total joints (must be higher than current)',
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  jointsSpent?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  @Type(() => Number)
  deadline?: number;

  @ApiProperty({ required: false, type: [MilestoneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  @IsOptional()
  milestones?: MilestoneDto[];
}
