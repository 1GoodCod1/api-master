import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteOAuthDto {
  @ApiPropertyOptional({
    description:
      'Pending OAuth JWT (optional if httpOnly oauth_pending cookie is set after redirect)',
  })
  @IsOptional()
  @IsString()
  pendingToken?: string;

  @ApiProperty({
    description: 'Phone number in Moldovan format (+373XXXXXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+373\d{8}$/, { message: 'Phone must be in format +373XXXXXXXX' })
  phone: string;

  @ApiPropertyOptional({
    description:
      'CLIENT | MASTER — обязателен, если в pending JWT ещё нет роли (вход через Google без ?role=)',
    enum: ['CLIENT', 'MASTER'],
  })
  @IsOptional()
  @IsIn(['CLIENT', 'MASTER'])
  role?: 'CLIENT' | 'MASTER';

  @ApiPropertyOptional({ description: 'City slug (required for MASTER role)' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Category slug (required for MASTER role)',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Master description (optional for MASTER role)',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
