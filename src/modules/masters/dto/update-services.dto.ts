import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MasterServiceDto } from './create-master.dto';

export class UpdateMasterServicesDto {
  @ApiProperty({
    type: [MasterServiceDto],
    description: 'List of master services',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterServiceDto)
  services!: MasterServiceDto[];
}
