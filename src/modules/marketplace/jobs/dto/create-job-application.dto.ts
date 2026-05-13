import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApplicationPaymentType } from '@prisma/client';
import { sanitizeStrict } from '../../../shared/utils/sanitize-html.util';

export class MilestoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  price: number;

  @IsDateString()
  dueDate: string;
}

export class CreateJobApplicationDto {
  @ApiProperty({ minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsPositive()
  @Type(() => Number)
  jointsSpent: number;

  @ApiProperty({
    maxLength: 3000,
    description: 'Why should the client choose you',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeStrict(value) : (value as string),
  )
  description: string;

  @ApiProperty({ enum: ApplicationPaymentType })
  @IsEnum(ApplicationPaymentType)
  paymentType: ApplicationPaymentType;

  @ApiProperty({
    required: false,
    description: 'Days to complete (FULL payment)',
  })
  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  @Type(() => Number)
  deadline?: number;

  @ApiProperty({
    required: false,
    type: [MilestoneDto],
    description: 'Milestones (PARTIAL payment)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  @IsOptional()
  milestones?: MilestoneDto[];

  @ApiProperty({ required: false, type: [String], maxItems: 10 })
  @IsArray()
  @ArrayMaxSize(10)
  @IsOptional()
  photoFileIds?: string[];
}
