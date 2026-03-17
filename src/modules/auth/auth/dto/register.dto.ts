import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsNotEmpty,
  Matches,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { sanitizeStrict } from '../../../shared/utils/sanitize-html.util';

function sanitizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? sanitizeStrict(value) : undefined;
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+37360000000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+373|0)\d{8}$/, {
    message:
      'Phone number must be in Moldovan format (+373XXXXXXXX or 0XXXXXXXX)',
  })
  phone: string;

  @ApiProperty({
    example: 'SecurePass1!',
    description:
      'Минимум 10 символов: заглавная буква, строчная буква, цифра и спецсимвол',
  })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(72)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$/,
    {
      message:
        'Password must contain at least: 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#)',
    },
  )
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.MASTER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ required: false, example: 'John' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => sanitizeOptionalString(value))
  firstName?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => sanitizeOptionalString(value))
  lastName?: string;

  @ApiProperty({ required: false, example: 'Кишинев' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false, example: 'Ремонт техники' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, maxLength: 300 })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  @Transform(({ value }) => sanitizeOptionalString(value))
  description?: string;

  @ApiProperty({ required: false, example: 'JOHN1234' })
  @IsString()
  @IsOptional()
  referralCode?: string;
}
