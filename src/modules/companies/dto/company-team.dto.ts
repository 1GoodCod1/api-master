import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyRole } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const INVITABLE_ROLES = [CompanyRole.MANAGER, CompanyRole.MEMBER] as const;

export class InviteCompanyMemberDto {
  @ApiProperty({ maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ enum: INVITABLE_ROLES, default: CompanyRole.MEMBER })
  @IsIn(INVITABLE_ROLES)
  role: (typeof INVITABLE_ROLES)[number];
}

export class UpdateCompanyMemberDto {
  @ApiPropertyOptional({ enum: INVITABLE_ROLES })
  @IsOptional()
  @IsIn(INVITABLE_ROLES)
  role?: (typeof INVITABLE_ROLES)[number];
}

export class AcceptCompanyInvitationTokenDto {
  @ApiProperty()
  @IsString()
  token: string;
}
