import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConsentType } from '@prisma/client';

export { ConsentType };

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
