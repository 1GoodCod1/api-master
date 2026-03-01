import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ReportAction {
  BAN_CLIENT = 'BAN_CLIENT',
  BAN_MASTER = 'BAN_MASTER',
  BAN_IP = 'BAN_IP',
  WARNING_CLIENT = 'WARNING_CLIENT',
  WARNING_MASTER = 'WARNING_MASTER',
  NO_ACTION = 'NO_ACTION',
}

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  @IsNotEmpty()
  status: ReportStatus;

  @ApiProperty({ enum: ReportAction, required: false })
  @IsEnum(ReportAction)
  @IsOptional()
  action?: ReportAction;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
