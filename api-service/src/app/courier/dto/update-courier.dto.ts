import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OperationalStatus } from '@prisma/client';

export class UpdateCourierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  driverLicenseUrl?: string;

  @IsOptional()
  @IsString()
  vehicleImageUrl?: string;

  @IsOptional()
  @IsString()
  idCardUrl?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsEnum(OperationalStatus)
  operationalStatus?: OperationalStatus;
}
