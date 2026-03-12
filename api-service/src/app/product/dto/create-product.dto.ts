import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type, Transform, plainToInstance } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class LocalizedStringDto {
  @IsString()
  @IsNotEmpty()
  vi: string;

  @IsString()
  @IsOptional()
  en?: string;

  @IsString()
  @IsOptional()
  ko?: string;
}

export class ProductMetadataDto {
  @IsOptional()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  thumbnail?: string;
}

export class CreateProductDto {
  @IsNotEmpty()
  @ValidateNested()
  @Transform(({ value }) => {
    let parsed;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
        if (typeof parsed === 'string') {
          parsed = { vi: parsed };
        }
      } catch {
        parsed = { vi: value };
      }
    } else {
      parsed = value;
    }
    return plainToInstance(LocalizedStringDto, parsed);
  })
  @Type(() => LocalizedStringDto)
  name: LocalizedStringDto;

  @IsOptional()
  @ValidateNested()
  @Transform(({ value }) => {
    if (!value) return undefined;
    let parsed;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
        if (typeof parsed === 'string') {
          parsed = { vi: parsed };
        }
      } catch {
        parsed = { vi: value };
      }
    } else {
      parsed = value;
    }
    return plainToInstance(LocalizedStringDto, parsed);
  })
  @Type(() => LocalizedStringDto)
  description?: LocalizedStringDto;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  price: number;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  stock: number;

  @IsString()
  @IsOptional()
  merchantId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductMetadataDto)
  metadata?: ProductMetadataDto;
}
