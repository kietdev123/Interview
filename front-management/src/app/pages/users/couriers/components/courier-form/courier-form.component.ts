import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminCreateCourierRequest,
  CourierApiResponse,
  CourierOperationalStatus,
  TranslatePipe,
  UpdateCourierRequest,
} from '@vhandelivery/shared-ui';

interface CourierFormStatusOption {
  value: CourierOperationalStatus;
  labelKey: string;
}

@Component({
  selector: 'app-courier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './courier-form.component.html',
  styleUrl: './courier-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourierFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = input<'create' | 'edit'>('create');
  readonly initialData = input<Partial<CourierApiResponse> | null>(null);
  readonly isLoading = input<boolean>(false);

  readonly submitForm = output<AdminCreateCourierRequest | UpdateCourierRequest>();
  readonly cancel = output<void>();

  readonly isFormInvalid = signal(true);

  readonly operationalStatusOptions: CourierFormStatusOption[] = [
    { value: 'ACTIVE', labelKey: 'common.status.active' },
    { value: 'INACTIVE', labelKey: 'common.status.inactive' },
    { value: 'SUSPENDED', labelKey: 'common.status.suspended' },
    { value: 'LOCKED', labelKey: 'common.status.locked' },
  ];

  readonly form: FormGroup = this.fb.group({
    userId: ['', [Validators.required, Validators.min(1)]],
    name: [''],
    phone: [''],
    taxCode: [''],
    vehicleType: [''],
    operationalStatus: ['ACTIVE', [Validators.required]],
  });

  constructor() {
    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isFormInvalid.set(this.form.invalid));

    effect(() => {
      const mode = this.mode();
      const userIdControl = this.form.get('userId');
      if (!userIdControl) return;
      if (mode === 'create') {
        userIdControl.setValidators([Validators.required, Validators.min(1)]);
        userIdControl.enable({ emitEvent: false });
      } else {
        userIdControl.clearValidators();
        userIdControl.disable({ emitEvent: false });
      }
      userIdControl.updateValueAndValidity({ emitEvent: false });
    });

    effect(() => {
      const data = this.initialData();
      if (!data) {
        this.form.reset({ operationalStatus: 'ACTIVE' }, { emitEvent: false });
        return;
      }
      this.form.patchValue(
        {
          userId: data.userId ?? '',
          name: data.name ?? '',
          phone: data.phone ?? '',
          taxCode: data.taxCode ?? '',
          vehicleType: data.vehicleType ?? '',
          operationalStatus: data.operationalStatus ?? 'ACTIVE',
        },
        { emitEvent: false }
      );
    });
  }

  private sanitize(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (this.mode() === 'create') {
      const payload: AdminCreateCourierRequest = {
        userId: Number(raw.userId),
        name: this.sanitize(raw.name),
        phone: this.sanitize(raw.phone),
        taxCode: this.sanitize(raw.taxCode),
        vehicleType: this.sanitize(raw.vehicleType),
        operationalStatus: raw.operationalStatus,
      };
      this.submitForm.emit(payload);
      return;
    }

    const payload: UpdateCourierRequest = {
      name: this.sanitize(raw.name),
      phone: this.sanitize(raw.phone),
      taxCode: this.sanitize(raw.taxCode),
      vehicleType: this.sanitize(raw.vehicleType),
      operationalStatus: raw.operationalStatus,
    };
    this.submitForm.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
