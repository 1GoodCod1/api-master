import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class CreatePortfolioItemDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'File ID for "before" photo' })
  @IsString()
  @IsNotEmpty()
  beforeFileId: string;

  @ApiProperty({ description: 'File ID for "after" photo' })
  @IsString()
  @IsNotEmpty()
  afterFileId: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serviceTags?: string[];
}

export class UpdatePortfolioItemDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serviceTags?: string[];

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class ReorderPortfolioDto {
  @ApiProperty({
    type: [String],
    description: 'Ordered array of portfolio item IDs',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}
