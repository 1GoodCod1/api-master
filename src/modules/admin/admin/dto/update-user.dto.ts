import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { UserRole } from '../../../../common/constants';

export class AdminUpdateUserDto {
  @ApiProperty({ required: false, description: 'Mark user as verified' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({ required: false, description: 'Ban or unban user' })
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;

  @ApiProperty({ required: false, enum: UserRole, description: 'Override user role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
