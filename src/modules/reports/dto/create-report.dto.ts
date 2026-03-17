import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  masterId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  leadId?: string;

  @ApiProperty({ example: 'Fraud', description: 'Reason for report' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'Detailed description of the issue' })
  @IsString()
  @MaxLength(300)
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    required: false,
    description: 'Evidence (file IDs, screenshots, etc.)',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  evidence?: string[];
}
