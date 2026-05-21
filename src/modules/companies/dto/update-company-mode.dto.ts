import { ApiProperty } from '@nestjs/swagger';
import { CompanyMode } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCompanyModeDto {
  @ApiProperty({ enum: CompanyMode })
  @IsEnum(CompanyMode)
  mode: CompanyMode;
}
