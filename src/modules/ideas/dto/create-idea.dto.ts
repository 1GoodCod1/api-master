import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Заголовок должен быть минимум 5 символов' })
  @MaxLength(200, { message: 'Заголовок не должен превышать 200 символов' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'Описание должно быть минимум 20 символов' })
  @MaxLength(300, { message: 'Описание не должно превышать 300 символов' })
  description: string;
}
