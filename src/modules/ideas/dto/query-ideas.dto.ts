import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum IdeaStatusFilter {
  ALL = 'ALL',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IMPLEMENTED = 'IMPLEMENTED',
}

export enum IdeaSortBy {
  VOTES = 'VOTES',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
}

export class QueryIdeasDto {
  @IsOptional()
  @IsEnum(IdeaStatusFilter)
  status?: IdeaStatusFilter = IdeaStatusFilter.ALL;

  @IsOptional()
  @IsEnum(IdeaSortBy)
  sortBy?: IdeaSortBy = IdeaSortBy.VOTES;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
