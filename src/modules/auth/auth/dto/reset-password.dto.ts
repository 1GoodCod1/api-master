import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-here' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewSecure1',
    description: '8–72 символа, минимум 1 буква и 1 цифра',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[\x20-\x7E]+$/, {
    message: 'Password must contain at least one letter and one digit',
  })
  password: string;
}
