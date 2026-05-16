import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { JobStatus, JobType } from '@prisma/client';

export class QueryJobsDto {
  @ApiProperty({ required: false, enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiProperty({ required: false, enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiProperty({ required: false, description: 'Filter by city ID' })
  @IsOptional()
  cityId?: string;

  @ApiProperty({
    required: false,
    description: 'Recommended jobs for master (matches city + any city jobs)',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recommended?: boolean;

  @ApiProperty({
    required: false,
    description:
      'Client only: return only jobs owned by the current user (dashboard view). Default is false — clients see all open jobs on the public marketplace.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  mine?: boolean;

  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({
    required: false,
    description: 'Search by title or description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiProperty({
    required: false,
    enum: ['recent', 'best'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sort?: 'recent' | 'best';
}
