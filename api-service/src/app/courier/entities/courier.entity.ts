import { Exclude } from 'class-transformer';

export class CourierEntity {
  id: number;
  userId: number;
  name: string | null;
  phone: string | null;
  taxCode: string | null;
  driverLicenseUrl: string | null;
  vehicleImageUrl: string | null;
  idCardUrl: string | null;
  vehicleType: string | null;
  approvalStatus: string;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  operationalStatus: string;
  statusChangedAt: Date | null;
  statusReason: string | null;
  createdAt: Date;
  updatedAt: Date | null;

  @Exclude()
  approvedBy: number | null;

  @Exclude()
  rejectedBy: number | null;

  @Exclude()
  statusChangedBy: number | null;

  constructor(partial: Partial<CourierEntity>) {
    Object.assign(this, partial);
  }
}
