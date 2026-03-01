import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit verification code from SMS',
  })
  @IsString()
  @IsNotEmpty({ message: 'Code is required' })
  @Matches(/^\d+$/, { message: 'Code must contain only digits' })
  @MaxLength(10)
  code: string;
}
