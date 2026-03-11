export interface CourierApiResponse {
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
  approvedAt: string | Date | null;
  rejectedAt: string | Date | null;
  rejectionReason: string | null;
  operationalStatus: string;
  statusChangedAt: string | Date | null;
  statusReason: string | null;
  createdAt: string | Date;
  updatedAt: string | Date | null;
}

export interface CourierListResponse {
  data: CourierApiResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CourierQueryParams {
  page?: number;
  limit?: number;
  approvalStatus?: CourierApprovalStatus;
  operationalStatus?: CourierOperationalStatus;
  search?: string;
}

export interface CourierRejectRequest {
  reason: string;
}

export interface AdminCreateCourierRequest {
  userId: number;
  name?: string;
  phone?: string;
  taxCode?: string;
  driverLicenseUrl?: string;
  vehicleImageUrl?: string;
  idCardUrl?: string;
  vehicleType?: string;
  operationalStatus?: CourierOperationalStatus;
}

export interface UpdateCourierRequest {
  name?: string;
  phone?: string;
  taxCode?: string;
  driverLicenseUrl?: string;
  vehicleImageUrl?: string;
  idCardUrl?: string;
  vehicleType?: string;
  operationalStatus?: CourierOperationalStatus;
}

export type CourierApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type CourierOperationalStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'LOCKED';

export interface Courier {
  [key: string]: unknown;
  id: string;
  name: string;
  phone: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  operationalStatus: 'active' | 'inactive' | 'suspended' | 'locked';
  rejectionReason: string | null;
  createdAt: string;
}

export function mapCourierApprovalStatusToUI(
  status: string
): 'pending' | 'approved' | 'rejected' {
  const statusMap: Record<string, 'pending' | 'approved' | 'rejected'> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  };
  return statusMap[status] ?? 'pending';
}

export function mapCourierOperationalStatusToUI(
  status: string
): 'active' | 'inactive' | 'suspended' | 'locked' {
  const statusMap: Record<
    string,
    'active' | 'inactive' | 'suspended' | 'locked'
  > = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    LOCKED: 'locked',
  };
  return statusMap[status] ?? 'inactive';
}
