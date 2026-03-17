import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityStatus } from '@prisma/client';

const AVAILABILITY_STATUS_VALUES = ['AVAILABLE', 'BUSY', 'OFFLINE'] as const;

const availabilityStatusApiOptions: Parameters<typeof ApiProperty>[0] = {
  description: 'Availability status',
  enum: [...AVAILABILITY_STATUS_VALUES],
  example: 'AVAILABLE',
};

export class UpdateAvailabilityStatusDto {
  @ApiProperty(availabilityStatusApiOptions)
  @IsEnum(AvailabilityStatus)
  availabilityStatus: AvailabilityStatus;

  @ApiPropertyOptional({
    description: 'Maximum active leads allowed (1-50)',
    example: 5,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxActiveLeads?: number;
}
