import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'ValidTimeRange', async: false })
export class ValidTimeRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as { startTime?: string; endTime?: string };
    const start = obj.startTime ? new Date(obj.startTime).getTime() : 0;
    const end = obj.endTime ? new Date(obj.endTime).getTime() : 0;
    return end > start;
  }

  defaultMessage() {
    return 'startTime must be before endTime';
  }
}

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  masterId: string;

  @ApiProperty({ example: '2024-01-20T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2024-01-20T11:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  @Validate(ValidTimeRangeConstraint)
  endTime: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    required: false,
    description:
      'Link booking to a lead (client: own lead; master: any lead of this master)',
  })
  @IsString()
  @IsOptional()
  leadId?: string;
}
