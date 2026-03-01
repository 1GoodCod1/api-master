import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum IdeaStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IMPLEMENTED = 'IMPLEMENTED',
}

export class UpdateIdeaStatusDto {
  @IsEnum(IdeaStatus)
  status: IdeaStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Заметка админа не должна превышать 500 символов',
  })
  adminNote?: string;
}
