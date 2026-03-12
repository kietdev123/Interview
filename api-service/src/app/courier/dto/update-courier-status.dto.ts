import { IsEnum } from 'class-validator';
import { CourierOnlineStatus } from '@prisma/client';

export class UpdateCourierStatusDto {
  @IsEnum(CourierOnlineStatus)
  onlineStatus: CourierOnlineStatus;
}
