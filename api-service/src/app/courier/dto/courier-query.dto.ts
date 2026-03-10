import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  COURIER_OPERATIONAL_STATUS,
  COURIER_STATUS,
} from '../../common/constants/courier.constant';

export class CourierQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(COURIER_STATUS)
  approvalStatus?: string;

  @IsOptional()
  @IsEnum(COURIER_OPERATIONAL_STATUS)
  operationalStatus?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export interface CourierListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
