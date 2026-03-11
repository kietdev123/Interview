import {
  TableConfig,
  TableHeaderConfig,
} from '../../../shared/interfaces/table.interface';
import { Courier } from '@vhandelivery/shared-ui';

export const COURIERS_TABLE_CONFIG: TableConfig<Courier> = {
  id: 'couriers-table',
  columns: [
    {
      key: 'name',
      labelKey: 'admin.users.couriers.table.name',
      type: 'text',
      width: '220px',
    },
    {
      key: 'phone',
      labelKey: 'admin.users.couriers.table.phone',
      type: 'text',
      width: '160px',
      nowrap: true,
    },
    {
      key: 'createdAt',
      labelKey: 'admin.users.couriers.table.createdAt',
      type: 'date',
      dateFormat: 'dd/MM/yyyy',
      width: '160px',
    },
    {
      key: 'approvalStatus',
      labelKey: 'admin.users.couriers.table.approvalStatus',
      type: 'status',
      statusConfig: {
        pending: { labelKey: 'common.status.pending', variant: 'warning' },
        approved: { labelKey: 'common.status.approved', variant: 'success' },
        rejected: { labelKey: 'common.status.rejected', variant: 'error' },
      },
      width: '160px',
    },
    {
      key: 'operationalStatus',
      labelKey: 'admin.users.couriers.table.operationalStatus',
      type: 'status',
      statusConfig: {
        active: { labelKey: 'common.status.active', variant: 'success' },
        inactive: { labelKey: 'common.status.inactive', variant: 'default' },
        suspended: { labelKey: 'common.status.suspended', variant: 'info' },
        locked: { labelKey: 'common.status.locked', variant: 'error' },
      },
      width: '160px',
    },
    {
      key: 'actions',
      labelKey: 'admin.users.couriers.table.actions',
      type: 'custom',
      templateRef: 'actions',
      width: '360px',
      align: 'center',
    },
  ],
  hoverable: true,
  rowIdKey: 'id',
};

export const COURIERS_TABLE_HEADER_CONFIG: TableHeaderConfig = {
  show: true,
  title: {
    labelKey: 'admin.users.couriers.title',
    showCount: true,
  },
  search: {
    enabled: false,
    placeholderKey: 'admin.users.couriers.searchPlaceholder',
    minWidth: '20rem',
  },
  filters: [],
  actions: [
    {
      id: 'add',
      labelKey: 'admin.users.couriers.actions.add',
      icon: 'assets/icons/icon-plus.svg',
      variant: 'primary',
      showOnDesktop: true,
      showOnMobile: true,
      mobileFlexGrow: true,
    },
  ],
};
