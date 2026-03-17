import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ReviewStatus })
  @IsEnum(ReviewStatus)
  @IsNotEmpty()
  status: ReviewStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  moderationReason?: string;
}
