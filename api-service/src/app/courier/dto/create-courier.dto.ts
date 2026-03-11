import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCourierDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  phone!: string;

  @IsNotEmpty()
  @IsString()
  verificationToken!: string;

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
}
