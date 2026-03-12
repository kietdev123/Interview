import { IsEnum } from 'class-validator';
import { CourierApprovalStatus } from '@prisma/client';

export class ApproveCourierDto {
  @IsEnum(CourierApprovalStatus)
  approvalStatus: CourierApprovalStatus;
}
