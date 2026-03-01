import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Refresh token (optional when sent via httpOnly cookie)',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
