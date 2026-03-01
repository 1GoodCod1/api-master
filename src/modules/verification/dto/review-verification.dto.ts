import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum VerificationDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewVerificationDto {
  @ApiProperty({
    enum: VerificationDecision,
    example: VerificationDecision.APPROVE,
  })
  @IsEnum(VerificationDecision)
  decision: VerificationDecision;

  @ApiProperty({
    example: 'Reason for rejection if applicable',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
