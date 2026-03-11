import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CourierService,
  Courier,
  CourierApiResponse,
  CourierListResponse,
  mapCourierApprovalStatusToUI,
  mapCourierOperationalStatusToUI,
  AdminCreateCourierRequest,
  UpdateCourierRequest,
  TranslatePipe,
  SelectOption,
} from '@vhandelivery/shared-ui';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DataTableComponent,
  TableCellDirective,
  MobileCardDirective,
  ActionMenuDirective,
} from '../../../shared/components/data-table/data-table.component';
import {
  TablePagination,
  TablePageEvent,
  TableSortEvent,
  TableHeaderSearchEvent,
  TableHeaderFilterEvent,
  TableHeaderActionEvent,
} from '../../../shared/interfaces/table.interface';
import {
  COURIERS_TABLE_CONFIG,
  COURIERS_TABLE_HEADER_CONFIG,
} from './couriers.config';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { GlobalModalService } from '../../../shared/components/global-modal/global-modal.service';
import {
  SlideOverPanelComponent,
  SlideOverConfig,
} from '../../../shared/components/slide-over-panel/slide-over-panel.component';
import { CourierFormComponent } from './components/courier-form/courier-form.component';

@Component({
  selector: 'app-couriers',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    DataTableComponent,
    TableCellDirective,
    MobileCardDirective,
    ActionMenuDirective,
    CustomSelectComponent,
    SlideOverPanelComponent,
    CourierFormComponent,
  ],
  templateUrl: './couriers.component.html',
  styleUrl: './couriers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouriersComponent implements OnInit {
  private readonly courierService = inject(CourierService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(GlobalModalService);

  readonly isLoading = signal(false);
  readonly couriers = signal<Courier[]>([]);
  readonly tableConfig = COURIERS_TABLE_CONFIG;
  readonly tableHeaderConfig = COURIERS_TABLE_HEADER_CONFIG;

  readonly pagination = signal<TablePagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    pageSizeOptions: [10, 20, 50],
  });

  readonly statusFilter = signal<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('');

  readonly statusOptions: SelectOption[] = [
    { value: '', label: 'common.status.all' },
    { value: 'PENDING', label: 'common.status.pending' },
    { value: 'APPROVED', label: 'common.status.approved' },
    { value: 'REJECTED', label: 'common.status.rejected' },
  ];

  readonly rejectModalOpen = signal(false);
  readonly rejectReason = signal('');
  readonly rejectTarget = signal<Courier | null>(null);

  readonly formPanelOpen = signal(false);
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly formLoading = signal(false);
  readonly formInitialData = signal<Partial<CourierApiResponse> | null>(null);
  readonly editingCourierId = signal<number | null>(null);

  readonly formPanelConfig: SlideOverConfig = {
    titleKey: 'admin.users.couriers.form.panelTitle',
    width: 'lg',
    showCloseButton: true,
    showBackdrop: true,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    showHeader: true,
    headerIcon: 'assets/icons/icon-store.svg',
  };

  ngOnInit(): void {
    this.loadCouriers();
  }

  private loadCouriers(): void {
    this.isLoading.set(true);
    const { page, pageSize } = this.pagination();
    const approvalStatus = this.statusFilter() || undefined;

    this.courierService
      .findAll({
        page,
        limit: pageSize,
        approvalStatus,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: CourierListResponse) => {
          const mapped = response.data.map((item: CourierApiResponse) =>
            this.mapCourierToUI(item)
          );
          this.couriers.set(mapped);
          this.pagination.update((prev) => ({ ...prev, total: response.total }));
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          console.error('Failed to load couriers:', error);
          this.isLoading.set(false);
          this.modalService.showError(
            'common.status.error',
            'admin.users.couriers.toast.loadError'
          );
        },
      });
  }

  private mapCourierToUI(item: CourierApiResponse): Courier {
    return {
      id: String(item.id),
      userId: item.userId,
      name: item.name ?? '-',
      phone: item.phone ?? '-',
      taxCode: item.taxCode,
      driverLicenseUrl: item.driverLicenseUrl,
      vehicleImageUrl: item.vehicleImageUrl,
      idCardUrl: item.idCardUrl,
      vehicleType: item.vehicleType,
      approvalStatus: mapCourierApprovalStatusToUI(item.approvalStatus),
      operationalStatus: mapCourierOperationalStatusToUI(item.operationalStatus),
      rejectionReason: item.rejectionReason,
      createdAt: new Date(item.createdAt).toISOString(),
    };
  }

  onPageChange(event: TablePageEvent): void {
    this.pagination.update((prev) => ({ ...prev, page: event.page }));
    this.loadCouriers();
  }

  onSortChange(_event: TableSortEvent): void {
    // Sorting not implemented in backend yet
  }

  onHeaderSearch(_event: TableHeaderSearchEvent): void {
    // header search disabled for this page (avoid duplicated search UI)
  }

  onHeaderFilter(_event: TableHeaderFilterEvent): void {
    // header filters disabled for this page
  }

  onHeaderAction(event: TableHeaderActionEvent): void {
    if (event.actionId === 'add') {
      this.openCreatePanel();
    }
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value as 'PENDING' | 'APPROVED' | 'REJECTED' | '');
  }

  applySearch(): void {
    this.pagination.update((prev) => ({ ...prev, page: 1 }));
    this.loadCouriers();
  }

  openRejectModal(courier: Courier): void {
    this.rejectReason.set('');
    this.rejectTarget.set(courier);
    this.rejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.rejectModalOpen.set(false);
  }

  confirmReject(): void {
    const target = this.rejectTarget();
    if (!target) return;
    const reason = this.rejectReason().trim();
    if (!reason) {
      this.modalService.showError(
        'common.status.error',
        'admin.users.couriers.reject.placeholder'
      );
      return;
    }

    this.modalService.showConfirmation(
      'admin.users.couriers.reject.confirmTitle',
      'admin.users.couriers.reject.confirmMessage',
      () => {
        this.rejectModalOpen.set(false);
        this.optimisticUpdate(target.id, 'rejected');

        this.courierService
          .reject(Number(target.id), reason)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.modalService.showSuccess(
                'common.status.success',
                'admin.users.couriers.toast.rejected'
              );
            },
            error: (error: unknown) => {
              console.error('Reject failed:', error);
              this.loadCouriers();
              this.modalService.showError(
                'common.status.error',
                'admin.users.couriers.toast.rejectError'
              );
            },
          });
      }
    );
  }

  approveCourier(courier: Courier): void {
    this.modalService.showConfirmation(
      'admin.users.couriers.approve.confirmTitle',
      'admin.users.couriers.approve.confirmMessage',
      () => {
        this.optimisticUpdate(courier.id, 'approved');

        this.courierService
          .approve(Number(courier.id))
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.modalService.showSuccess(
                'common.status.success',
                'admin.users.couriers.toast.approved'
              );
            },
            error: (error: unknown) => {
              console.error('Approve failed:', error);
              this.loadCouriers();
              this.modalService.showError(
                'common.status.error',
                'admin.users.couriers.toast.approveError'
              );
            },
          });
      }
    );
  }

  private optimisticUpdate(id: string, status: 'approved' | 'rejected'): void {
    const current = this.couriers();
    const updated = current.map((courier) =>
      courier.id === id
        ? {
            ...courier,
            approvalStatus: status,
          }
        : courier
    );
    const filtered =
      this.statusFilter() === 'PENDING'
        ? updated.filter((item) => item.id !== id)
        : updated;
    this.couriers.set(filtered);
  }

  openCreatePanel(): void {
    this.formMode.set('create');
    this.formInitialData.set(null);
    this.editingCourierId.set(null);
    this.formPanelOpen.set(true);
  }

  openEditPanel(courier: Courier): void {
    const id = Number(courier.id);
    if (!id) return;
    this.formMode.set('edit');
    this.formInitialData.set(null);
    this.editingCourierId.set(id);
    this.formPanelOpen.set(true);
    this.formLoading.set(true);

    this.courierService
      .findById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.formInitialData.set(response);
          this.formLoading.set(false);
        },
        error: (error: unknown) => {
          console.error('Failed to load courier:', error);
          this.formLoading.set(false);
          this.formPanelOpen.set(false);
          this.modalService.showError(
            'common.status.error',
            'admin.users.couriers.toast.loadDetailError'
          );
        },
      });
  }

  closeFormPanel(): void {
    this.formPanelOpen.set(false);
    this.formLoading.set(false);
  }

  onFormSubmit(payload: AdminCreateCourierRequest | UpdateCourierRequest): void {
    if (this.formLoading()) return;
    this.formLoading.set(true);

    if (this.formMode() === 'create') {
      this.courierService
        .adminCreate(payload as AdminCreateCourierRequest)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.formLoading.set(false);
            this.formPanelOpen.set(false);
            this.modalService.showSuccess(
              'common.status.success',
              'admin.users.couriers.toast.created'
            );
            this.loadCouriers();
          },
          error: (error: unknown) => {
            console.error('Create courier failed:', error);
            this.formLoading.set(false);
            this.modalService.showError(
              'common.status.error',
              'admin.users.couriers.toast.createError'
            );
          },
        });
      return;
    }

    const id = this.editingCourierId();
    if (!id) {
      this.formLoading.set(false);
      return;
    }

    this.courierService
      .update(id, payload as UpdateCourierRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.formLoading.set(false);
          this.formPanelOpen.set(false);
          this.modalService.showSuccess(
            'common.status.success',
            'admin.users.couriers.toast.updated'
          );
          this.loadCouriers();
        },
        error: (error: unknown) => {
          console.error('Update courier failed:', error);
          this.formLoading.set(false);
          this.modalService.showError(
            'common.status.error',
            'admin.users.couriers.toast.updateError'
          );
        },
      });
  }

  confirmDelete(courier: Courier): void {
    this.modalService.showConfirmation(
      'admin.users.couriers.delete.title',
      'admin.users.couriers.delete.message',
      () => this.deleteCourier(courier)
    );
  }

  private deleteCourier(courier: Courier): void {
    const id = Number(courier.id);
    if (!id) return;
    this.courierService
      .remove(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.modalService.showSuccess(
            'common.status.success',
            'admin.users.couriers.toast.deleted'
          );
          this.loadCouriers();
        },
        error: (error: unknown) => {
          console.error('Delete courier failed:', error);
          this.modalService.showError(
            'common.status.error',
            'admin.users.couriers.toast.deleteError'
          );
        },
      });
  }
}
