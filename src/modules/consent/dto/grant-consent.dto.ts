import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConsentType {
  VERIFICATION_DATA_PROCESSING = 'VERIFICATION_DATA_PROCESSING',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  MARKETING = 'MARKETING',
}

export class GrantConsentDto {
  @ApiProperty({
    enum: ConsentType,
    example: ConsentType.VERIFICATION_DATA_PROCESSING,
    description: 'Type of consent being granted',
  })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiProperty({
    example: '1.0',
    description: 'Version of the policy at the time of consent',
    required: false,
  })
  @IsString()
  @IsOptional()
  version?: string;
}
