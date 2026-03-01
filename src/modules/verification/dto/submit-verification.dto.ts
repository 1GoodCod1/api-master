import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitVerificationDto {
  @ApiProperty({
    example: 'PASSPORT',
    description: 'Тип документа (PASSPORT, ID_CARD, etc.)',
  })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiProperty({ example: '123456789', description: 'Номер документа' })
  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @ApiProperty({
    example: 'file-uuid-here',
    description: 'ID файла лицевой стороны документа',
  })
  @IsString()
  @IsNotEmpty()
  documentFrontId: string;

  @ApiProperty({
    example: 'file-uuid-here',
    description: 'ID файла обратной стороны документа',
    required: false,
  })
  @IsString()
  @IsOptional()
  documentBackId?: string;

  @ApiProperty({
    example: 'file-uuid-here',
    description: 'ID файла selfie с документом',
    required: false,
  })
  @IsString()
  @IsOptional()
  selfieId?: string;

  @ApiProperty({
    example: '+37360123456',
    description: 'Номер телефона для верификации',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
