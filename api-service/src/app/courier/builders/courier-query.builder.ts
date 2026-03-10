import { QueryBuilder } from '../../common/builders/query.builder';

export class CourierQueryBuilder extends QueryBuilder<Record<string, unknown>> {
  withApprovalStatus(status?: string): this {
    if (status) {
      this.where.approvalStatus = status;
    }
    return this;
  }

  withOperationalStatus(status?: string): this {
    if (status) {
      this.where.operationalStatus = status;
    }
    return this;
  }

  withSearch(search?: string): this {
    if (search) {
      this.where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { taxCode: { contains: search, mode: 'insensitive' } },
        { vehicleType: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this;
  }
}
