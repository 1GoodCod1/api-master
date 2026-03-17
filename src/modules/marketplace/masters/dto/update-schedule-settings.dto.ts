import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScheduleSettingsDto {
  @ApiPropertyOptional({
    description: 'Work day start hour (0-23)',
    example: 9,
    minimum: 0,
    maximum: 23,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  workStartHour?: number;

  @ApiPropertyOptional({
    description: 'Work day end hour (1-24)',
    example: 18,
    minimum: 1,
    maximum: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  workEndHour?: number;

  @ApiPropertyOptional({
    description: 'Slot duration in minutes (15, 30, 45, 60, 90, 120)',
    example: 60,
    minimum: 15,
    maximum: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  slotDurationMinutes?: number;
}
