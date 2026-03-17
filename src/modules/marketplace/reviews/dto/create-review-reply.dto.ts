import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewReplyDto {
  @ApiProperty({ description: 'Reply content (max 1000 chars)' })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  content: string;
}
