import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuickReplyItemDto {
  @ApiProperty({ description: 'Quick reply text', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  text: string;

  @ApiProperty({
    required: false,
    description: 'Order in the list',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateQuickRepliesDto {
  @ApiProperty({ type: [QuickReplyItemDto], description: 'Full ordered list' })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => QuickReplyItemDto)
  items: QuickReplyItemDto[];
}
